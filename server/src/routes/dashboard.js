import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Overview counts and status breakdowns
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const isCollector = req.user.role === 'collector';
    const userFilter = isCollector ? 'WHERE created_by = $1' : '';
    const userParams = isCollector ? [req.user.id] : [];

    const statsSql = `
      SELECT
        COUNT(*)::int as total_records,
        COUNT(CASE WHEN status = 'approved' THEN 1 END)::int as approved_count,
        COUNT(CASE WHEN status = 'reviewed' THEN 1 END)::int as reviewed_count,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END)::int as submitted_count,
        COUNT(CASE WHEN status = 'submitted' OR status = 'reviewed' THEN 1 END)::int as pending_count,
        COUNT(CASE WHEN status = 'draft' THEN 1 END)::int as draft_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int as rejected_count,
        COUNT(CASE WHEN status = 'flagged' THEN 1 END)::int as flagged_count,
        COUNT(CASE WHEN module = 'property' THEN 1 END)::int as property_count,
        COUNT(CASE WHEN module = 'business' THEN 1 END)::int as business_count,
        COUNT(CASE WHEN module = 'market_stall' THEN 1 END)::int as market_stall_count,
        ROUND(AVG(accuracy_m)::numeric, 1) as avg_accuracy_m
      FROM records
      ${userFilter};
    `;

    const statsRes = await query(statsSql, userParams);

    const zonesRes = await query('SELECT COUNT(*)::int as total_zones FROM zones;');
    const usersRes = await query('SELECT COUNT(*)::int as total_users FROM users WHERE is_active = true;');

    res.json({
      ...statsRes.rows[0],
      total_zones: zonesRes.rows[0].total_zones,
      total_users: usersRes.rows[0].total_users,
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

/**
 * GET /api/dashboard/coverage
 * Zone coverage analysis comparing captured records against target counts
 */
router.get('/coverage', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT
         z.id as zone_id,
         z.name as zone_name,
         z.code as zone_code,
         z.target_count,
         COUNT(r.id)::int as record_count,
         COUNT(CASE WHEN r.status = 'approved' THEN 1 END)::int as approved_count,
         ROUND(
           CASE WHEN z.target_count > 0
             THEN (COUNT(r.id)::numeric / z.target_count::numeric) * 100
             ELSE 0
           END, 1
         ) as coverage_pct,
         ST_AsGeoJSON(z.boundary)::json as boundary_geojson
       FROM zones z
       LEFT JOIN records r ON z.id = r.zone_id
       GROUP BY z.id
       ORDER BY record_count DESC;`
    );

    res.json({ coverage: result.rows });
  } catch (err) {
    console.error('Error fetching coverage stats:', err);
    res.status(500).json({ error: 'Failed to fetch coverage data' });
  }
});

/**
 * GET /api/dashboard/collector-stats
 * Productivity metrics per collector
 */
router.get('/collector-stats', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT
         u.id as user_id,
         u.full_name,
         u.username,
         z.name as assigned_zone_name,
         COUNT(r.id)::int as total_records,
         COUNT(CASE WHEN r.created_at >= CURRENT_DATE THEN 1 END)::int as records_today,
         COUNT(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::int as records_last_7_days,
         ROUND(AVG(r.accuracy_m)::numeric, 1) as avg_accuracy_m,
         COUNT(CASE WHEN r.status = 'rejected' THEN 1 END)::int as rejected_count,
         ROUND(
           CASE WHEN COUNT(r.id) > 0
             THEN (COUNT(CASE WHEN r.status = 'rejected' THEN 1 END)::numeric / COUNT(r.id)::numeric) * 100
             ELSE 0
           END, 1
         ) as rejection_rate_pct
       FROM users u
       LEFT JOIN zones z ON u.assigned_zone_id = z.id
       LEFT JOIN records r ON u.id = r.created_by
       WHERE u.role = 'collector' AND u.is_active = true
       GROUP BY u.id, z.name
       ORDER BY total_records DESC;`
    );

    res.json({ collectors: result.rows });
  } catch (err) {
    console.error('Error fetching collector stats:', err);
    res.status(500).json({ error: 'Failed to fetch collector stats' });
  }
});

/**
 * GET /api/dashboard/recent-activity
 * Recent actions logged in the system
 */
router.get('/recent-activity', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT
         a.id,
         a.action,
         a.entity_type,
         a.entity_id,
         a.created_at,
         u.full_name as user_name,
         u.role as user_role
       FROM audit_log a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 20;`
    );

    res.json({ activity: result.rows });
  } catch (err) {
    console.error('Error fetching recent activity:', err);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

export default router;
