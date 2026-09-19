const crypto = require('node:crypto');
const { getDb } = require('../database/db');
const { hashPassword, verifyPassword, generateId } = require('../utils/crypto');
const { logAudit } = require('../utils/audit');

function register(req, res) {
  const { fullName, email, password, officeName, planId, billingCycle, city, barCity, barNumber, termsAccepted } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Ad Soyad, E-posta ve Parola alanları zorunludur.' });
  }

  if (termsAccepted !== undefined && !termsAccepted) {
    return res.status(400).json({ error: 'Kullanım Koşulları ve Gizlilik Politikasını onaylamanız gerekmektedir.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Parola en az 8 karakter uzunluğunda olmalıdır.' });
  }

  const emailClean = email.trim().toLowerCase();
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailClean);
  if (existing) {
    return res.status(400).json({ error: 'Bu e-posta adresi ile kayıtlı bir hesap zaten mevcut.' });
  }

  const { salt, hash } = hashPassword(password);
  const userId = generateId('usr');

  // Insert user (email_verified initially 0 or 1 based on flow)
  db.prepare(`
    INSERT INTO users (id, full_name, email, password_hash, salt, bar_city, bar_number, is_verified_lawyer, email_verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, datetime('now'))
  `).run(userId, fullName.trim(), emailClean, hash, salt, barCity || null, barNumber || null);

  // Determine selected plan and billing cycle
  const selectedPlanId = (planId === 'pro' || planId === 'enterprise') ? planId : 'solo';
  const selectedCycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';

  // Create initial office workspace (tenant)
  const tenantId = generateId('ten');
  const tenantName = (officeName && officeName.trim()) || `${fullName.trim()} Hukuk Bürosu`;

  db.prepare(`
    INSERT INTO tenants (
      id, name, city, email, plan, plan_id, billing_cycle, status, 
      trial_ends_at, has_used_trial, created_at
    )
    VALUES (?, ?, ?, ?, 'office', ?, ?, 'trialing', datetime('now', '+14 days'), 0, datetime('now'))
  `).run(tenantId, tenantName, city || 'İstanbul', emailClean, selectedPlanId, selectedCycle);

  // Assign user as owner of the office
  const memberId = generateId('tmb');
  db.prepare(`
    INSERT INTO tenant_members (id, tenant_id, user_id, role, created_at)
    VALUES (?, ?, ?, 'owner', datetime('now'))
  `).run(memberId, tenantId, userId);

  // Generate Email Verification Token
  const verificationToken = crypto.randomBytes(24).toString('hex');
  const tokenId = generateId('vtok');
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO verification_tokens (id, user_id, type, token, expires_at, created_at)
    VALUES (?, ?, 'email_verify', ?, ?, datetime('now'))
  `).run(tokenId, userId, verificationToken, verifyExpires);

  // Create session (7 days)
  const sessionId = generateId('ses');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';

  db.prepare(`
    INSERT INTO sessions (id, user_id, tenant_id, user_agent, ip_address, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(sessionId, userId, tenantId, ua, ip, expiresAt);

  // Set secure session cookie
  res.setHeader('Set-Cookie', `adn_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`);

  logAudit({
    tenantId,
    userId,
    action: 'register',
    entityType: 'auth',
    entityId: userId,
    details: `Yeni hesap ve büro çalışma alanı oluşturuldu (${tenantName} - Paket: ${selectedPlanId})`,
    ipAddress: ip
  });

  return res.status(201).json({
    message: 'Kayıt başarılı. Çalışma alanınız hazırlandı.',
    user: { id: userId, fullName, email: emailClean, emailVerified: false },
    tenant: { id: tenantId, name: tenantName, role: 'owner', planId: selectedPlanId, billingCycle: selectedCycle },
    verificationToken,
    verificationUrl: `/giris?verify_token=${verificationToken}`
  });
}

