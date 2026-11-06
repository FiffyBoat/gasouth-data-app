/**
 * Single-service production server setup for Render (Serves API + React frontend dist)
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import recordsRoutes from './routes/records.js';
import photosRoutes from './routes/photos.js';
import zonesRoutes from './routes/zones.js';
import usersRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import importRoutes from './routes/import.js';
import { query } from './config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Upload directory setup (canonical server/uploads + root/uploads support)
const serverUploadDir = path.resolve(__dirname, '../uploads');
const cwdUploadDir = path.resolve(process.cwd(), 'uploads');
const configuredUploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : null;

// Primary upload directory to save incoming files
export const uploadDir = configuredUploadDir || (fs.existsSync(serverUploadDir) ? serverUploadDir : cwdUploadDir);

// Ensure folders exist with thumbnails subfolder
[serverUploadDir, cwdUploadDir, uploadDir].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const thumbs = path.join(dir, 'thumbnails');
    if (!fs.existsSync(thumbs)) fs.mkdirSync(thumbs, { recursive: true });
  } catch (err) {
    console.warn('Could not initialize upload folder:', dir, err.message);
  }
});

// Security & utility middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Allows Leaflet tiles and OSM layers on client
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Serve static uploads from all possible locations
app.use('/uploads', express.static(serverUploadDir, { maxAge: '1d', fallthrough: true }));
app.use('/uploads', express.static(cwdUploadDir, { maxAge: '1d', fallthrough: true }));
if (configuredUploadDir) {
  app.use('/uploads', express.static(configuredUploadDir, { maxAge: '1d', fallthrough: true }));
}

// Fallback upload resolver: serve from DB data_url when file no longer on disk
// (Render ephemeral disk wipes uploads on each deploy — data_url in DB persists)
app.get('/uploads/*', async (req, res, next) => {
  const relPath = req.params[0];
  const candidates = [
    path.join(serverUploadDir, relPath),
    path.join(cwdUploadDir, relPath),
    configuredUploadDir ? path.join(configuredUploadDir, relPath) : null,
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return res.sendFile(p);
    }
  }

  // File not on disk — try to serve from data_url stored in DB
  try {
    const filename = path.basename(relPath);
    const dbRes = await query(
      `SELECT data_url, mime_type FROM photos
       WHERE file_path LIKE $1 OR thumbnail_path LIKE $1
       LIMIT 1`,
      [`%${filename}%`]
    );
    const row = dbRes.rows[0];
    if (row?.data_url) {
      const commaIdx = row.data_url.indexOf(',');
      const b64 = commaIdx !== -1 ? row.data_url.slice(commaIdx + 1) : row.data_url;
      const buf = Buffer.from(b64, 'base64');
      res.setHeader('Content-Type', row.mime_type || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buf);
    }
  } catch (dbErr) {
    console.warn('DB data_url fallback failed:', dbErr.message);
  }

  res.status(404).json({ error: 'Photo not found on server storage' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Ga South Municipal Assembly DCS API',
    version: '1.0.0',
  });
});

// Public stats endpoint — returns DB record counts & duplicate analysis (no auth required)
app.get('/api/health/stats', async (req, res) => {
  try {
    const countsResult = await query(`
      SELECT
        COUNT(*)                                              AS total,
        COUNT(*) FILTER (WHERE status = 'draft')             AS draft,
        COUNT(*) FILTER (WHERE status = 'submitted')         AS submitted,
        COUNT(*) FILTER (WHERE status = 'approved')          AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')          AS rejected,
        COUNT(*) FILTER (WHERE capture_method = 'imported')  AS imported,
        COUNT(*) FILTER (WHERE latitude IS NULL)             AS pending_gps,
        COUNT(DISTINCT attributes->>'bill_number')           AS unique_bill_numbers,
        COUNT(*) FILTER (WHERE attributes->>'bill_number' IS NOT NULL) AS records_with_bill_number
      FROM records
    `);

    // Check for duplicate bill numbers
    const dupResult = await query(`
      SELECT attributes->>'bill_number' AS bill_no, COUNT(*) AS occurrences
      FROM records
      WHERE attributes->>'bill_number' IS NOT NULL
      GROUP BY attributes->>'bill_number'
      HAVING COUNT(*) > 1
    `);

    res.json({
      timestamp: new Date().toISOString(),
      counts: countsResult.rows[0],
      duplicates: {
        duplicate_bill_groups: dupResult.rowCount,
        total_excess_records: dupResult.rows.reduce((sum, r) => sum + (parseInt(r.occurrences, 10) - 1), 0),
        sample_duplicates: dupResult.rows.slice(0, 5),
      },
    });
  } catch (err) {
    console.error('Stats query error:', err);
    res.status(500).json({ error: 'Failed to query stats' });
  }
});

// Endpoint to remove duplicate imported drafts, keeping only 1 copy per bill_number
app.post('/api/health/deduplicate', async (req, res) => {
  try {
    // Delete older duplicate records that share the same bill_number, keeping the highest/newest ID
    const deleteResult = await query(`
      DELETE FROM records
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY attributes->>'bill_number' ORDER BY created_at DESC, id DESC) as rn
          FROM records
          WHERE capture_method = 'imported' AND attributes->>'bill_number' IS NOT NULL
        ) t
        WHERE t.rn > 1
      )
      RETURNING id
    `);

    res.json({
      success: true,
      message: `Deduplication complete. Removed ${deleteResult.rowCount} duplicate records.`,
      removed_count: deleteResult.rowCount,
    });
  } catch (err) {
    console.error('Deduplicate error:', err);
    res.status(500).json({ error: 'Failed to deduplicate records' });
  }
});

// Endpoint to completely reset/wipe all records & photos (preserves users and zones)
app.post('/api/health/reset-records', async (req, res) => {
  try {
    await query(`DELETE FROM photos`);
    await query(`DELETE FROM record_versions`);
    await query(`DELETE FROM audit_log WHERE entity_type = 'record'`);
    const delResult = await query(`DELETE FROM records`);
    res.json({
      success: true,
      message: `Records reset complete. Removed ${delResult.rowCount} records. Users and zones preserved.`,
      records_removed: delResult.rowCount,
    });
  } catch (err) {
    console.error('Reset records error:', err);
    res.status(500).json({ error: 'Failed to reset records' });
  }
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/records', photosRoutes); // POST /api/records/:id/photos  +  DELETE /api/records/photos/:id
app.use('/api/zones', zonesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/records', importRoutes); // POST /api/records/import

// --- Serve React Client in Production ---
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // Catch-all route to serve index.html for client-side React Router
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // 404 handler for API routes when dist is absent (e.g. dev mode)
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
}

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid or missing authorization token' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`Ga South DCS Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===============================================`);
});

export default app;
