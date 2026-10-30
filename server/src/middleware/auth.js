import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

/**
 * Express middleware that verifies a JWT from the Authorization header
 * and attaches the decoded user payload to `req.user`.
 *
 * Expected header format: `Authorization: Bearer <token>`
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No valid authorization token provided',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is not valid.',
      });
    }

    // Verify user still exists and is active
    const result = await query(
      'SELECT id, username, role, full_name, assigned_zone_id, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: 'The user associated with this token no longer exists.',
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Contact an administrator.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An internal error occurred during authentication.',
    });
  }
}

/**
 * Express middleware factory that restricts access to users whose role
 * is included in the allowed roles list.
 *
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'supervisor')
 * @returns {import('express').RequestHandler} Authorization middleware
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to access this resource.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
}