function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-posta ve parola gereklidir.' });
  }

  const emailClean = email.trim().toLowerCase();
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailClean);

  if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
    if (req.recordFailedAuth) req.recordFailedAuth();
    return res.status(401).json({ error: 'E-posta veya parola hatalı.' });
  }

  if (req.resetAuthAttempts) req.resetAuthAttempts();

  // Find user's tenant
  const membership = db.prepare(`
    SELECT tm.tenant_id, tm.role, t.name AS tenant_name, t.status AS tenant_status
    FROM tenant_members tm
    JOIN tenants t ON tm.tenant_id = t.id
    WHERE tm.user_id = ?
    ORDER BY tm.created_at ASC LIMIT 1
  `).get(user.id);

  if (membership && membership.tenant_status === 'suspended') {
    return res.status(403).json({
      error: 'Hukuk büronuzun çalışma alanı sistem yönetimi tarafından askıya alınmıştır. Lütfen ADN Sistem Yönetimi ile iletişime geçin.'
    });
  }

  let tenantId = membership ? membership.tenant_id : null;
  let tenantName = membership ? membership.tenant_name : '';
  let role = membership ? membership.role : 'viewer';

  // If user has no tenant, create a personal workspace
  if (!tenantId) {
    tenantId = generateId('ten');
    tenantName = `${user.full_name} Hukuk Bürosu`;
    db.prepare(`INSERT INTO tenants (id, name, plan, created_at) VALUES (?, ?, 'individual', datetime('now'))`).run(tenantId, tenantName);
    db.prepare(`INSERT INTO tenant_members (id, tenant_id, user_id, role, created_at) VALUES (?, ?, ?, 'owner', datetime('now'))`).run(generateId('tmb'), tenantId, user.id);
    role = 'owner';
  }

  // Create session
  const sessionId = generateId('ses');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';

  db.prepare(`
    INSERT INTO sessions (id, user_id, tenant_id, user_agent, ip_address, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(sessionId, user.id, tenantId, ua, ip, expiresAt);

  res.setHeader('Set-Cookie', `adn_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`);

  logAudit({
    tenantId,
    userId: user.id,
    action: 'login',
    entityType: 'auth',
    entityId: user.id,
    details: 'Başarılı oturum açıldı',
    ipAddress: ip
  });

  return res.json({
    message: 'Giriş başarılı.',
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      barCity: user.bar_city,
      barNumber: user.bar_number,
      isVerifiedLawyer: Boolean(user.is_verified_lawyer)
    },
    tenant: { id: tenantId, name: tenantName, role }
  });
}

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

function logout(req, res) {
  const cookies = parseCookies(req);
  const sessionId = (req.session && req.session.id) || cookies['adn_session'];
  
  if (sessionId) {
    const db = getDb();
    const sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);

    if (sess) {
      logAudit({
        tenantId: sess.tenant_id,
        userId: sess.user_id,
        action: 'logout',
        entityType: 'auth',
        entityId: sess.user_id,
        details: 'Oturum kapatıldı',
        ipAddress: req.socket.remoteAddress || ''
      });
    }
  }

  res.setHeader('Set-Cookie', 'adn_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return res.json({ message: 'Başarıyla çıkış yapıldı.' });
}

function getProfile(req, res) {
  const db = getDb();
  const tenants = db.prepare(`
    SELECT t.id, t.name, t.city, t.plan, tm.role
    FROM tenant_members tm
    JOIN tenants t ON tm.tenant_id = t.id
    WHERE tm.user_id = ?
  `).all(req.user.id);

  return res.json({
    user: req.user,
    currentTenant: req.tenant,
    currentRole: req.userRole,
    tenants
  });
}

function updateProfile(req, res) {
  const { fullName, barCity, barNumber } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE users
    SET full_name = COALESCE(?, full_name),
        bar_city = COALESCE(?, bar_city),
        bar_number = COALESCE(?, bar_number)
    WHERE id = ?
  `).run(fullName || null, barCity || null, barNumber || null, req.user.id);

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'update',
    entityType: 'user_profile',
    entityId: req.user.id,
    details: 'Profil bilgileri güncellendi',
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({ message: 'Profil güncellendi.' });
}

function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Mevcut parola ve en az 8 karakterli yeni parola gereklidir.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(req.user.id);

  if (!verifyPassword(currentPassword, user.salt, user.password_hash)) {
    return res.status(400).json({ error: 'Mevcut parolanız hatalı.' });
  }

  const { salt, hash } = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, req.user.id);

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'change_password',
    entityType: 'auth',
    entityId: req.user.id,
    details: 'Parola değiştirildi',
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({ message: 'Parolanız başarıyla güncellendi.' });
}

