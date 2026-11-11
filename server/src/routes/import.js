/**
 * POST /api/records/import
 * Bulk-import ratepayer records from a CSV or Excel file.
 * Creates draft records (latitude/longitude = NULL) so collectors can visit
 * each property, capture GPS coordinates, and submit for review.
 *
 * Access: admin, supervisor only.
 */
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

// Multer: accept CSV and Excel files in memory (no disk write needed, up to 30 MB)
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

// Middleware to safely catch any multer / multipart stream errors and return clean JSON
const safeUpload = (req, res, next) => {
  importUpload.single('file')(req, res, (err) => {
    if (err) {
      console.error('File upload stream error:', err);
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    next();
  });
};

// ---------------------------------------------------------------------------
// Column name normaliser — strips whitespace, lowercases, collapses spaces
// ---------------------------------------------------------------------------
function normalise(str) {
  return String(str ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Parse the uploaded file into an array of plain row objects
// Uses XLSX library which seamlessly parses CSV, XLSX, and XLS with full
// quoting, UTF-8, and multi-line cell support.
// ---------------------------------------------------------------------------
async function parseFile(buffer, originalname) {
  // 1. Try XLSX parser first (handles CSV, XLSX, XLS with full character encoding)
  try {
    const XLSX = (await import('xlsx')).default || (await import('xlsx'));
    const wb = XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: true });
    if (wb && wb.SheetNames && wb.SheetNames.length > 0) {
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
      if (rows && rows.length > 0) {
        return rows;
      }
    }
  } catch (xlsxErr) {
    console.warn('XLSX parser fallback to raw text CSV:', xlsxErr.message);
  }

  // 2. Fallback to raw text CSV parser (stripping UTF-8 BOM if present)
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  return csvToObjects(text);
}

// ---------------------------------------------------------------------------
// Minimal RFC-4180 CSV parser → array of objects keyed by header row
// ---------------------------------------------------------------------------
function csvToObjects(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]);
  const objects = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvRow(line);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ?? '';
    });
    objects.push(obj);
  }
  return objects;
}

