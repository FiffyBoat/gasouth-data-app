import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateZone, handleValidation } from '../middleware/validate.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

/**
 * GET /api/zones/contains
 * Query params: lat, lng
 * Returns zone that contains the given coordinates
 */
router.get('/contains', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng parameters are required' });
    }

    const result = await query(
      `SELECT id, name, code, target_count
       FROM zones
       WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
       LIMIT 1;`,
      [parseFloat(lng), parseFloat(lat)]
    );

    if (result.rows.length === 0) {
      return res.json({ zone: null });
    }

    res.json({ zone: result.rows[0] });
  } catch (err) {
    console.error('Error finding zone for coordinates:', err);
    res.status(500).json({ error: 'Failed to look up zone' });
  }
});

/**
 * GET /api/zones
 * Lists all zones with record counts and GeoJSON boundary geometry
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT
         z.id,
         z.name,
         z.code,
         z.target_count,
         z.created_at,
         z.updated_at,
         COUNT(r.id)::int as record_count,
         COUNT(CASE WHEN r.status = 'approved' THEN 1 END)::int as approved_count,
         ST_AsGeoJSON(z.boundary)::json as boundary_geojson
       FROM zones z
       LEFT JOIN records r ON z.id = r.zone_id
       GROUP BY z.id
       ORDER BY z.name ASC;`
    );

    res.json({ zones: result.rows });
  } catch (err) {
    console.error('Error fetching zones:', err);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

/**
 * GET /api/zones/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT
         z.id,
         z.name,
         z.code,
         z.target_count,
         z.created_at,
         z.updated_at,
         COUNT(r.id)::int as record_count,
         ST_AsGeoJSON(z.boundary)::json as boundary_geojson
       FROM zones z
       LEFT JOIN records r ON z.id = r.zone_id
       WHERE z.id = $1
       GROUP BY z.id;`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    res.json({ zone: result.rows[0] });
  } catch (err) {
    console.error('Error fetching zone:', err);
    res.status(500).json({ error: 'Failed to fetch zone' });
  }
});

/**
 * POST /api/zones
 * Create a new zone (admin or supervisor)
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'supervisor'),
  validateZone,
  handleValidation,
  auditLog('create', 'zone'),
  async (req, res) => {
    try {
      const { name, code, boundary_geojson, target_count = 0 } = req.body;

      let boundarySql = 'NULL';
      const params = [name, code || null, target_count];

      if (boundary_geojson) {
        boundarySql = 'ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)';
        params.push(typeof boundary_geojson === 'string' ? boundary_geojson : JSON.stringify(boundary_geojson));
      }

      const insertSql = `
        INSERT INTO zones (name, code, target_count, boundary)
        VALUES ($1, $2, $3, ${boundarySql})
        RETURNING id, name, code, target_count, created_at, ST_AsGeoJSON(boundary)::json as boundary_geojson;
      `;

      const result = await query(insertSql, params);
      res.status(201).json({ zone: result.rows[0] });
    } catch (err) {
      console.error('Error creating zone:', err);
      res.status(500).json({ error: err.message || 'Failed to create zone' });
    }
  }
);

/**
 * PUT /api/zones/:id
 * Update an existing zone (admin or supervisor)
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'supervisor'),
  validateZone,
  handleValidation,
  auditLog('update', 'zone'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, boundary_geojson, target_count = 0 } = req.body;

      const existingRes = await query('SELECT * FROM zones WHERE id = $1', [id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ error: 'Zone not found' });
      }
      req._auditOldValues = existingRes.rows[0];

      let boundarySql = 'boundary';
      const params = [name, code || null, target_count, id];

      if (boundary_geojson !== undefined) {
        if (boundary_geojson === null) {
          boundarySql = 'NULL';
        } else {
          boundarySql = 'ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)';
          params.push(typeof boundary_geojson === 'string' ? boundary_geojson : JSON.stringify(boundary_geojson));
        }
      }

      const updateSql = `
        UPDATE zones
        SET
          name = $1,
          code = $2,
          target_count = $3,
          boundary = ${boundarySql},
          updated_at = now()
        WHERE id = $4
        RETURNING id, name, code, target_count, updated_at, ST_AsGeoJSON(boundary)::json as boundary_geojson;
      `;

      const result = await query(updateSql, params);
      res.json({ zone: result.rows[0] });
    } catch (err) {
      console.error('Error updating zone:', err);
      res.status(500).json({ error: 'Failed to update zone' });
    }
  }
);

/**
 * DELETE /api/zones/:id
 * Delete a zone if no records or users are linked (admin or supervisor)
 */
router.delete('/:id', authenticate, authorize('admin', 'supervisor'), auditLog('delete', 'zone'), async (req, res) => {
  try {
    const { id } = req.params;

    const countRes = await query('SELECT COUNT(*) FROM records WHERE zone_id = $1', [id]);
    if (parseInt(countRes.rows[0].count, 10) > 0) {
      return res.status(400).json({
        error: 'Cannot delete zone with existing revenue records. Reassign them first.',
      });
    }

    const userCountRes = await query('SELECT COUNT(*) FROM users WHERE assigned_zone_id = $1', [id]);
    if (parseInt(userCountRes.rows[0].count, 10) > 0) {
      return res.status(400).json({
        error: 'Cannot delete zone assigned to active users. Reassign users first.',
      });
    }

    await query('DELETE FROM zones WHERE id = $1', [id]);
    res.json({ message: 'Zone deleted successfully' });
  } catch (err) {
    console.error('Error deleting zone:', err);
    res.status(500).json({ error: 'Failed to delete zone' });
  }
});

export default router;
