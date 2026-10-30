import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateUser, handleValidation } from '../middleware/validate.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

/**
 * GET /api/users
 * List all users with zone assignments (admin only)
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await query(
      `SELECT
         u.id, u.username, u.email, u.role, u.full_name, u.phone,
         u.assigned_zone_id, z.name as zone_name, u.is_active,
         u.created_at, u.updated_at,
         COUNT(r.id)::int as records_captured
       FROM users u
       LEFT JOIN zones z ON u.assigned_zone_id = z.id
       LEFT JOIN records r ON u.id = r.created_by
       GROUP BY u.id, z.name
       ORDER BY u.created_at DESC;`
    );

    res.json({ users: result.rows });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/users/:id
 */
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT
         u.id, u.username, u.email, u.role, u.full_name, u.phone,
         u.assigned_zone_id, z.name as zone_name, u.is_active,
         u.created_at, u.updated_at
       FROM users u
       LEFT JOIN zones z ON u.assigned_zone_id = z.id
       WHERE u.id = $1;`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/users
 * Create a new user (admin only)
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateUser,
  handleValidation,
  auditLog('create', 'user'),
  async (req, res) => {
    try {
      const {
        username,
        email,
        password,
        role,
        full_name,
        phone,
        assigned_zone_id,
      } = req.body;

      // Check unique username
      const checkRes = await query('SELECT id FROM users WHERE username = $1', [username]);
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      const passwordHash = await bcrypt.hash(password || 'zebra123', 12);

      const insertSql = `
        INSERT INTO users (
          username, email, password_hash, role, full_name, phone, assigned_zone_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, username, email, role, full_name, phone, assigned_zone_id, is_active, created_at;
      `;

      const result = await query(insertSql, [
        username,
        email || null,
        passwordHash,
        role,
        full_name,
        phone || null,
        assigned_zone_id || null,
      ]);

      res.status(201).json({ user: result.rows[0] });
    } catch (err) {
      console.error('Error creating user:', err);
      res.status(500).json({ error: err.message || 'Failed to create user' });
    }
  }
);

/**
 * PUT /api/users/:id
 * Update an existing user (admin only)
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  auditLog('update', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { email, full_name, phone, role, assigned_zone_id, password } = req.body;

      const existingRes = await query('SELECT * FROM users WHERE id = $1', [id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      req._auditOldValues = existingRes.rows[0];

      let passwordUpdateSql = '';
      const params = [email || null, full_name, phone || null, role, assigned_zone_id || null, id];

      if (password && password.trim().length >= 6) {
        const hash = await bcrypt.hash(password, 12);
        passwordUpdateSql = ', password_hash = $7';
        params.push(hash);
      }

      const updateSql = `
        UPDATE users
        SET
          email = $1,
          full_name = $2,
          phone = $3,
          role = $4,
          assigned_zone_id = $5,
          updated_at = now()
          ${passwordUpdateSql}
        WHERE id = $6
        RETURNING id, username, email, role, full_name, phone, assigned_zone_id, is_active, updated_at;
      `;

      const result = await query(updateSql, params);
      res.json({ user: result.rows[0] });
    } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

/**
 * PATCH /api/users/:id/active
 * Toggle user active status (admin only)
 */
router.patch(
  '/:id/active',
  authenticate,
  authorize('admin'),
  auditLog('toggle_active', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active must be a boolean' });
      }

      // Prevent disabling yourself
      if (req.user.id === id && !is_active) {
        return res.status(400).json({ error: 'Cannot deactivate your own administrator account' });
      }

      const result = await query(
        `UPDATE users
         SET is_active = $1, updated_at = now()
         WHERE id = $2
         RETURNING id, username, is_active;`,
        [is_active, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: result.rows[0] });
    } catch (err) {
      console.error('Error changing user status:', err);
      res.status(500).json({ error: 'Failed to change user status' });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete a user account (admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  auditLog('delete', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent deleting yourself
      if (req.user.id === id) {
        return res.status(400).json({ error: 'Cannot delete your own administrator account' });
      }

      const existingRes = await query('SELECT * FROM users WHERE id = $1', [id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      req._auditOldValues = existingRes.rows[0];

      // Check if user has captured records
      const recordCountRes = await query('SELECT COUNT(*) FROM records WHERE created_by = $1', [id]);
      const recordCount = parseInt(recordCountRes.rows[0]?.count || 0, 10);
      if (recordCount > 0) {
        return res.status(400).json({
          error: `Cannot delete this user because they have captured ${recordCount} revenue record(s). Deactivate the account instead to preserve revenue audit trails.`,
        });
      }

      await query('DELETE FROM users WHERE id = $1', [id]);
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      console.error('Error deleting user:', err);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
);

export default router;
