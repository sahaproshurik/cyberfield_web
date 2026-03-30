const jwt = require('jsonwebtoken');

// Verifies JWT from Authorization header or cookie
function authMiddleware(req, res, next) {
  try {
    // Support: "Authorization: Bearer <token>" OR httpOnly cookie
    let token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return res.status(401).json({ error: 'Не авторизовано' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Токен недійсний або прострочений' });
  }
}

// Optional auth — sets req.user if token present but doesn't block
function optionalAuth(req, res, next) {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);
    if (token) req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_) {}
  next();
}

// Admin-only guard (use after authMiddleware)
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Тільки для адміністраторів' });
  }
  next();
}

module.exports = { authMiddleware, optionalAuth, adminOnly };