const { getDb } = require('../database/db');
const { generateId, generateToken } = require('../utils/crypto');
const { logAudit } = require('../utils/audit');

function getTenantSettings(req, res) {
  const db = getDb();
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Büro bulunamadı.' });

  const members = db.prepare(`
    SELECT tm.id AS membership_id, tm.role, tm.created_at,
           u.id AS user_id, u.full_name, u.email, u.bar_city, u.bar_number
    FROM tenant_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.tenant_id = ?
  `).all(req.tenantId);

  const invitations = db.prepare(`
    SELECT id, email, role, expires_at, used, created_at
    FROM invitations
    WHERE tenant_id = ? AND used = 0 AND expires_at > datetime('now')
  `).all(req.tenantId);

  return res.json({ tenant, members, invitations });
}

function updateTenantSettings(req, res) {
  const { name, city, phone, email, aiExternalAllowed } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE tenants
    SET name = COALESCE(?, name),
        city = COALESCE(?, city),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        ai_external_allowed = COALESCE(?, ai_external_allowed)
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    city ? city.trim() : null,
    phone || null,
    email || null,
    aiExternalAllowed !== undefined ? (aiExternalAllowed ? 1 : 0) : null,
    req.tenantId
  );

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'update',
    entityType: 'tenant_settings',
    entityId: req.tenantId,
    details: 'Büro ayarları güncellendi',
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({ message: 'Büro ayarları kaydedildi.' });
}

function inviteMember(req, res) {
  const { email, role = 'lawyer' } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Davet edilecek e-posta adresi zorunludur.' });
  }

  const validRoles = ['manager', 'lawyer', 'assistant', 'finance'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Geçersiz rol.' });
  }

  const emailClean = email.trim().toLowerCase();
  const db = getDb();

  const id = generateId('inv');
  const token = generateToken(16);
  // 72 hours expiry
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO invitations (id, tenant_id, email, role, token, expires_at, used, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `).run(id, req.tenantId, emailClean, role, token, expiresAt);

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'invite',
    entityType: 'tenant_member',
    entityId: id,
    details: `Davet oluşturuldu: ${emailClean} (${role})`,
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.status(201).json({
    message: 'Davet oluşturuldu.',
    invitation: { id, email: emailClean, role, token, expiresAt }
  });
}

function removeMember(req, res) {
  const { userId } = req.params;
  const db = getDb();

  // Cannot remove owner or self if only owner
  const member = db.prepare('SELECT role FROM tenant_members WHERE tenant_id = ? AND user_id = ?').get(req.tenantId, userId);
  if (!member) {
    return res.status(404).json({ error: 'Üye bulunamadı.' });
  }

  if (member.role === 'owner') {
    return res.status(400).json({ error: 'Büro sahibi çalışma alanından çıkarılamaz.' });
  }

  db.prepare('DELETE FROM tenant_members WHERE tenant_id = ? AND user_id = ?').run(req.tenantId, userId);
  // Invalidate any active sessions for this user on this tenant
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND tenant_id = ?').run(userId, req.tenantId);

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'remove_member',
    entityType: 'tenant_member',
    entityId: userId,
    details: 'Ekip üyesi bürodan çıkarıldı',
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({ message: 'Ekip üyesi çalışma alanından çıkarıldı.' });
}

function listAuditLogs(req, res) {
  const db = getDb();
  const logs = db.prepare(`
    SELECT a.*, u.full_name AS user_name, u.email AS user_email
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.tenant_id = ?
    ORDER BY a.created_at DESC
    LIMIT 100
  `).all(req.tenantId);

  return res.json({ logs });
}

function exportTenantData(req, res) {
  const db = getDb();
  const cases = db.prepare('SELECT * FROM cases WHERE tenant_id = ?').all(req.tenantId);
  const clients = db.prepare('SELECT * FROM clients WHERE tenant_id = ?').all(req.tenantId);
  const events = db.prepare('SELECT * FROM events WHERE tenant_id = ?').all(req.tenantId);
  const tasks = db.prepare('SELECT * FROM tasks WHERE tenant_id = ?').all(req.tenantId);
  const finances = db.prepare('SELECT * FROM financial_records WHERE tenant_id = ?').all(req.tenantId);

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'export',
    entityType: 'tenant_data',
    entityId: req.tenantId,
    details: 'Tüm büro verileri KVKK taşınabilirlik kapsamında dışa aktarıldı',
    ipAddress: req.socket.remoteAddress || ''
  });

  res.setHeader('Content-Disposition', `attachment; filename="adn_buro_verileri_${new Date().toISOString().split('T')[0]}.json"`);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  return res.json({
    exportDate: new Date().toISOString(),
    tenantId: req.tenantId,
    data: { cases, clients, events, tasks, finances }
  });
}

module.exports = {
  getTenantSettings,
  updateTenantSettings,
  inviteMember,
  removeMember,
  listAuditLogs,
  exportTenantData
};