function parseCsvRow(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// ---------------------------------------------------------------------------
// Phone number cleaner: handles Ghanaian numbers with or without leading zero
// e.g. "244451982" -> "0244451982", "233244451982" -> "0244451982"
// ---------------------------------------------------------------------------
function cleanPhoneNumber(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return null;
  if (digits.length === 9) {
    digits = '0' + digits;
  } else if (digits.length === 12 && digits.startsWith('233')) {
    digits = '0' + digits.slice(3);
  }
  return digits;
}

// ---------------------------------------------------------------------------
// Ratepayer & GSMA Billing Ledger → DCS record field mapping
// ---------------------------------------------------------------------------
function mapRow(row, zonesByName) {
  // Helper: find raw value by any matching header variant
  const get = (...keys) => {
    for (const k of keys) {
      const nk = normalise(k);
      for (const rk of Object.keys(row)) {
        if (normalise(rk) === nk) {
          const v = String(row[rk] ?? '').trim();
          if (v) return v;
        }
      }
    }
    return '';
  };

  // 1. Ratepayer / Owner Name
  const firstName = get('Firstname', 'First Name', 'First_Name');
  const lastName  = get('Lastname', 'Last Name', 'Last_Name', 'Surname');
  const ownerName = [firstName, lastName].filter(Boolean).join(' ') || get('Ratepayer', 'Owner Name', 'Owner', 'Company');

  // 2. Phone Number (cleaned with leading 0)
  const rawPhone   = get('Contact phonenumber', 'Phonenumber', 'Phone', 'Phone Number', 'Contact', 'Mobile');
  const ownerPhone = cleanPhoneNumber(rawPhone);

  // 3. Geocoordinates
  const latRaw  = get('Latitude', 'lat');
  const lngRaw  = get('Longitude', 'lng', 'long', 'Lon');
  const latitude  = latRaw  ? parseFloat(latRaw)  : null;
  const longitude = lngRaw  ? parseFloat(lngRaw)  : null;

  // Validate GPS if provided
  if (latitude  != null && (isNaN(latitude)  || latitude  < -90  || latitude  > 90))  return null;
  if (longitude != null && (isNaN(longitude) || longitude < -180 || longitude > 180)) return null;

  // 4. Locality & Address
  const rawLocation = get('Location', 'Ghana Post Code', 'GhanaPost');
  const ghanaPostAddress = get('Ghana Post Code', 'GhanaPost') || (rawLocation && /^GS[-\d]+/i.test(rawLocation) ? rawLocation : null);

  // 5. Zone lookup: first try explicit Zone, then infer from Location / Collection Area
  let zoneId = null;
  const zoneName = get('Zone', 'Zone Name');
  if (zoneName && zonesByName[normalise(zoneName)]) {
    zoneId = zonesByName[normalise(zoneName)];
  } else {
    // In File 2, Zone is often empty while Location has the suburb (e.g. AMANFRO, GALILEA, TUBA)
    const loc = normalise(get('Location', 'Collection Area', 'Sub Collection Area'));
    if (loc) {
      for (const [zName, zId] of Object.entries(zonesByName)) {
        if (zName.includes(loc) || loc.includes(zName)) {
          zoneId = zId;
          break;
        }
      }
      // Common locality heuristics
      if (!zoneId) {
        if (loc.includes('amanfro') || loc.includes('amanfrom')) {
          zoneId = Object.entries(zonesByName).find(([k]) => k.includes('amanfro'))?.[1] || null;
        } else if (loc.includes('galilea') || loc.includes('iron city')) {
          zoneId = Object.entries(zonesByName).find(([k]) => k.includes('galilea'))?.[1] || null;
        } else if (loc.includes('kasoa')) {
          zoneId = Object.entries(zonesByName).find(([k]) => k.includes('kasoa'))?.[1] || null;
        } else if (loc.includes('kokrobite') || loc.includes('langma') || loc.includes('oshiyie')) {
          zoneId = Object.entries(zonesByName).find(([k]) => k.includes('kokrobite'))?.[1] || null;
        }
      }
    }
  }

  // 6. Business Classification Mapping
  // User Rule: Map 'Service(s) Provided' -> service_provided, and map the rest accordingly
  const servicesProvided = get('Service(s) Provided', 'Services Provided', 'Services');
  // 'Description' in File 2 is the broad sector (e.g. Pharmaceutical Companies, Service / Filling Stations) -> business_category
  const businessCategory = get('Business Category', 'Category') || get('Description');
  // 'Long Description' in File 2 is the tariff item scale (e.g. CAT D - Retail Pharmacy (Large)) -> business_type
  const rawBusinessType  = get('Business Type');
  const longDescription  = get('Long Description');
  const businessType     = (rawBusinessType && rawBusinessType.length > 3 ? rawBusinessType : null) || longDescription || rawBusinessType;

  // Module detection: if any business field is present -> business, else -> property
  const recordModule = (servicesProvided || businessCategory || businessType || get('Bill Number')) ? 'business' : 'property';

  // 7. Build complete attributes (cleanly namespaced)
  const attributes = {
    // Property / address
    property_address:    get('Property Address', 'Address', 'Billing street') || rawLocation || undefined,
    street_name:         get('Street Name', 'Street', 'Billing street') || undefined,
    locality:            get('Location') || undefined,
    landmark:            get('Landmark') || undefined,
    collection_area:     get('Collection Area') || undefined,
    sub_collection_area: get('Sub Collection Area', 'Sub-Collection Area') || undefined,
    upn:                 get('UPN', 'Unique Property Number') || undefined,
    valuation_number:    get('Valuation Number', 'Valuation No') || undefined,
    use_code:            get('Use Code') || undefined,
    // Business Classification
    business_type:       businessType || undefined,
    business_category:   businessCategory || undefined,
    services_provided:   servicesProvided || undefined,
    // Municipal Ledger & Bill Cross-References
    bill_number:         get('Bill Number', 'Bill No') || undefined,
    bill_id:             get('Bill ID') || undefined,
    client_id:           get('Client ID') || undefined,
    revenue_officer:     get('Revenue Officer') || undefined,
    legacy_created_by:   get('Created By') || undefined,
    // Financial Information (Reference for future billing)
    item_rate:           get('Item Rate') || undefined,
    sub_total:           get('Sub Total') || undefined,
    arrears:             get('Arrears') || undefined,
    discount:            get('Discount') || undefined,
    total_amount_payable:get('Total Amount Payable') || undefined,
    amount_paid:         get('Amount Paid') || undefined,
    outstanding_amount:  get('Outstanding Amount') || undefined,
    payment_status:      get('Payment Status') || undefined,
    rateable_value:      get('Rateable Value') || get('Total Amount Payable') || undefined,
    rate_impost:         get('Rate Impost') || undefined,
  };

  // Strip empty/undefined keys
  Object.keys(attributes).forEach((k) => {
    if (attributes[k] === undefined || attributes[k] === '') delete attributes[k];
  });

  return {
    module:              recordModule,
    latitude:            latitude,
    longitude:           longitude,
    ghana_post_address:  ghanaPostAddress || (rawLocation ? String(rawLocation).slice(0, 50) : null),
    owner_name:          ownerName || 'Unnamed Ratepayer',
    owner_phone:         ownerPhone || null,
    attributes,
    zone_id:             zoneId,
    capture_method:      'imported',
    status:              'draft',
  };
}

// ---------------------------------------------------------------------------
// POST /api/records/import
// ---------------------------------------------------------------------------
router.post(
  '/import',
  authenticate,
  authorize('admin', 'supervisor', 'budget_director'),
  safeUpload,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Please attach a CSV or Excel file.' });
      }

      // Parse file
      let rows;
      try {
        rows = await parseFile(req.file.buffer, req.file.originalname);
      } catch (parseErr) {
        return res.status(400).json({ error: `Could not parse file: ${parseErr.message}` });
      }

      if (!rows.length) {
        return res.status(400).json({ error: 'The uploaded file appears to be empty or has no data rows.' });
      }

      // Load all zones once so we can resolve zone names
      const zonesRes = await query('SELECT id, name FROM zones');
      const zonesByName = {};
      for (const z of zonesRes.rows) {
        zonesByName[normalise(z.name)] = z.id;
      }

      // Preload existing bill numbers to prevent duplicate imports
      const existingBillsRes = await query(`
        SELECT attributes->>'bill_number' AS bill_no
        FROM records
        WHERE attributes->>'bill_number' IS NOT NULL
      `);
      const existingBills = new Set(existingBillsRes.rows.map(r => r.bill_no).filter(Boolean));

      let imported = 0;
      let skipped  = 0;
      const errors = [];

      // Batch insert in chunks of 50 for high performance with 1,000+ row files
      const BATCH_SIZE = 50;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const validMapped = [];

        for (let j = 0; j < batch.length; j++) {
          const rowNum = i + j + 2; // spreadsheet row (1-indexed, header = row 1)
          try {
            const mapped = mapRow(batch[j], zonesByName);
            if (!mapped) {
              skipped++;
              errors.push({ row: rowNum, reason: 'Invalid GPS coordinates — skipped' });
              continue;
            }

            // Duplicate prevention: skip if bill number already in DB or seen in this batch
            const billNo = mapped.attributes?.bill_number;
            if (billNo && existingBills.has(billNo)) {
              skipped++;
              continue;
            }
            if (billNo) {
              existingBills.add(billNo);
            }

            validMapped.push({ mapped, rowNum });
          } catch (rowErr) {
            skipped++;
            errors.push({ row: rowNum, reason: rowErr.message });
          }
        }

        if (validMapped.length === 0) continue;

        // Try fast multi-row batch insert
        try {
          const valueClauses = [];
          const params = [];
          let pIdx = 1;

          for (const item of validMapped) {
            const m = item.mapped;
            const hasGps = m.latitude != null && m.longitude != null;
            const lngP = pIdx++;
            const latP = pIdx++;
            const modP = pIdx++;
            const capP = pIdx++;
            const gpP  = pIdx++;
            const ownP = pIdx++;
            const phP  = pIdx++;
            const attP = pIdx++;
            const staP = pIdx++;
            const zonP = pIdx++;
            const usrP = pIdx++;

            params.push(
              hasGps ? m.longitude : null,
              hasGps ? m.latitude : null,
              m.module,
              m.capture_method,
              m.ghana_post_address,
              m.owner_name,
              m.owner_phone,
              JSON.stringify(m.attributes),
              m.status,
              m.zone_id,
              req.user.id
            );

            valueClauses.push(
              `($${modP}, (CASE WHEN $${lngP}::float IS NOT NULL AND $${latP}::float IS NOT NULL THEN ST_SetSRID(ST_MakePoint($${lngP}, $${latP}), 4326) ELSE NULL END), $${latP}, $${lngP}, $${capP}, $${gpP}, $${gpP}, $${ownP}, $${phP}, $${attP}, $${staP}, $${zonP}, $${usrP}, now())`
            );
          }

          const insertSql = `
            INSERT INTO records (
              module, location, latitude, longitude,
              capture_method, ghana_post_address, location_name, owner_name, owner_phone,
              attributes, status, zone_id, created_by, capture_time
            )
            VALUES ${valueClauses.join(',\n')}
          `;

          await query(insertSql, params);
          imported += validMapped.length;
        } catch (batchErr) {
          // If multi-row fails, fall back to individual inserts for this batch
          for (const item of validMapped) {
            try {
              const m = item.mapped;
              const hasGps = m.latitude != null && m.longitude != null;
              const locSql = hasGps ? 'ST_SetSRID(ST_MakePoint($2, $3), 4326)' : 'NULL';
              await query(
                `INSERT INTO records (
                   module, location, latitude, longitude,
                   capture_method, ghana_post_address, location_name, owner_name, owner_phone,
                   attributes, status, zone_id, created_by, capture_time
                 )
                 VALUES (
                   $1, ${locSql}, $3, $2,
                   $4, $5, $5, $6, $7,
                   $8, $9, $10, $11, now()
                 )`,
                [
                  m.module,
                  hasGps ? m.longitude : null,
                  hasGps ? m.latitude : null,
                  m.capture_method,
                  m.ghana_post_address,
                  m.owner_name,
                  m.owner_phone,
                  JSON.stringify(m.attributes),
                  m.status,
                  m.zone_id,
                  req.user.id,
                ]
              );
              imported++;
            } catch (singleErr) {
              skipped++;
              errors.push({ row: item.rowNum, reason: singleErr.message });
            }
          }
        }
      }

      res.status(201).json({
        message: `Import complete. ${imported} record(s) created as drafts.`,
        imported,
        skipped,
        errors: errors.slice(0, 50), // cap error list at 50
      });
    } catch (err) {
      console.error('Import error:', err);
      res.status(500).json({ error: `Import failed: ${err.message}` });
    }
  }
);

export default router;
