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
