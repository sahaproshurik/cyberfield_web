const path = require('path');
// На Render файлы из .env берутся из панели управления, но эту строчку оставляем для локалки
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log("--- DEBUG START ---");
console.log("Current Directory:", __dirname);
console.log("--- DEBUG END ---");

const express      = require('express');
const cors         = require('cors');

const contactRoutes = require('./routes/contact');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────
// НАСТРОЙКА CORS: Разрешаем запросы и с локалки, и с твоего GitHub Pages
app.use(cors({
  origin: [
    'http://localhost:63342',
    'http://localhost:5500',
    'https://sahaproshurik.github.io'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────

// Главный роут (GET /), чтобы Render при проверке и ты в браузере видели, что всё ок
app.get('/', (req, res) => {
  res.send('🚀 Сервер CyberField Net успешно запущен и работает!');
});

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
  console.log(`🚀 Server running on port ${PORT}`);
});