import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { handleValidation } from '../middleware/validate.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns a JWT
 */
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidation,
  auditLog('login', 'user'),
  async (req, res) => {
    try {
      const { username, password } = req.body;

      const result = await query(
        `SELECT u.id, u.username, u.email, u.password_hash, u.role, u.full_name,
                u.phone, u.assigned_zone_id, u.is_active, z.name as zone_name
         FROM users u
         LEFT JOIN zones z ON u.assigned_zone_id = z.id
         WHERE u.username = $1`,
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is deactivated. Please contact an administrator.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        process.env.JWT_SECRET || 'zebra-rms-secret-key-2026',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Don't send password hash back
      delete user.password_hash;

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          phone: user.phone,
          assigned_zone_id: user.assigned_zone_id,
          zone_name: user.zone_name,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  }
);

/**
 * GET /api/auth/me
 * Returns current authenticated user information
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.email, u.role, u.full_name,
              u.phone, u.assigned_zone_id, u.is_active, z.name as zone_name
       FROM users u
       LEFT JOIN zones z ON u.assigned_zone_id = z.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Fetch user error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, auditLog('logout', 'user'), (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
