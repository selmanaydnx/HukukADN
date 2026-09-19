const { getDb } = require('../database/db');
const { generateId } = require('../utils/crypto');
const { logAudit } = require('../utils/audit');

function listCases(req, res) {
  const db = getDb();
  const { status, type, stage, q } = req.query;

  let query = `
    SELECT c.*, cl.name AS client_name, cl.phone AS client_phone,
           u.full_name AS assigned_lawyer_name,
           (SELECT COUNT(*) FROM events WHERE case_id = c.id AND tenant_id = c.tenant_id) AS events_count,
           (SELECT COUNT(*) FROM documents WHERE case_id = c.id AND tenant_id = c.tenant_id) AS documents_count,
           (SELECT COALESCE(SUM(amount), 0) FROM financial_records WHERE case_id = c.id AND tenant_id = c.tenant_id AND record_type = 'collection') AS total_collected
    FROM cases c
    JOIN clients cl ON c.client_id = cl.id
    LEFT JOIN users u ON c.assigned_lawyer_id = u.id
    WHERE c.tenant_id = ?
  `;
  const params = [req.tenantId];

  if (status) {
    query += ` AND c.status = ?`;
    params.push(status);
  }

  if (type) {
    query += ` AND c.case_type = ?`;
    params.push(type);
  }

  if (stage) {
    query += ` AND c.stage = ?`;
    params.push(stage);
  }

  if (q) {
    query += ` AND (c.internal_no LIKE ? OR c.official_no LIKE ? OR cl.name LIKE ? OR c.opponent_name LIKE ?)`;
    const search = `%${q.trim()}%`;
    params.push(search, search, search, search);
  }

  query += ` ORDER BY c.created_at DESC`;

  const cases = db.prepare(query).all(...params);
  return res.json({ cases });
}

