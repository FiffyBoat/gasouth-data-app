import express from 'express';
import { query, getClient } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRecord, handleValidation } from '../middleware/validate.js';
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
    const { lat, lng, radius = 50, limit = 50 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng parameters are required' });
    }

    const records = await findNearbyRecords(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius),
      parseInt(limit, 10)
    );

    res.json({ records });
  } catch (err) {
    console.error('Error fetching nearby records:', err);
    res.status(500).json({ error: 'Failed to fetch nearby records' });
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

    if (moduleFilter) {
      conditions.push(`r.module = $${paramIndex++}`);
      params.push(moduleFilter);
    }

    if (status) {
      conditions.push(`r.status = $${paramIndex++}`);
      params.push(status);
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
 * Exports approved (or all verified) records as a downloadable CSV file
 */
router.get('/export/csv', authenticate, async (req, res) => {
  try {
    const { status = 'approved', module: modFilter, zone_id } = req.query;

    const listRes = await query('SELECT * FROM records r GROUP BY r.id');
    let records = listRes.rows || [];

    if (status) {
      records = records.filter((r) => r.status === status);
    }
    if (modFilter) {
      records = records.filter((r) => r.module === modFilter);
    }
    if (zone_id) {
      records = records.filter((r) => r.zone_id === zone_id);
    }

    // Generate CSV Header
    const headers = [
      'Record ID',
      'Revenue Category',
      'Ratepayer Name',
      'Phone',
      'Group',
      'GPS Latitude',
      'GPS Longitude',
      'Accuracy (m)',
      'Ghana Post Address',
      'Landmark',
      'Street Name',
      'Collection Area',
      'Sub Collection Area',
      'UPN',
      'Property Address',
      'Valuation Number',
      'Use Code',
      'Rateable Value (GHS)',
      'Rate Impost',
      'Business Type',
      'Business Category',
      'Services Provided',
      'Status',
      'Captured Date',
      'Last Review Comment',
    ];

    const rows = records.map((r) => {
      const a = r.attributes || {};
      return [
        `"${r.id || ''}"`,
        `"${r.module || ''}"`,
        `"${(r.owner_name || '').replace(/"/g, '""')}"`,
        `"${r.owner_phone || ''}"`,
        `"${(a.groups || '').replace(/"/g, '""')}"`,
        r.latitude || '',
        r.longitude || '',
        r.accuracy_m || '',
        `"${r.ghana_post_address || ''}"`,
        `"${(a.landmark || '').replace(/"/g, '""')}"`,
        `"${(a.street_name || '').replace(/"/g, '""')}"`,
        `"${(a.collection_area || '').replace(/"/g, '""')}"`,
        `"${(a.sub_collection_area || '').replace(/"/g, '""')}"`,
        `"${(a.upn || '').replace(/"/g, '""')}"`,
        `"${(a.property_address || '').replace(/"/g, '""')}"`,
        `"${(a.valuation_number || '').replace(/"/g, '""')}"`,
        `"${(a.use_code || '').replace(/"/g, '""')}"`,
        a.rateable_value || '',
        a.rate_impost || '',
        `"${(a.business_type || '').replace(/"/g, '""')}"`,
        `"${(a.business_category || '').replace(/"/g, '""')}"`,
        `"${(a.services_provided || '').replace(/"/g, '""')}"`,
        `"${r.status || ''}"`,
        `"${r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : ''}"`,
        `"${(r.review_comment || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="approved_revenue_records_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('CSV Export error:', err);
    res.status(500).json({ error: 'Failed to generate CSV export' });
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
      `SELECT id, file_path, thumbnail_path, original_name, size_bytes, mime_type, sort_order, uploaded_at
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

      // Detect containing zone automatically using PostGIS
      const detectedZoneId = await findZoneForPoint(latitude, longitude);

      // Check geofence if user has an assigned zone
      let geofenceWarning = null;
      if (req.user.assigned_zone_id && detectedZoneId && req.user.assigned_zone_id !== detectedZoneId) {
        geofenceWarning = 'Location is outside your assigned municipal zone.';
      }

      // Check duplicate records
      let potentialDuplicates = [];
      if (owner_name) {
        potentialDuplicates = await checkDuplicates(latitude, longitude, owner_name);
      }

      const client = await getClient();
      try {
        await client.query('BEGIN');

        const insertSql = `
          INSERT INTO records (
            module, location, latitude, longitude, altitude, accuracy_m,
            capture_method, ghana_post_address, owner_name, owner_phone,
            owner_id_type, owner_id_number, attributes, status,
            zone_id, created_by, device_info, capture_time
          )
          VALUES (
            $1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $3, $2, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12, $13,
            $14, $15, $16, now()
          )
          RETURNING *;
        `;

        const result = await client.query(insertSql, [
          recordModule,
          longitude, // X
          latitude,  // Y
          altitude || null,
          accuracy_m || null,
          capture_method,
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

      if (req.user.role === 'collector' && existing.created_by !== req.user.id) {
        return res.status(403).json({ error: 'You can only update your own records' });
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

      const detectedZoneId = await findZoneForPoint(latitude, longitude);

      const client = await getClient();
      try {
        await client.query('BEGIN');

        const updateSql = `
          UPDATE records
          SET
            module = $1,
            location = ST_SetSRID(ST_MakePoint($2, $3), 4326),
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
            zone_id = $13,
            updated_at = now()
          WHERE id = $14
          RETURNING *;
        `;

        const result = await client.query(updateSql, [
          recordModule,
          longitude,
          latitude,
          altitude || null,
          accuracy_m || null,
          capture_method,
          ghana_post_address || null,
          owner_name || null,
          owner_phone || null,
          owner_id_type || null,
          owner_id_number || null,
          JSON.stringify(attributes),
          detectedZoneId,
          id,
        ]);

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
      // 1. Collector: can only submit their own draft or rejected records
      if (req.user.role === 'collector') {
        if (targetStatus !== 'submitted' && targetStatus !== 'draft') {
          return res.status(403).json({ error: 'Collectors can only submit records for supervisor review' });
        }
        if (record.created_by !== req.user.id) {
          return res.status(403).json({ error: 'You can only update your own records' });
        }
      }

      // 2. Data Supervisor: reviews submitted records and endorses them as 'reviewed' (or flags/rejects)
      if (req.user.role === 'supervisor') {
        if (!['reviewed', 'flagged', 'rejected'].includes(targetStatus)) {
          return res.status(403).json({
            error: 'Data Supervisors review records and submit them for Budget Director approval (status: reviewed)',
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
