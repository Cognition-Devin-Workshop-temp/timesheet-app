const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const router = express.Router();

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

// GET /api/reports - List all reports with optional filters
router.get('/', (req, res) => {
  const { status, severity, limit = 100, offset = 0 } = req.query;

  let query = 'SELECT * FROM reports WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (severity) {
    query += ' AND severity = ?';
    params.push(severity);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const reports = db.prepare(query).all(...params);
  res.json({ success: true, data: reports, count: reports.length });
});

// GET /api/reports/:id - Get a single report
router.get('/:id', (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  const history = db.prepare(
    'SELECT * FROM status_history WHERE report_id = ? ORDER BY changed_at DESC'
  ).all(req.params.id);

  res.json({ success: true, data: { ...report, history } });
});

// POST /api/reports - Create a new report
router.post('/', upload.single('photo'), (req, res) => {
  const { latitude, longitude, address, description, severity, reporter_name, reporter_email } = req.body;

  if (!latitude || !longitude || !description) {
    return res.status(400).json({
      success: false,
      error: 'latitude, longitude, and description are required'
    });
  }

  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

  const stmt = db.prepare(`
    INSERT INTO reports (latitude, longitude, address, description, severity, photo_url, reporter_name, reporter_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    Number(latitude),
    Number(longitude),
    address || null,
    description,
    severity || 'medium',
    photo_url,
    reporter_name || null,
    reporter_email || null
  );

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(result.lastInsertRowid);

  // Record initial status
  db.prepare('INSERT INTO status_history (report_id, new_status, notes) VALUES (?, ?, ?)')
    .run(report.id, 'reported', 'Report created');

  res.status(201).json({ success: true, data: report });
});

// PATCH /api/reports/:id/status - Update report status
router.patch('/:id/status', (req, res) => {
  const { status, notes } = req.body;
  const validStatuses = ['reported', 'in_progress', 'cleaned', 'invalid'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `status must be one of: ${validStatuses.join(', ')}`
    });
  }

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  db.prepare('UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, req.params.id);

  db.prepare('INSERT INTO status_history (report_id, old_status, new_status, notes) VALUES (?, ?, ?, ?)')
    .run(req.params.id, report.status, status, notes || null);

  const updated = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// DELETE /api/reports/:id - Delete a report
router.delete('/:id', (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  db.prepare('DELETE FROM status_history WHERE report_id = ?').run(req.params.id);
  db.prepare('DELETE FROM reports WHERE id = ?').run(req.params.id);

  res.json({ success: true, message: 'Report deleted' });
});

module.exports = router;
