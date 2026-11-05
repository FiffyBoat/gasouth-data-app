/**
 * POST /api/records/import
 * Bulk-import ratepayer records from a ZebraRMS 43-column CSV or Excel file.
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

// Multer: accept CSV and Excel files in memory (no disk write needed)
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel (.xlsx / .xls) files are supported'));
    }
  },
});

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
// ---------------------------------------------------------------------------
async function parseFile(buffer, originalname) {
  const ext = path.extname(originalname).toLowerCase();

  if (ext === '.csv') {
    // Simple RFC-4180 CSV parser (no external package needed)
    const text = buffer.toString('utf8');
    return csvToObjects(text);
  }

  // Excel — requires xlsx package
  const XLSX = (await import('xlsx')).default;
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // header:1 gives array-of-arrays; defval:'', raw:false converts numbers to strings
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  return rows;
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
// ZebraRMS 43-column → DCS record field mapping
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

  const firstName  = get('Firstname', 'First Name', 'First_Name');
  const lastName   = get('Lastname', 'Last Name', 'Last_Name', 'Surname');
  const ownerName  = [firstName, lastName].filter(Boolean).join(' ') || get('Owner Name', 'Owner');
  const ownerPhone = get('Contact phonenumber', 'Phone', 'Phone Number', 'Contact', 'Mobile');

  const latRaw  = get('Latitude', 'lat');
  const lngRaw  = get('Longitude', 'lng', 'long', 'Lon');
  const latitude  = latRaw  ? parseFloat(latRaw)  : null;
  const longitude = lngRaw  ? parseFloat(lngRaw)  : null;

  // Validate GPS if provided
  if (latitude  != null && (isNaN(latitude)  || latitude  < -90  || latitude  > 90))  return null;
  if (longitude != null && (isNaN(longitude) || longitude < -180 || longitude > 180)) return null;

  const ghanaPostAddress = get('Ghana Post Code', 'GhanaPost', 'Location') || null;

  // Zone lookup by name
  const zoneName = get('Zone', 'Zone Name');
  const zoneId   = zoneName ? (zonesByName[normalise(zoneName)] ?? null) : null;

  // Module detection
  const businessType     = get('Business Type');
  const businessCategory = get('Business Category', 'Category');
  const servicesProvided = get('Service(s) Provided', 'Services Provided', 'Services');
  const recordModule     = (businessType || businessCategory || servicesProvided) ? 'business' : 'property';

  // Build attributes from ZebraRMS columns
  const attributes = {
    // Property / address
    property_address:    get('Property Address', 'Address', 'Billing street') || undefined,
    street_name:         get('Street Name', 'Street', 'Billing street') || undefined,
    landmark:            get('Landmark') || undefined,
    collection_area:     get('Collection Area') || undefined,
    sub_collection_area: get('Sub Collection Area', 'Sub-Collection Area') || undefined,
    upn:                 get('UPN', 'Unique Property Number') || undefined,
    valuation_number:    get('Valuation Number', 'Valuation No') || undefined,
    use_code:            get('Use Code') || undefined,
    // Business
    business_type:       businessType || undefined,
    business_category:   businessCategory || undefined,
    services_provided:   servicesProvided || undefined,
    // Financial
    rateable_value:      get('Rateable Value') || undefined,
    rate_impost:         get('Rate Impost') || undefined,
  };

  // Strip undefined values
  Object.keys(attributes).forEach((k) => {
    if (!attributes[k]) delete attributes[k];
  });

  return {
    module:              recordModule,
    latitude:            latitude,
    longitude:           longitude,
    ghana_post_address:  ghanaPostAddress,
    owner_name:          ownerName || null,
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
  authorize('admin', 'supervisor'),
  importUpload.single('file'),
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

      let imported = 0;
      let skipped  = 0;
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2; // spreadsheet row (1-indexed, header = row 1)
        try {
          const mapped = mapRow(rows[i], zonesByName);
          if (!mapped) {
            skipped++;
            errors.push({ row: rowNum, reason: 'Invalid GPS coordinates — skipped' });
            continue;
          }

          // Build conditional location SQL
          const hasGps   = mapped.latitude != null && mapped.longitude != null;
          const locSql   = hasGps ? 'ST_SetSRID(ST_MakePoint($2, $3), 4326)' : 'NULL';

          await query(
            `INSERT INTO records (
               module, location, latitude, longitude,
               capture_method, ghana_post_address, owner_name, owner_phone,
               attributes, status, zone_id, created_by, capture_time
             )
             VALUES (
               $1, ${locSql}, $3, $2,
               $4, $5, $6, $7,
               $8, $9, $10, $11, now()
             )`,
            [
              mapped.module,                            // $1
              hasGps ? mapped.longitude : null,         // $2
              hasGps ? mapped.latitude  : null,         // $3
              mapped.capture_method,                    // $4
              mapped.ghana_post_address,                // $5
              mapped.owner_name,                        // $6
              mapped.owner_phone,                       // $7
              JSON.stringify(mapped.attributes),        // $8
              mapped.status,                            // $9
              mapped.zone_id,                           // $10
              req.user.id,                              // $11
            ]
          );

          imported++;
        } catch (rowErr) {
          skipped++;
          errors.push({ row: rowNum, reason: rowErr.message });
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
