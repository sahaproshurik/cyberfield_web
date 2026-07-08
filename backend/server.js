const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log("--- DEBUG START ---");
console.log("Current Directory:", __dirname);
console.log("Loaded DB_USER:", process.env.DB_USER);
console.log("--- DEBUG END ---");
const express      = require('express');
const cors         = require('cors');

const contactRoutes = require('./routes/contact');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5500',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────
app.use('/api/contact', contactRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Внутрішня помилка сервера' });
});

// ── Start ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});