function switchTenant(req, res) {
  const { targetTenantId } = req.body;
  if (!targetTenantId) {
    return res.status(400).json({ error: 'Hedef çalışma alanı belirtilmedi.' });
  }

  const db = getDb();
  const membership = db.prepare(`
    SELECT tm.role, t.name
    FROM tenant_members tm
    JOIN tenants t ON tm.tenant_id = t.id
    WHERE tm.tenant_id = ? AND tm.user_id = ?
  `).get(targetTenantId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'Bu çalışma alanına erişim yetkiniz bulunmamaktadır.' });
  }

  db.prepare('UPDATE sessions SET tenant_id = ? WHERE id = ?').run(targetTenantId, req.session.id);

  logAudit({
    tenantId: targetTenantId,
    userId: req.user.id,
    action: 'switch_tenant',
    entityType: 'auth',
    entityId: targetTenantId,
    details: `Çalışma alanı değiştirildi: ${membership.name}`,
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({
    message: 'Çalışma alanı değiştirildi.',
    tenant: { id: targetTenantId, name: membership.name, role: membership.role }
  });
}

function verifyEmail(req, res) {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Doğrulama belirteci (token) gereklidir.' });
  }

  const db = getDb();
  const tokenRecord = db.prepare(`
    SELECT * FROM verification_tokens 
    WHERE token = ? AND type = 'email_verify' AND used = 0
  `).get(token);

  if (!tokenRecord) {
    return res.status(400).json({ error: 'Doğrulama bağlantısı geçersiz veya daha önce kullanılmış.' });
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Doğrulama bağlantısının süresi dolmuş. Lütfen yeni bir doğrulama bağlantısı talep edin.' });
  }

  db.prepare('UPDATE verification_tokens SET used = 1 WHERE id = ?').run(tokenRecord.id);
  db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(tokenRecord.user_id);

  const user = db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(tokenRecord.user_id);

  logAudit({
    tenantId: 'system',
    userId: tokenRecord.user_id,
    action: 'verify_email',
    entityType: 'auth',
    entityId: tokenRecord.user_id,
    details: 'E-posta adresi başarıyla doğrulandı',
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({
    message: 'E-posta adresiniz başarıyla doğrulandı. Sisteme giriş yapabilirsiniz.',
    user
  });
}

function resendVerification(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'E-posta adresi gereklidir.' });
  }

  const emailClean = email.trim().toLowerCase();
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailClean);

  if (!user) {
    return res.json({ message: 'Kayıtlı e-posta adresine doğrulama bağlantısı gönderildi.' });
  }

  if (user.email_verified) {
    return res.status(400).json({ error: 'Bu e-posta adresi zaten doğrulanmıştır.' });
  }

  db.prepare(`UPDATE verification_tokens SET used = 1 WHERE user_id = ? AND type = 'email_verify'`).run(user.id);

  const token = crypto.randomBytes(24).toString('hex');
  const tokenId = generateId('vtok');
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO verification_tokens (id, user_id, type, token, expires_at, created_at)
    VALUES (?, ?, 'email_verify', ?, ?, datetime('now'))
  `).run(tokenId, user.id, token, verifyExpires);

  return res.json({
    message: 'Yeni doğrulama bağlantısı oluşturuldu.',
    verificationToken: token,
    verificationUrl: `/giris?verify_token=${token}`
  });
}

function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'E-posta adresi gereklidir.' });
  }

  const emailClean = email.trim().toLowerCase();
  const db = getDb();
  const user = db.prepare('SELECT id, full_name, email FROM users WHERE email = ?').get(emailClean);

  if (!user) {
    return res.json({ message: 'Kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi.' });
  }

  db.prepare(`UPDATE verification_tokens SET used = 1 WHERE user_id = ? AND type = 'password_reset'`).run(user.id);

  const resetToken = crypto.randomBytes(24).toString('hex');
  const tokenId = generateId('vtok');
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO verification_tokens (id, user_id, type, token, expires_at, created_at)
    VALUES (?, ?, 'password_reset', ?, ?, datetime('now'))
  `).run(tokenId, user.id, resetToken, resetExpires);

  logAudit({
    tenantId: 'system',
    userId: user.id,
    action: 'forgot_password',
    entityType: 'auth',
    entityId: user.id,
    details: 'Şifre sıfırlama bağlantısı talep edildi',
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({
    message: 'Şifre sıfırlama bağlantısı oluşturuldu.',
    resetToken,
    resetUrl: `/sifremi-unuttum?token=${resetToken}`
  });
}

function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Sıfırlama belirteci ve yeni parola gereklidir.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Yeni parola en az 8 karakter uzunluğunda olmalıdır.' });
  }

  const db = getDb();
  const tokenRecord = db.prepare(`
    SELECT * FROM verification_tokens 
    WHERE token = ? AND type = 'password_reset' AND used = 0
  `).get(token);

  if (!tokenRecord) {
    return res.status(400).json({ error: 'Şifre sıfırlama bağlantısı geçersiz veya daha önce kullanılmış.' });
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Şifre sıfırlama bağlantısının süresi dolmuş. Lütfen yeniden talep edin.' });
  }

  const { salt, hash } = hashPassword(newPassword);

  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, tokenRecord.user_id);
  db.prepare('UPDATE verification_tokens SET used = 1 WHERE id = ?').run(tokenRecord.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(tokenRecord.user_id);

  logAudit({
    tenantId: 'system',
    userId: tokenRecord.user_id,
    action: 'reset_password',
    entityType: 'auth',
    entityId: tokenRecord.user_id,
    details: 'Parola sıfırlama bağlantısı ile parola güncellendi ve tüm oturumlar sonlandırıldı',
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({ message: 'Parolanız başarıyla güncellendi. Yeni parolanızla giriş yapabilirsiniz.' });
}

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  switchTenant,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword
};
