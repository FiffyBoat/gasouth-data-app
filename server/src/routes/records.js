import express from 'express';
import { query, getClient } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRecord, validateRecordOnSubmit, handleValidation } from '../middleware/validate.js';
import { auditLog } from '../middleware/audit.js';
import { findZoneForPoint, findNearbyRecords } from '../utils/spatial.js';
import { checkDuplicates } from '../utils/duplicateCheck.js';

const router = express.Router();

/**
 * GET /api/records/check-duplicates
 * Query params: lat, lng, owner_name, [exclude_id]
 */
router.get('/check-duplicates', authenticate, async (req, res) => {
  try {
    const { lat, lng, owner_name, exclude_id } = req.query;

    if (!lat || !lng || !owner_name) {
      return res.status(400).json({ error: 'lat, lng, and owner_name are required' });
    }

    const duplicates = await checkDuplicates(
      parseFloat(lat),
      parseFloat(lng),
      owner_name,
      exclude_id || null
    );

    res.json({ duplicates });
  } catch (err) {
    console.error('Error checking duplicates:', err);
    res.status(500).json({ error: 'Failed to check duplicates' });
  }
});

/**
 * GET /api/records/nearby
 * Query params: lat, lng, radius (meters)
 */
router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { lat, lng, radius = 50, limit = 50, exclude_id = null } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng parameters are required' });
    }

    const records = await findNearbyRecords(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius),
      parseInt(limit, 10),
      exclude_id || null
    );

    res.json({ records });
  } catch (err) {
    console.error('Error fetching nearby records:', err);
    res.status(500).json({ error: 'Failed to fetch nearby records' });
  }
});

/**
 * GET /api/records/collector-route
 * Allows supervisors/admins to trace a collector's route and timestamps on a given date
 * Query params: collector_id, date (YYYY-MM-DD)
 */
