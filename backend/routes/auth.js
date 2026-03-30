const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// ── Rate limiters ──────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Забагато спроб входу. Спробуй за 15 хвилин.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Забагато реєстрацій з цього IP.' },
});

// ── Helpers ────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function setCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// ── POST /api/auth/register ────────────────────────
router.post(
  '/register',
  registerLimiter,
  [
    body('first_name').trim().notEmpty().withMessage("Ім'я обов'язкове"),
    body('last_name').trim().notEmpty().withMessage("Прізвище обов'язкове"),
    body('email').isEmail().normalizeEmail().withMessage('Невірний email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Пароль мінімум 8 символів'),
  ],
  async (req, res) => {
    // Validate
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, email, password, phone, course_interest } = req.body;

    try {
      // Check if email already taken
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Цей email вже зареєстровано' });
      }

      // Hash password
      const hash = await bcrypt.hash(password, 12);

      // Insert user
      const { rows } = await pool.query(
        `INSERT INTO users (first_name, last_name, email, phone, password, course_interest)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, first_name, last_name, email, role, created_at`,
        [first_name, last_name, email, phone || null, hash, course_interest || null]
      );

      const user  = rows[0];
      const token = signToken(user);
      setCookie(res, token);

      res.status(201).json({
        message: 'Реєстрація успішна',
        token,
        user: {
          id:         user.id,
          first_name: user.first_name,
          last_name:  user.last_name,
          email:      user.email,
          role:       user.role,
        },
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Помилка сервера' });
    }
  }
);

// ── POST /api/auth/login ───────────────────────────
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Невірний email'),
    body('password').notEmpty().withMessage('Введи пароль'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Find user
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Невірний email або пароль' });
      }

      const user = rows[0];

      // Check password
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Невірний email або пароль' });
      }

      const token = signToken(user);
      setCookie(res, token);

      res.json({
        message: 'Вхід успішний',
        token,
        user: {
          id:         user.id,
          first_name: user.first_name,
          last_name:  user.last_name,
          email:      user.email,
          role:       user.role,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Помилка сервера' });
    }
  }
);

// ── POST /api/auth/logout ──────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Вийшов успішно' });
});

// ── GET /api/auth/me ───────────────────────────────
// Returns current user info (requires valid token)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, first_name, last_name, email, phone, role, course_interest, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Користувача не знайдено' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;