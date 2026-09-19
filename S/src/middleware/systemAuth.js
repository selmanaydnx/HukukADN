const { getDb } = require('../database/db');

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [name, ...rest] = part.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  }
  return cookies;
}

function requireSystemAuth(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies['adn_system_session'];

  if (!sessionId) {
    return res.status(401).json({ error: 'Sistem yöneticisi oturumu bulunamadı. Lütfen /system üzerinden giriş yapın.' });
  }

  const db = getDb();
  try {
    const session = db.prepare(`
      SELECT * FROM system_sessions 
      WHERE id = ? AND expires_at > datetime('now');
    `).get(sessionId);

    if (!session) {
      // Çerez süresi dolmuş veya geçersiz
      res.setHeader('Set-Cookie', 'adn_system_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');
      return res.status(401).json({ error: 'Sistem oturumunun süresi dolmuş. Yeniden giriş yapın.' });
    }

    req.systemUser = {
      username: session.username,
      sessionId: session.id,
      ip: session.ip_address
    };

    if (typeof next === 'function') {
      return next();
    }
  } catch (err) {
    console.error('System Auth Middleware Error:', err);
    return res.status(500).json({ error: 'Yetkilendirme denetimi sırasında hata oluştu.' });
  }
}

module.exports = {
  requireSystemAuth,
  parseCookies
};