router.get('/collector-route', authenticate, async (req, res) => {
  try {
    const { collector_id, date } = req.query;

    if (!collector_id) {
      return res.status(400).json({ error: 'collector_id parameter is required' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT
         r.id, r.module, r.latitude, r.longitude, r.accuracy_m,
         r.owner_name, r.status, r.ghana_post_address,
         r.capture_time, r.created_at,
         u.full_name AS collector_name,
         z.name AS zone_name,
         (SELECT file_path FROM photos WHERE record_id = r.id ORDER BY sort_order ASC, uploaded_at ASC LIMIT 1) AS primary_photo
       FROM records r
       JOIN users u ON r.created_by = u.id
       LEFT JOIN zones z ON r.zone_id = z.id
       WHERE r.created_by = $1
         AND (
           DATE(r.capture_time AT TIME ZONE 'UTC') = $2::date
           OR DATE(r.created_at AT TIME ZONE 'UTC') = $2::date
         )
       ORDER BY COALESCE(r.capture_time, r.created_at) ASC;`,
      [collector_id, targetDate]
    );

    const points = result.rows;

    // Calculate total route distance in meters using Haversine formula
    let totalDistanceM = 0;
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const R = 6371e3; // metres
      const φ1 = (p1.latitude * Math.PI) / 180;
      const φ2 = (p2.latitude * Math.PI) / 180;
      const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
      const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;
      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistanceM += R * c;
    }

    res.json({
      collector_id,
      date: targetDate,
      total_points: points.length,
      total_distance_km: (totalDistanceM / 1000).toFixed(2),
      start_time: points.length > 0 ? points[0].capture_time || points[0].created_at : null,
      end_time: points.length > 0 ? points[points.length - 1].capture_time || points[points.length - 1].created_at : null,
      points,
    });
  } catch (err) {
    console.error('Error fetching collector route:', err);
    res.status(500).json({ error: 'Failed to fetch collector route' });
  }
});

/**
 * GET /api/records
 * List records with filters and pagination
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      module: moduleFilter,
      status,
      zone_id,
      created_by,
      search,
      start_date,
      end_date,
      no_gps,
      limit = 50,
      offset = 0,
    } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Role-based scoping / filter
    if (created_by) {
      conditions.push(`r.created_by = $${paramIndex++}`);
      params.push(created_by);
    } else if (req.query.scope === 'mine') {
      conditions.push(`r.created_by = $${paramIndex++}`);
      params.push(req.user.id);
    } else if (req.user.role === 'supervisor' && req.query.zone_only === 'true' && req.user.assigned_zone_id && !zone_id) {
      conditions.push(`r.zone_id = $${paramIndex++}`);
      params.push(req.user.assigned_zone_id);
    }

    // Strict workflow boundary: In review mode, Budget Director cannot access unreviewed 'submitted' records
    if (req.user.role === 'budget_director' && (req.query.for_review === 'true' || req.query.review_queue === 'true')) {
      if (status === 'submitted') {
        return res.status(403).json({ error: 'Budget Director can only access records after Data Supervisor review (status: reviewed).' });
      }
    }

    if (moduleFilter) {
      conditions.push(`r.module = $${paramIndex++}`);
      params.push(moduleFilter);
    }

    if (status) {
      conditions.push(`r.status = $${paramIndex++}`);
      params.push(status);
    }

    if (no_gps === '1' || no_gps === 'true') {
      conditions.push('(r.latitude IS NULL OR r.longitude IS NULL)');
    }

    if (zone_id) {
      conditions.push(`r.zone_id = $${paramIndex++}`);
      params.push(zone_id);
    }

    if (created_by) {
      conditions.push(`r.created_by = $${paramIndex++}`);
      params.push(created_by);
    }

    if (start_date) {
      conditions.push(`r.created_at >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`r.created_at <= $${paramIndex++}`);
      params.push(end_date);
    }

    if (search) {
      conditions.push(`(r.owner_name ILIKE $${paramIndex} OR r.ghana_post_address ILIKE $${paramIndex} OR r.owner_phone ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countResult = await query(
      `SELECT COUNT(*) FROM records r ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query with photo count and zone info
    const queryParams = [...params, parseInt(limit, 10), parseInt(offset, 10)];
    const dataSql = `
      SELECT
        r.id, r.module, r.latitude, r.longitude, r.altitude, r.accuracy_m,
        r.capture_method, r.ghana_post_address, r.owner_name, r.owner_phone,
        r.owner_id_type, r.owner_id_number, r.attributes, r.status,
        r.zone_id, z.name as zone_name,
        r.created_by, u.full_name as created_by_name,
        r.reviewed_by, rev.full_name as reviewed_by_name,
        r.review_comment, r.review_time,
        r.created_at, r.updated_at,
        COUNT(p.id)::int as photo_count
      FROM records r
      LEFT JOIN zones z ON r.zone_id = z.id
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN users rev ON r.reviewed_by = rev.id
      LEFT JOIN photos p ON r.id = p.record_id
      ${whereClause}
      GROUP BY r.id, z.name, u.full_name, rev.full_name
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const result = await query(dataSql, queryParams);

    res.json({
      records: result.rows,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error('Error fetching records:', err);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

/**
 * GET /api/records/export/csv
 * Exports records in the exact 43-column ZebraRMS import template format:
 * Firstname | Lastname | Email | Contact phonenumber | Position | Company | Vat | Phonenumber | Country | City | Zip | State | Address | Website | Billing street | Billing city | Billing state | Billing zip | Billing country | Shipping street | Shipping city | Shipping state | Shipping zip | Shipping country | Longitude | Latitude | Stripe id | Location | Landmark | Business Type | Business Category | Service(s) Provided | Valuation Number | Use Code | Zone | UPN | Property Address | Ghana Post Code | Street Name | Collection Area | Sub Collection Area | Rateable Value | Rate Impost
 */
router.get('/export/csv', authenticate, async (req, res) => {
  try {
    const { status = 'approved', module: modFilter, zone_id } = req.query;

    const listRes = await query(`
      SELECT r.*, z.name as zone_name
      FROM records r
      LEFT JOIN zones z ON r.zone_id = z.id
      GROUP BY r.id, z.name
      ORDER BY r.created_at DESC
    `);
    let records = listRes.rows || [];

    if (status && status !== 'all') {
      records = records.filter((r) => r.status === status);
    }
    if (modFilter) {
      records = records.filter((r) => r.module === modFilter);
    }
    if (zone_id) {
      records = records.filter((r) => r.zone_id === zone_id);
    }

    // Exact 43 ZebraRMS template headers in precise order
    const headers = [
      'Firstname',
      'Lastname',
      'Email',
      'Contact phonenumber',
      'Position',
      'Company',
      'Vat',
      'Phonenumber',
      'Country',
      'City',
      'Zip',
      'State',
      'Address',
      'Website',
      'Billing street',
      'Billing city',
      'Billing state',
      'Billing zip',
      'Billing country',
      'Shipping street',
      'Shipping city',
      'Shipping state',
      'Shipping zip',
      'Shipping country',
      'Longitude',
      'Latitude',
      'Stripe id',
      'Location',
      'Landmark',
      'Business Type',
      'Business Category',
      'Service(s) Provided',
      'Valuation Number',
      'Use Code',
      'Zone',
      'UPN',
      'Property Address',
      'Ghana Post Code',
      'Street Name',
      'Collection Area',
      'Sub Collection Area',
      'Rateable Value',
      'Rate Impost',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined || val === '') return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = records.map((r) => {
      const a = r.attributes || {};
      const rawName = (r.owner_name || '').trim();
      const nameParts = rawName ? rawName.split(/\s+/) : [];
      const firstname = nameParts.length > 0 ? nameParts[0] : '';
      const lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      const phone = r.owner_phone || '';
      const ghanaPost = r.ghana_post_address || '';
      const propAddress = a.property_address || '';
      const street = a.street_name || '';
      const company = a.business_type || a.company || '';
      const zoneName = r.zone_name || '';

      // Generate synthetic valid & unique email for ZebraRMS import (Format A: {phone}@gasouth.gov.gh)
      let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
      let syntheticEmail = '';
      if (cleanPhone && cleanPhone.length >= 7) {
        syntheticEmail = `${cleanPhone}@gasouth.gov.gh`;
      } else if (a.upn) {
        const cleanUpn = String(a.upn).replace(/[^a-zA-Z0-9]/g, '');
        syntheticEmail = `upn.${cleanUpn}@gasouth.gov.gh`;
      } else {
        const shortId = String(r.id || 'record').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
        syntheticEmail = `prop.${shortId}@gasouth.gov.gh`;
      }

      return [
        escapeCsv(firstname),                                      // 1. Firstname
        escapeCsv(lastname),                                       // 2. Lastname
        escapeCsv(syntheticEmail),                                 // 3. Email (Synthetic Unique for ZebraRMS)
        escapeCsv(phone),                                          // 4. Contact phonenumber
        '""',                                                      // 5. Position (empty)
        escapeCsv(company),                                        // 6. Company
        '""',                                                      // 7. Vat (empty)
        escapeCsv(phone),                                          // 8. Phonenumber
        escapeCsv('Ghana'),                                        // 9. Country
        '""',                                                      // 10. City (empty)
        '""',                                                      // 11. Zip (empty)
        '""',                                                      // 12. State (empty)
        escapeCsv(propAddress),                                    // 13. Address
        '""',                                                      // 14. Website (empty)
        escapeCsv(street),                                         // 15. Billing street
        '""',                                                      // 16. Billing city (empty)
        '""',                                                      // 17. Billing state (empty)
        '""',                                                      // 18. Billing zip (empty)
        escapeCsv('Ghana'),                                        // 19. Billing country
        '""',                                                      // 20. Shipping street (empty)
        '""',                                                      // 21. Shipping city (empty)
        '""',                                                      // 22. Shipping state (empty)
        '""',                                                      // 23. Shipping zip (empty)
        '""',                                                      // 24. Shipping country (empty)
        r.longitude != null ? r.longitude : '',                    // 25. Longitude
        r.latitude != null ? r.latitude : '',                      // 26. Latitude
        '""',                                                      // 27. Stripe id (empty)
        escapeCsv(ghanaPost),                                      // 28. Location
        escapeCsv(a.landmark || ''),                               // 29. Landmark
        escapeCsv(a.business_type || ''),                          // 30. Business Type
        escapeCsv(a.business_category || ''),                      // 31. Business Category
        escapeCsv(a.services_provided || ''),                      // 32. Service(s) Provided
        escapeCsv(a.valuation_number || ''),                       // 33. Valuation Number
        escapeCsv(a.use_code || ''),                               // 34. Use Code
        escapeCsv(zoneName),                                       // 35. Zone
        escapeCsv(a.upn || ''),                                    // 36. UPN
        escapeCsv(propAddress),                                    // 37. Property Address
        escapeCsv(ghanaPost),                                      // 38. Ghana Post Code
        escapeCsv(street),                                         // 39. Street Name
        escapeCsv(a.collection_area || ''),                        // 40. Collection Area
        escapeCsv(a.sub_collection_area || ''),                    // 41. Sub Collection Area
        a.rateable_value != null && a.rateable_value !== '' ? a.rateable_value : '""', // 42. Rateable Value
        a.rate_impost != null && a.rate_impost !== '' ? a.rate_impost : '""',         // 43. Rate Impost
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="zebrarms_export_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('CSV Export error:', err);
    res.status(500).json({ error: 'Failed to generate CSV export' });
  }
});

/**
 * GET /api/records/export/geojson
 * Exports records as a standard GeoJSON FeatureCollection for QGIS / Town Planning / GIS software
 * Query params: status, module, zone_id
 */
router.get('/export/geojson', authenticate, async (req, res) => {
  try {
    const { status, module: modFilter, zone_id } = req.query;

    let sql = `
      SELECT r.*, z.name as zone_name
      FROM records r
      LEFT JOIN zones z ON r.zone_id = z.id
      WHERE r.latitude IS NOT NULL AND r.longitude IS NOT NULL
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND r.status = $${params.length}`;
    }
    if (modFilter) {
      params.push(modFilter);
      sql += ` AND r.module = $${params.length}`;
    }
    if (zone_id) {
      params.push(zone_id);
      sql += ` AND r.zone_id = $${params.length}`;
    }

    sql += ' ORDER BY r.created_at DESC';

    const result = await query(sql, params);
    const rows = result.rows || [];

    const features = rows.map((r) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(r.longitude), parseFloat(r.latitude)],
      },
      properties: {
        id: r.id,
        module: r.module,
        owner_name: r.owner_name,
        owner_phone: r.owner_phone,
        ghana_post_address: r.ghana_post_address,
        status: r.status,
        accuracy_m: r.accuracy_m,
        capture_method: r.capture_method,
        zone_id: r.zone_id,
        zone_name: r.zone_name,
        created_at: r.created_at,
        updated_at: r.updated_at,
        ...(r.attributes || {}),
      },
    }));

    const geojson = {
      type: 'FeatureCollection',
      name: 'Ga_South_Municipal_Assembly_Field_Records',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
      },
      features,
    };

    res.setHeader('Content-Type', 'application/geo+json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="gasouth_spatial_records_${status || 'all'}_${Date.now()}.geojson"`
    );
    res.json(geojson);
  } catch (err) {
    console.error('GeoJSON Export error:', err);
    res.status(500).json({ error: 'Failed to generate GeoJSON export' });
  }
});

/**
 * GET /api/records/:id
 * Retrieve a single record with photos and history
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const recordResult = await query(
      `SELECT
         r.id, r.module, r.latitude, r.longitude, r.altitude, r.accuracy_m,
         r.capture_method, r.ghana_post_address, r.owner_name, r.owner_phone,
         r.owner_id_type, r.owner_id_number, r.attributes, r.status,
         r.zone_id, z.name as zone_name,
         r.created_by, u.full_name as created_by_name,
         r.reviewed_by, rev.full_name as reviewed_by_name,
         r.review_comment, r.review_time,
         r.created_at, r.updated_at, r.device_info, r.capture_time
       FROM records r
       LEFT JOIN zones z ON r.zone_id = z.id
       LEFT JOIN users u ON r.created_by = u.id
       LEFT JOIN users rev ON r.reviewed_by = rev.id
       WHERE r.id = $1`,
      [id]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = recordResult.rows[0];

    // Note: read access is open to all authenticated assembly officers so they can verify and inspect items

    // Fetch photos
    const photosResult = await query(
      `SELECT id, file_path, thumbnail_path, original_name, size_bytes, mime_type, sort_order, uploaded_at, data_url
       FROM photos
       WHERE record_id = $1
       ORDER BY sort_order ASC, uploaded_at ASC`,
      [id]
    );

    // Fetch version history
    const versionsResult = await query(
      `SELECT rv.version_number, rv.data, rv.changed_at, u.full_name as changed_by_name
       FROM record_versions rv
       LEFT JOIN users u ON rv.changed_by = u.id
       WHERE rv.record_id = $1
       ORDER BY rv.version_number DESC`,
      [id]
    );

    res.json({
      record: {
        ...record,
        photos: photosResult.rows,
        versions: versionsResult.rows,
      },
    });
  } catch (err) {
    console.error('Error fetching record detail:', err);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

/**
 * POST /api/records
 * Create a new record with GPS location and geofence verification
 */
router.post(
  '/',
  authenticate,
  validateRecord,
  validateRecordOnSubmit,
  handleValidation,
  auditLog('create', 'record'),
  async (req, res) => {
    try {
      const {
        module: recordModule,
        latitude,
        longitude,
        altitude,
        accuracy_m,
        capture_method,
        ghana_post_address,
        owner_name,
        owner_phone,
        owner_id_type,
        owner_id_number,
        attributes = {},
        status = 'draft',
        device_info,
      } = req.body;

      // Detect containing zone automatically using PostGIS (only when GPS present)
      const hasGps = latitude != null && longitude != null;
      const detectedZoneId = hasGps ? await findZoneForPoint(latitude, longitude) : null;

      // Check geofence if user has an assigned zone
      let geofenceWarning = null;
      if (hasGps && req.user.assigned_zone_id && detectedZoneId && req.user.assigned_zone_id !== detectedZoneId) {
        geofenceWarning = 'Location is outside your assigned municipal zone.';
      }

      // Check duplicate records
      let potentialDuplicates = [];
      if (hasGps && owner_name) {
        potentialDuplicates = await checkDuplicates(latitude, longitude, owner_name);
      }

      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Build location SQL conditionally — imported drafts may have no GPS
        const locationSql = hasGps
          ? 'ST_SetSRID(ST_MakePoint($2, $3), 4326)'
          : 'NULL';

        const insertSql = `
          INSERT INTO records (
            module, location, latitude, longitude, altitude, accuracy_m,
            capture_method, ghana_post_address, owner_name, owner_phone,
            owner_id_type, owner_id_number, attributes, status,
            zone_id, created_by, device_info, capture_time
          )
          VALUES (
            $1, ${locationSql}, $3, $2, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12, $13,
            $14, $15, $16, now()
          )
          RETURNING *;
        `;

        const result = await client.query(insertSql, [
          recordModule,
          hasGps ? longitude : null, // $2 = X / lng
          hasGps ? latitude : null,  // $3 = Y / lat
          altitude || null,
          accuracy_m || null,
          capture_method || null,
          ghana_post_address || null,
          owner_name || null,
          owner_phone || null,
          owner_id_type || null,
          owner_id_number || null,
          JSON.stringify(attributes),
          status === 'submitted' ? 'submitted' : 'draft',
          detectedZoneId,
          req.user.id,
          device_info || req.headers['user-agent'] || null,
        ]);

        const record = result.rows[0];

        // Save initial version
        await client.query(
          `INSERT INTO record_versions (record_id, version_number, data, changed_by)
           VALUES ($1, 1, $2, $3)`,
          [record.id, JSON.stringify(record), req.user.id]
        );

        await client.query('COMMIT');

        res.status(201).json({
          record,
          detected_zone_id: detectedZoneId,
          geofence_warning: geofenceWarning,
          potential_duplicates: potentialDuplicates,
        });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Error creating record:', err);
      res.status(500).json({ error: 'Failed to create record' });
    }
  }
);

/**
 * PUT /api/records/:id
 * Update an existing draft/rejected record
 */
router.put(
  '/:id',
  authenticate,
  validateRecord,
  validateRecordOnSubmit,
  handleValidation,
  auditLog('update', 'record'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const existingResult = await query('SELECT * FROM records WHERE id = $1', [id]);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      const existing = existingResult.rows[0];
      req._auditOldValues = existing;

      // Only draft and rejected records can be edited
      if (existing.status !== 'draft' && existing.status !== 'rejected') {
        return res.status(400).json({
          error: `Records in '${existing.status}' status cannot be modified.`,
        });
      }

      // Collectors can update their own records OR imported drafts needing GPS/verification
      const isOwner = existing.created_by === req.user.id;
      const isImportedDraft = existing.capture_method === 'imported';
      if (req.user.role === 'collector' && !isOwner && !isImportedDraft) {
        return res.status(403).json({ error: 'You can only update your own records or imported drafts' });
      }

      const {
        module: recordModule,
        latitude,
        longitude,
        altitude,
        accuracy_m,
        capture_method,
        ghana_post_address,
        owner_name,
        owner_phone,
        owner_id_type,
        owner_id_number,
        attributes = {},
      } = req.body;

      const hasGps = latitude != null && longitude != null;
      const detectedZoneId = hasGps ? await findZoneForPoint(latitude, longitude) : null;

      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Build SET clause conditionally — only update location when GPS provided
        const locationSetSql = hasGps
          ? 'location = ST_SetSRID(ST_MakePoint($2, $3), 4326),'
          : '';

        // If a collector is editing an imported draft, claim ownership for this collector
        const shouldClaimRecord = req.user.role === 'collector' && isImportedDraft && !isOwner;
        const createdBySetSql = shouldClaimRecord ? ', created_by = $15' : '';

        const updateSql = `
          UPDATE records
          SET
            module = $1,
            ${locationSetSql}
            latitude = $3,
            longitude = $2,
            altitude = $4,
            accuracy_m = $5,
            capture_method = $6,
            ghana_post_address = $7,
            owner_name = $8,
            owner_phone = $9,
            owner_id_type = $10,
            owner_id_number = $11,
            attributes = $12,
            zone_id = COALESCE($13, zone_id),
            updated_at = now()
            ${createdBySetSql}
          WHERE id = $14
          RETURNING *;
        `;

        const queryParams = [
          recordModule,
          hasGps ? longitude : null,
          hasGps ? latitude : null,
          altitude || null,
          accuracy_m || null,
          capture_method || null,
          ghana_post_address || null,
          owner_name || null,
          owner_phone || null,
          owner_id_type || null,
          owner_id_number || null,
          JSON.stringify(attributes),
          detectedZoneId,
          id,
        ];
        if (shouldClaimRecord) {
          queryParams.push(req.user.id);
        }

        const result = await client.query(updateSql, queryParams);

        // Get max version number
        const vRes = await client.query(
          'SELECT COALESCE(MAX(version_number), 0) + 1 as next_v FROM record_versions WHERE record_id = $1',
          [id]
        );
        const nextVersion = vRes.rows[0].next_v;

        await client.query(
          `INSERT INTO record_versions (record_id, version_number, data, changed_by)
           VALUES ($1, $2, $3, $4)`,
          [id, nextVersion, JSON.stringify(result.rows[0]), req.user.id]
        );

        await client.query('COMMIT');
        res.json({ record: result.rows[0] });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Error updating record:', err);
      res.status(500).json({ error: 'Failed to update record' });
    }
  }
);

/**
 * PATCH /api/records/:id/attributes
 * Update record attributes (property specifications) — Budget Director only.
 * Allows budget director to fill in valuation fields before final approval.
 */
router.patch(
  '/:id/attributes',
  authenticate,
  authorize('budget_director', 'admin'),
  auditLog('update_attributes', 'record'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { attributes: newAttributes } = req.body;

      if (!newAttributes || typeof newAttributes !== 'object') {
        return res.status(400).json({ error: 'attributes object is required' });
      }

      const existingRes = await query('SELECT * FROM records WHERE id = $1', [id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      const record = existingRes.rows[0];
      req._auditOldValues = record;

      // Merge new attributes with existing
      const currentAttrs = typeof record.attributes === 'string'
        ? JSON.parse(record.attributes)
        : (record.attributes || {});

      const mergedAttributes = { ...currentAttrs, ...newAttributes };

      const updateSql = `
        UPDATE records
        SET
          attributes = $1,
          updated_at = now()
        WHERE id = $2
        RETURNING *;
      `;

      const result = await query(updateSql, [
        JSON.stringify(mergedAttributes),
        id,
      ]);

      res.json({ record: result.rows[0] });
    } catch (err) {
      console.error('Error updating record attributes:', err);
      res.status(500).json({ error: 'Failed to update record attributes' });
    }
  }
);

/**
 * POST /api/records/batch-status
 * Bulk endorse or approve multiple records at once (Supervisor or Budget Director)
 * Body: { record_ids: string[], status: 'reviewed' | 'approved', comment?: string }
 */
router.post(
  '/batch-status',
  authenticate,
  auditLog('batch_status_change', 'record'),
  async (req, res) => {
    try {
      const { record_ids, status: targetStatus, comment } = req.body;

      if (!Array.isArray(record_ids) || record_ids.length === 0) {
        return res.status(400).json({ error: 'record_ids array is required' });
      }

      if (!['reviewed', 'approved'].includes(targetStatus)) {
        return res.status(400).json({ error: 'Batch status update only supports reviewed or approved' });
      }

      // Role check
      if (req.user.role === 'supervisor' && targetStatus !== 'reviewed') {
        return res.status(403).json({ error: 'Supervisors can only batch-endorse to reviewed status' });
      }
      if (req.user.role === 'budget_director' && targetStatus !== 'approved') {
        return res.status(403).json({ error: 'Budget Director can only batch-certify to approved status' });
      }
      if (req.user.role === 'collector') {
        return res.status(403).json({ error: 'Collectors cannot perform batch reviews' });
      }

      const client = await getClient();
      let updatedCount = 0;
      const failed = [];

      try {
        await client.query('BEGIN');

        for (const id of record_ids) {
          const recRes = await client.query('SELECT * FROM records WHERE id = $1', [id]);
          if (recRes.rows.length === 0) {
            failed.push({ id, error: 'Not found' });
            continue;
          }
          const rec = recRes.rows[0];

          if (targetStatus === 'reviewed' && rec.status !== 'submitted') {
            failed.push({ id, error: `Cannot review record in status ${rec.status}` });
            continue;
          }
          if (targetStatus === 'approved' && rec.status !== 'reviewed') {
            failed.push({ id, error: `Cannot approve record in status ${rec.status}` });
            continue;
          }

          const updateSql = `
            UPDATE records
            SET
              status = $1,
              reviewed_by = $2,
              review_comment = $3,
              review_time = now(),
              updated_at = now()
            WHERE id = $4
            RETURNING *;
          `;
          const updated = await client.query(updateSql, [
            targetStatus,
            req.user.id,
            comment || (targetStatus === 'reviewed' ? 'Batch endorsed by Data Supervisor' : 'Batch certified by Budget Directorate'),
            id,
          ]);

          const vRes = await client.query(
            'SELECT COALESCE(MAX(version_number), 0) + 1 as next_v FROM record_versions WHERE record_id = $1',
            [id]
          );
          const nextVersion = vRes.rows[0].next_v;

          await client.query(
            `INSERT INTO record_versions (record_id, version_number, data, changed_by)
             VALUES ($1, $2, $3, $4)`,
            [id, nextVersion, JSON.stringify(updated.rows[0]), req.user.id]
          );

          updatedCount++;
        }

        await client.query('COMMIT');
        res.json({
          message: `Successfully updated ${updatedCount} records to ${targetStatus}`,
          updatedCount,
          failedCount: failed.length,
          failed,
        });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Error in batch status update:', err);
      res.status(500).json({ error: 'Failed to update records in batch' });
    }
  }
);

/**
 * PATCH /api/records/:id/status
 * Update record status (submit, approve, reject, flag)
 */
router.patch(
  '/:id/status',
  authenticate,
  auditLog('status_change', 'record'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status: targetStatus, comment } = req.body;

      if (!['draft', 'submitted', 'reviewed', 'approved', 'rejected', 'flagged'].includes(targetStatus)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const existingRes = await query('SELECT * FROM records WHERE id = $1', [id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      const record = existingRes.rows[0];
      req._auditOldValues = record;

      // Role-based permission enforcement for workflow:
      // 1. Collector: can submit their own draft/rejected records OR claim & submit imported drafts
      if (req.user.role === 'collector') {
        if (targetStatus !== 'submitted' && targetStatus !== 'draft') {
          return res.status(403).json({ error: 'Collectors can only submit records for supervisor review' });
        }
        const isOwner = record.created_by === req.user.id;
        const isImported = record.capture_method === 'imported';
        if (!isOwner && !isImported) {
          return res.status(403).json({ error: 'You can only update your own records or imported drafts' });
        }
        // If claiming an imported record, assign ownership to this collector
        if (isImported && !isOwner) {
          await query('UPDATE records SET created_by = $1 WHERE id = $2', [req.user.id, record.id]);
        }
        if (targetStatus === 'submitted') {
          const attrs = typeof record.attributes === 'string' ? JSON.parse(record.attributes || '{}') : (record.attributes || {});
          if (record.latitude == null || record.longitude == null) {
            return res.status(422).json({ error: 'GPS location must be captured before submitting' });
          }
          if (!record.owner_name?.trim()) {
            return res.status(422).json({ error: 'Ratepayer name is required before submitting' });
          }
          if (!record.owner_phone?.trim()) {
            return res.status(422).json({ error: 'Ratepayer phone number is required before submitting' });
          }
          if (record.module === 'property') {
            if (!attrs.property_address?.trim()) {
              return res.status(422).json({ error: 'Property address is required for Property Rate records' });
            }
            if (!attrs.structural_type?.trim() && !attrs.construction_type?.trim()) {
              return res.status(422).json({ error: 'Structural type is required for Property Rate records' });
            }
          } else if (record.module === 'business') {
            if (!attrs.business_category?.trim()) {
              return res.status(422).json({ error: 'Business category is required for BOP records' });
            }
            if (!attrs.services_provided?.trim()) {
              return res.status(422).json({ error: 'Services provided is required for BOP records' });
            }
          } else if (record.module === 'market_stall') {
            if (!attrs.market_name?.trim() || !attrs.stall_number?.trim() || !attrs.commodity?.trim()) {
              return res.status(422).json({ error: 'Market name, stall number, and commodity are required for Market Stall records' });
            }
          }
        }
      }

      // 2. Data Supervisor: reviews submitted records and endorses them as 'reviewed' (or flags/rejects)
      if (req.user.role === 'supervisor') {
        if (!['reviewed', 'flagged', 'rejected'].includes(targetStatus)) {
          return res.status(403).json({
            error: 'Data Supervisors review records and submit them for Budget Director approval (status: reviewed)',
          });
        }
        if (record.status !== 'submitted') {
          return res.status(403).json({
            error: 'Data Supervisors can only review records in submitted status',
          });
        }
      }

      // 3. Budget Director: approves reviewed records as 'approved' (or flags/rejects)
      if (req.user.role === 'budget_director') {
        if (!['approved', 'flagged', 'rejected'].includes(targetStatus)) {
          return res.status(403).json({
            error: 'Budget Director has final sign-off authority to approve records for billing',
          });
        }
        if (record.status !== 'reviewed') {
          return res.status(403).json({
            error: 'Budget Director can only approve records that have been reviewed by a Data Supervisor (status: reviewed)',
          });
        }
      }

      // Rejection requires comment
      if (targetStatus === 'rejected' && (!comment || comment.trim().length === 0)) {
        return res.status(400).json({ error: 'A review comment is required when rejecting a record' });
      }

      const client = await getClient();
      try {
        await client.query('BEGIN');

        const updateSql = `
          UPDATE records
          SET
            status = $1,
            reviewed_by = $2,
            review_comment = $3,
            review_time = now(),
            updated_at = now()
          WHERE id = $4
          RETURNING *;
        `;

        const result = await client.query(updateSql, [
          targetStatus,
          req.user.id,
          comment || null,
          id,
        ]);

        const vRes = await client.query(
          'SELECT COALESCE(MAX(version_number), 0) + 1 as next_v FROM record_versions WHERE record_id = $1',
          [id]
        );
        const nextVersion = vRes.rows[0].next_v;

        await client.query(
          `INSERT INTO record_versions (record_id, version_number, data, changed_by)
           VALUES ($1, $2, $3, $4)`,
          [id, nextVersion, JSON.stringify(result.rows[0]), req.user.id]
        );

        await client.query('COMMIT');
        res.json({ record: result.rows[0] });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Error changing record status:', err);
      res.status(500).json({ error: 'Failed to update record status' });
    }
  }
);

/**
 * DELETE /api/records/:id
 * Delete a draft record
 */
router.delete('/:id', authenticate, auditLog('delete', 'record'), async (req, res) => {
  try {
    const { id } = req.params;

    const existingRes = await query('SELECT * FROM records WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = existingRes.rows[0];
    req._auditOldValues = record;

    if (record.status !== 'draft' && record.status !== 'rejected') {
      return res.status(400).json({ error: 'Only draft or rejected records can be deleted' });
    }

    if (req.user.role === 'collector' && record.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own draft/rejected records' });
    }

    await query('DELETE FROM records WHERE id = $1', [id]);
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    console.error('Error deleting record:', err);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

export default router;
