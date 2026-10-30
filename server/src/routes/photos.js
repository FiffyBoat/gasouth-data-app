import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const thumbnailsDir = path.join(uploadDir, 'thumbnails');

// Ensure upload folders exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extValid = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowed.test(file.mimetype);

  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
  },
  fileFilter,
});

/**
 * POST /api/records/:id/photos
 * Upload photos for a specific record (up to 4 per record)
 */
router.post(
  '/:id/photos',
  authenticate,
  upload.array('photos', 4),
  auditLog('upload_photos', 'record'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const recordRes = await query('SELECT * FROM records WHERE id = $1', [id]);
      if (recordRes.rows.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      const existingPhotosRes = await query(
        'SELECT COUNT(*) FROM photos WHERE record_id = $1',
        [id]
      );
      const existingCount = parseInt(existingPhotosRes.rows[0]?.count || 0, 10);

      if (existingCount + (req.files ? req.files.length : 0) > 4) {
        return res.status(400).json({ error: 'A record can have at most 4 photos' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No photos provided' });
      }

      const insertedPhotos = [];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const relativePath = `/uploads/${file.filename}`;
        let thumbnailPath = relativePath;

        // Try using sharp for thumbnail generation if available
        try {
          const sharp = (await import('sharp')).default;
          const thumbFilename = `thumb_${file.filename}`;
          const thumbFullPath = path.join(thumbnailsDir, thumbFilename);

          await sharp(file.path)
            .resize(200, 200, { fit: 'cover' })
            .toFile(thumbFullPath);

          thumbnailPath = `/uploads/thumbnails/${thumbFilename}`;
        } catch (sharpErr) {
          // Sharp might fail or not be installed in some environments; fallback gracefully
          console.warn('Sharp thumbnail generation skipped:', sharpErr.message);
        }

        const insertRes = await query(
          `INSERT INTO photos (
            record_id, file_path, thumbnail_path, original_name,
            size_bytes, mime_type, sort_order
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *;`,
          [
            id,
            relativePath,
            thumbnailPath,
            file.originalname,
            file.size,
            file.mimetype,
            existingCount + i,
          ]
        );

        insertedPhotos.push(insertRes.rows[0]);
      }

      res.status(201).json({ photos: insertedPhotos });
    } catch (err) {
      console.error('Error uploading photos:', err);
      res.status(500).json({ error: err.message || 'Failed to upload photos' });
    }
  }
);

/**
 * DELETE /api/photos/:id
 */
router.delete('/:id', authenticate, auditLog('delete_photo', 'photo'), async (req, res) => {
  try {
    const { id } = req.params;

    const photoRes = await query(
      `SELECT p.*, r.created_by, r.status
       FROM photos p
       JOIN records r ON p.record_id = r.id
       WHERE p.id = $1`,
      [id]
    );

    if (photoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photo = photoRes.rows[0];

    // Permissions: owner or supervisor+
    if (req.user.role === 'collector' && photo.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete photos on your own records' });
    }

    // Delete DB record
    await query('DELETE FROM photos WHERE id = $1', [id]);

    // Attempt to remove file from disk
    const mainFilePath = path.join(process.cwd(), photo.file_path);
    if (fs.existsSync(mainFilePath)) {
      try {
        fs.unlinkSync(mainFilePath);
      } catch (e) {
        console.warn('Could not delete file from disk:', e.message);
      }
    }

    res.json({ message: 'Photo deleted successfully' });
  } catch (err) {
    console.error('Error deleting photo:', err);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

export default router;
