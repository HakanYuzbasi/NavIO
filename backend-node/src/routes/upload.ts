/**
 * File Upload Routes
 * Handle floor plan image uploads
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `floor-plan-${uniqueId}${ext}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept only image files
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

/**
 * POST /api/upload/floor-plan
 * Upload a floor plan image
 */
router.post('/floor-plan', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
        hint: 'Send a file with key "image" in multipart/form-data',
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;
    const originalName = req.file.originalname;

    console.log(`Uploaded floor plan: ${originalName} -> ${fileName}`);

    return res.status(200).json({
      success: true,
      file: {
        path: filePath,
        filename: fileName,
        originalName,
        url: `/uploads/${fileName}`,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
      message: 'Floor plan uploaded successfully',
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload file',
      details: error.message,
    });
  }
});

/**
 * GET /api/upload/list
 * List all uploaded floor plans
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const floorPlans = files
      .filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map((file) => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          url: `/uploads/${file}`,
          size: stats.size,
          uploadedAt: stats.mtime,
        };
      });

    res.json({
      count: floorPlans.length,
      files: floorPlans,
    });
  } catch (error: any) {
    console.error('List error:', error);
    res.status(500).json({
      error: 'Failed to list uploads',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/upload/:filename
 * Delete an uploaded file
 */
router.delete('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Deleted ${filename}`,
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      details: error.message,
    });
  }
});

export default router;
