const { getDb } = require('../database/db');

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });

  return list;
}

function requireAuth(req, res, next) {
  const cookies = parseCookies(req.headers['cookie']);
  const sessionId = cookies['adn_session'] || (req.headers['authorization']?.replace('Bearer ', '').trim());

  if (!sessionId) {
    return res.status(401).json({ error: 'Oturum bulunamadı. Lütfen giriş yapınız.' });
  }

  const db = getDb();
  const session = db.prepare(`
    SELECT s.id AS session_id, s.user_id, s.tenant_id, s.expires_at,
           u.full_name, u.email, u.bar_city, u.bar_number, u.is_verified_lawyer,
           t.name AS tenant_name, t.plan AS tenant_plan, t.status AS tenant_status, t.ai_external_allowed,
           tm.role AS user_role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN tenants t ON s.tenant_id = t.id
    LEFT JOIN tenant_members tm ON (tm.tenant_id = s.tenant_id AND tm.user_id = u.id)
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(sessionId);

  if (!session) {
    return res.status(401).json({ error: 'Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapınız.' });
  }

  if (session.tenant_status === 'suspended') {
    return res.status(403).json({
      error: 'Hukuk büronuzun çalışma alanı sistem yönetimi tarafından askıya alınmıştır. Lütfen ADN Sistem Yönetimi ile iletişime geçin.'
    });
  }

  req.session = {
    id: session.session_id,
    userId: session.user_id,
    tenantId: session.tenant_id,
    expiresAt: session.expires_at
  };

  req.user = {
    id: session.user_id,
    fullName: session.full_name,
    email: session.email,
    barCity: session.bar_city,
    barNumber: session.bar_number,
    isVerifiedLawyer: Boolean(session.is_verified_lawyer)
  };

  req.tenantId = session.tenant_id;
  req.tenant = {
    id: session.tenant_id,
    name: session.tenant_name,
    plan: session.tenant_plan,
    aiExternalAllowed: Boolean(session.ai_external_allowed)
  };

  req.userRole = session.user_role || 'viewer';

  next();
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({ error: 'Yetkisiz erişim: Büro üyeliği bulunamadı.' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        error: `Yetkiniz yetersiz. Bu işlem için gerekli roller: ${allowedRoles.join(', ')} (Mevcut rolünüz: ${req.userRole})`
      });
    }

    next();
  };
}

module.exports = {
  parseCookies,
  requireAuth,
  requireRole
};
