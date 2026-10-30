import { query } from '../config/database.js';

/**
 * Creates an Express middleware that asynchronously logs actions to the
 * audit_log table after the response is sent. This ensures logging does
 * not block the HTTP response.
 *
 * @param {string} action - The action being performed (e.g. 'create', 'update', 'delete')
 * @param {string} entityType - The type of entity (e.g. 'record', 'user', 'zone')
 * @returns {import('express').RequestHandler} Audit logging middleware
 */
export function auditLog(action, entityType) {
  return (req, res, next) => {
    // Capture the original JSON method to intercept the response body
    const originalJson = res.json.bind(res);
    let responseBody = null;

    res.json = (body) => {
      responseBody = body;
      return originalJson(body);
    };

    // Log after the response finishes, so it doesn't block the client
    res.on('finish', () => {
      // Only log for successful responses (2xx status codes)
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return;
      }

      const userId = req.user ? req.user.id : null;
      const entityId = req.params.id || (responseBody && responseBody.id) || null;
      const ipAddress = req.ip || req.connection?.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;

      // Determine old/new values based on the action
      let oldValues = null;
      let newValues = null;

      if (action === 'create') {
        newValues = req.body || null;
      } else if (action === 'update' || action === 'status_change') {
        // old_values can be attached by route handlers before sending
        oldValues = req._auditOldValues || null;
        newValues = req.body || null;
      } else if (action === 'delete') {
        oldValues = req._auditOldValues || null;
      }

      // Fire-and-forget — do not await
      query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          action,
          entityType,
          entityId,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          ipAddress,
          userAgent ? userAgent.substring(0, 500) : null,
        ]
      ).catch((err) => {
        console.error('Audit log write failed:', err.message);
      });
    });

    next();
  };
}