function getCase(req, res) {
  const db = getDb();
  const caseItem = db.prepare(`
    SELECT c.*, cl.name AS client_name, cl.phone AS client_phone, cl.email AS client_email, cl.identity_no AS client_identity_no,
           u.full_name AS assigned_lawyer_name
    FROM cases c
    JOIN clients cl ON c.client_id = cl.id
    LEFT JOIN users u ON c.assigned_lawyer_id = u.id
    WHERE c.id = ? AND c.tenant_id = ?
  `).get(req.params.id, req.tenantId);

  if (!caseItem) {
    return res.status(404).json({ error: 'Dosya bulunamadı.' });
  }

  // Fetch events
  const events = db.prepare(`
    SELECT * FROM events
    WHERE case_id = ? AND tenant_id = ?
    ORDER BY event_date ASC
  `).all(caseItem.id, req.tenantId);

  // Fetch tasks
  const tasks = db.prepare(`
    SELECT t.*, u.full_name AS assigned_user_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_user_id = u.id
    WHERE t.case_id = ? AND t.tenant_id = ?
    ORDER BY t.due_date ASC
  `).all(caseItem.id, req.tenantId);

  // Fetch documents (only non-quarantined for general view)
  const documents = db.prepare(`
    SELECT id, title, file_name, file_size, mime_type, version, uploaded_by, created_at
    FROM documents
    WHERE case_id = ? AND tenant_id = ? AND is_quarantined = 0
    ORDER BY created_at DESC
  `).all(caseItem.id, req.tenantId);

  // Fetch financial summary
  const finance = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN record_type = 'fee' THEN amount ELSE 0 END), 0) AS agreed_fee,
      COALESCE(SUM(CASE WHEN record_type = 'collection' THEN amount ELSE 0 END), 0) AS total_collected,
      COALESCE(SUM(CASE WHEN record_type = 'advance' THEN amount ELSE 0 END), 0) AS total_advance,
      COALESCE(SUM(CASE WHEN record_type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
    FROM financial_records
    WHERE case_id = ? AND tenant_id = ?
  `).get(caseItem.id, req.tenantId);

  return res.json({
    case: caseItem,
    events,
    tasks,
    documents,
    finance
  });
}

function createCase(req, res) {
  const {
    clientId,
    internalNo,
    officialNo,
    caseType = 'dava',
    courtName,
    stage = 'dava_acildi',
    opponentName,
    opponentCounsel,
    claimAmount = 0,
    assignedLawyerId
  } = req.body;

  if (!clientId || !internalNo) {
    return res.status(400).json({ error: 'Müvekkil seçimi ve Büro Dosya Numarası zorunludur.' });
  }

  const db = getDb();
  // Verify client belongs to tenant
  const client = db.prepare('SELECT id FROM clients WHERE id = ? AND tenant_id = ?').get(clientId, req.tenantId);
  if (!client) {
    return res.status(400).json({ error: 'Geçersiz müvekkil seçildi.' });
  }

  const caseId = generateId('cas');

  db.prepare(`
    INSERT INTO cases (id, tenant_id, client_id, internal_no, official_no, case_type, court_name, stage, status, opponent_name, opponent_counsel, claim_amount, assigned_lawyer_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, datetime('now'))
  `).run(
    caseId,
    req.tenantId,
    clientId,
    internalNo.trim(),
    officialNo ? officialNo.trim() : null,
    caseType,
    courtName ? courtName.trim() : null,
    stage,
    opponentName ? opponentName.trim() : null,
    opponentCounsel ? opponentCounsel.trim() : null,
    parseFloat(claimAmount) || 0,
    assignedLawyerId || req.user.id
  );

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'create',
    entityType: 'case',
    entityId: caseId,
    details: `Yeni dosya açıldı: ${internalNo} (${caseType})`,
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.status(201).json({
    message: 'Dosya başarıyla açıldı.',
    caseId
  });
}

function updateCase(req, res) {
  const {
    internalNo,
    officialNo,
    caseType,
    courtName,
    stage,
    status,
    opponentName,
    opponentCounsel,
    claimAmount,
    assignedLawyerId
  } = req.body;

  const db = getDb();
  const existing = db.prepare('SELECT id FROM cases WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (!existing) {
    return res.status(404).json({ error: 'Dosya bulunamadı.' });
  }

  db.prepare(`
    UPDATE cases
    SET internal_no = COALESCE(?, internal_no),
        official_no = COALESCE(?, official_no),
        case_type = COALESCE(?, case_type),
        court_name = COALESCE(?, court_name),
        stage = COALESCE(?, stage),
        status = COALESCE(?, status),
        opponent_name = COALESCE(?, opponent_name),
        opponent_counsel = COALESCE(?, opponent_counsel),
        claim_amount = COALESCE(?, claim_amount),
        assigned_lawyer_id = COALESCE(?, assigned_lawyer_id)
    WHERE id = ? AND tenant_id = ?
  `).run(
    internalNo ? internalNo.trim() : null,
    officialNo ? officialNo.trim() : null,
    caseType || null,
    courtName ? courtName.trim() : null,
    stage || null,
    status || null,
    opponentName ? opponentName.trim() : null,
    opponentCounsel ? opponentCounsel.trim() : null,
    claimAmount !== undefined ? parseFloat(claimAmount) : null,
    assignedLawyerId || null,
    req.params.id,
    req.tenantId
  );

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'update',
    entityType: 'case',
    entityId: req.params.id,
    details: 'Dosya bilgileri güncellendi',
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({ message: 'Dosya güncellendi.' });
}

function archiveCase(req, res) {
  const db = getDb();
  const result = db.prepare(`
    UPDATE cases SET status = 'archived' WHERE id = ? AND tenant_id = ?
  `).run(req.params.id, req.tenantId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Dosya bulunamadı.' });
  }

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'archive',
    entityType: 'case',
    entityId: req.params.id,
    details: 'Dosya arşivlendi',
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({ message: 'Dosya arşivlendi.' });
}

function recordHearingNotes(req, res) {
  const db = getDb();
  const caseId = req.params.id;

  const caseItem = db.prepare('SELECT * FROM cases WHERE id = ? AND tenant_id = ?').get(caseId, req.tenantId);
  if (!caseItem) {
    return res.status(404).json({ error: 'Dava dosyası bulunamadı.' });
  }

  const { hearingResult, notes, nextHearingDate, deadlineDays, deadlineDescription } = req.body;

  let createdEvent = null;
  let createdTask = null;

  // 1. Bir sonraki duruşma varsa takvime ekle
  if (nextHearingDate) {
    const eventId = generateId('evt');
    const title = `Duruşma: ${caseItem.official_no || caseItem.internal_no} (${caseItem.court_name || 'Mahkeme'})`;
    db.prepare(`
      INSERT INTO events (id, tenant_id, case_id, event_type, title, event_date, notes, assigned_user_id, source)
      VALUES (?, ?, ?, 'hearing', ?, ?, ?, ?, 'hearing_notes')
    `).run(eventId, req.tenantId, caseId, title, nextHearingDate, notes || hearingResult || null, req.user.id);
    createdEvent = eventId;
  }

  // 2. Verilen ara karar / kesin mehil varsa acil görev ve süre oluştur
  if (deadlineDescription) {
    const taskId = generateId('tsk');
    let dueDate = null;
    if (deadlineDays) {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(deadlineDays, 10));
      dueDate = d.toISOString().split('T')[0];
    }

    db.prepare(`
      INSERT INTO tasks (id, tenant_id, case_id, title, due_date, priority, status, assigned_user_id)
      VALUES (?, ?, ?, ?, ?, 'urgent', 'pending', ?)
    `).run(taskId, req.tenantId, caseId, `Ara Karar / Mehil: ${deadlineDescription}`, dueDate, req.user.id);
    createdTask = taskId;

    // Eğer tarih varsa events tablosuna da süre olarak ekle
    if (dueDate) {
      const deadlineEventId = generateId('evt');
      db.prepare(`
        INSERT INTO events (id, tenant_id, case_id, event_type, title, event_date, notes, assigned_user_id, source)
        VALUES (?, ?, ?, 'deadline', ?, ?, ?, ?, 'hearing_notes')
      `).run(deadlineEventId, req.tenantId, caseId, `Kesin Mehil: ${deadlineDescription}`, `${dueDate}T17:00:00`, `Duruşma Ara Kararı`, req.user.id);
    }
  }

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'hearing_note',
    entityType: 'case',
    entityId: caseId,
    details: `Duruşma zaptı işlendi: ${hearingResult || 'Celse tamamlandı'}`,
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({
    success: true,
    message: 'Duruşma notu, bir sonraki celse ve ara kararlar başarıyla kaydedildi.',
    createdEvent,
    createdTask
  });
}

module.exports = {
  listCases,
  getCase,
  createCase,
  updateCase,
  archiveCase,
  recordHearingNotes
};
