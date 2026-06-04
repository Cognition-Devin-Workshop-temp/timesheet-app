const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const db = require('./db');
const reportsRouter = require('./routes/reports');
const statsRouter = require('./routes/stats');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/reports', reportsRouter);
app.use('/api/stats', statsRouter);

// Serve frontend (catch-all for SPA routing)
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Garbage Tracker running on http://localhost:${PORT}`);
});

module.exports = app;
