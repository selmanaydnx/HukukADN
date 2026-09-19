const { getDb } = require('../database/db');
const { generateId } = require('../utils/crypto');
const { logAudit } = require('../utils/audit');

function listClients(req, res) {
  const db = getDb();
  const search = req.query.q ? `%${req.query.q.trim()}%` : null;

  let query = `
    SELECT c.*, 
           (SELECT COUNT(*) FROM cases WHERE client_id = c.id AND tenant_id = c.tenant_id) AS active_cases_count
    FROM clients c
    WHERE c.tenant_id = ?
  `;
  const params = [req.tenantId];

  if (search) {
    query += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.identity_no LIKE ?)`;
    params.push(search, search, search, search);
  }

  query += ` ORDER BY c.created_at DESC`;

  const clients = db.prepare(query).all(...params);
  return res.json({ clients });
}

function getClient(req, res) {
  const db = getDb();
  const client = db.prepare(`SELECT * FROM clients WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);

  if (!client) {
    return res.status(404).json({ error: 'Müvekkil bulunamadı.' });
  }

  const cases = db.prepare(`
    SELECT id, internal_no, official_no, case_type, stage, status, opponent_name, claim_amount
    FROM cases
    WHERE client_id = ? AND tenant_id = ?
    ORDER BY created_at DESC
  `).all(client.id, req.tenantId);

  return res.json({ client, cases });
}

function createClient(req, res) {
  const { name, type = 'individual', identityNo, phone, email, address, notaryInfo, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Müvekkil adı / unvanı zorunludur.' });
  }

  const db = getDb();
  const clientId = generateId('cli');

  db.prepare(`
    INSERT INTO clients (id, tenant_id, type, name, identity_no, phone, email, address, notary_info, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(clientId, req.tenantId, type, name.trim(), identityNo || null, phone || null, email || null, address || null, notaryInfo || null, notes || null);

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'create',
    entityType: 'client',
    entityId: clientId,
    details: `Yeni müvekkil kaydedildi: ${name.trim()}`,
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.status(201).json({
    message: 'Müvekkil başarıyla oluşturuldu.',
    client: { id: clientId, name: name.trim(), type }
  });
}

function updateClient(req, res) {
  const { name, type, identityNo, phone, email, address, notaryInfo, notes } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM clients WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (!existing) {
    return res.status(404).json({ error: 'Müvekkil bulunamadı.' });
  }

  db.prepare(`
    UPDATE clients
    SET name = COALESCE(?, name),
        type = COALESCE(?, type),
        identity_no = COALESCE(?, identity_no),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        notary_info = COALESCE(?, notary_info),
        notes = COALESCE(?, notes)
    WHERE id = ? AND tenant_id = ?
  `).run(name ? name.trim() : null, type || null, identityNo || null, phone || null, email || null, address || null, notaryInfo || null, notes || null, req.params.id, req.tenantId);

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'update',
    entityType: 'client',
    entityId: req.params.id,
    details: 'Müvekkil bilgileri güncellendi',
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({ message: 'Müvekkil güncellendi.' });
}

function deleteClient(req, res) {
  const db = getDb();
  const casesCount = db.prepare('SELECT COUNT(*) AS count FROM cases WHERE client_id = ? AND tenant_id = ?').get(req.params.id, req.tenantId).count;

  if (casesCount > 0) {
    return res.status(400).json({ error: 'Bu müvekkile bağlı aktif dosyalar bulunmaktadır. Önce dosyaları arşivleyiniz veya siliniz.' });
  }

  const result = db.prepare('DELETE FROM clients WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Müvekkil bulunamadı.' });
  }

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'delete',
    entityType: 'client',
    entityId: req.params.id,
    details: 'Müvekkil silindi',
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({ message: 'Müvekkil silindi.' });
}

// Menfaat Çatışması Ön Kontrolü (Conflict of Interest check)
function checkConflict(req, res) {
  const name = req.query.name?.trim();
  if (!name || name.length < 2) {
    return res.json({ matches: [], notice: 'Arama için en az 2 karakter giriniz.' });
  }

  const db = getDb();
  const search = `%${name}%`;

  // Search existing clients and opponents within tenant
  const clientMatches = db.prepare(`
    SELECT id, name, 'muvekkil' AS match_type, NULL AS case_no
    FROM clients
    WHERE tenant_id = ? AND name LIKE ?
  `).all(req.tenantId, search);

  const opponentMatches = db.prepare(`
    SELECT c.id, c.opponent_name AS name, 'karsi_taraf' AS match_type, c.internal_no AS case_no, c.official_no
    FROM cases c
    WHERE c.tenant_id = ? AND c.opponent_name LIKE ?
  `).all(req.tenantId, search);

  const matches = [...clientMatches, ...opponentMatches];

  return res.json({
    hasConflict: matches.length > 0,
    matches,
    notice: 'Bu kontrol avukatın menfaat çatışması incelemesine yardımcı olmak amacıyla geçmiş dosya ve taraf kayıtlarını listeler. Kesin hukuki karar yerine geçmez.'
  });
}

module.exports = {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  checkConflict
};
