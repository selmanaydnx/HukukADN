const { getDb } = require('../database/db');
const { generateId } = require('../utils/crypto');
const { logAudit } = require('../utils/audit');
const { calculateUetsLegalServiceDate } = require('../utils/proceduralRules');

function listEvents(req, res) {
  const db = getDb();
  const { start, end, type, caseId } = req.query;

  let query = `
    SELECT e.*, c.internal_no, c.official_no, c.court_name, cl.name AS client_name,
           u.full_name AS assigned_user_name
    FROM events e
    LEFT JOIN cases c ON e.case_id = c.id
    LEFT JOIN clients cl ON c.client_id = cl.id
    LEFT JOIN users u ON e.assigned_user_id = u.id
    WHERE e.tenant_id = ?
  `;
  const params = [req.tenantId];

  if (start) {
    query += ` AND e.event_date >= ?`;
    params.push(start);
  }

  if (end) {
    query += ` AND e.event_date <= ?`;
    params.push(end);
  }

  if (type) {
    query += ` AND e.event_type = ?`;
    params.push(type);
  }

  if (caseId) {
    query += ` AND e.case_id = ?`;
    params.push(caseId);
  }

  query += ` ORDER BY e.event_date ASC`;

  const events = db.prepare(query).all(...params);
  return res.json({ events });
}

function createEvent(req, res) {
  const {
    caseId,
    eventType = 'hearing',
    title,
    eventDate,
    serviceDate,
    notes,
    assignedUserId
  } = req.body;

  if (!title || !eventDate) {
    return res.status(400).json({ error: 'Başlık ve etkinlik tarihi zorunludur.' });
  }

  const db = getDb();
  const eventId = generateId('evt');

  // Calculate UETS legal service date if serviceDate provided
  let legalServiceDate = null;
  if (serviceDate) {
    legalServiceDate = calculateUetsLegalServiceDate(serviceDate);
  }

  // Conflict Check (Same tenant, overlapping event within 30 minutes)
  const conflict = db.prepare(`
    SELECT title, event_date FROM events
    WHERE tenant_id = ? AND event_type IN ('hearing', 'meeting')
    AND abs(strftime('%s', event_date) - strftime('%s', ?)) < 1800
    LIMIT 1
  `).get(req.tenantId, eventDate);

  db.prepare(`
    INSERT INTO events (id, tenant_id, case_id, event_type, title, event_date, service_date, legal_service_date, is_confirmed, source, assigned_user_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'manual', ?, ?, datetime('now'))
  `).run(
    eventId,
    req.tenantId,
    caseId || null,
    eventType,
    title.trim(),
    eventDate,
    serviceDate || null,
    legalServiceDate || null,
    assignedUserId || req.user.id,
    notes || null
  );

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'create',
    entityType: 'event',
    entityId: eventId,
    details: `Yeni takvim etkinliği: ${title} (${eventDate})`,
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.status(201).json({
    message: 'Etkinlik kaydedildi.',
    eventId,
    conflictWarning: conflict ? `Dikkat: Yakın saatte '${conflict.title}' etkinliği bulunmaktadır.` : null
  });
}

function updateEvent(req, res) {
  const { title, eventDate, isConfirmed, notes } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM events WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (!existing) {
    return res.status(404).json({ error: 'Etkinlik bulunamadı.' });
  }

  db.prepare(`
    UPDATE events
    SET title = COALESCE(?, title),
        event_date = COALESCE(?, event_date),
        is_confirmed = COALESCE(?, is_confirmed),
        notes = COALESCE(?, notes)
    WHERE id = ? AND tenant_id = ?
  `).run(
    title ? title.trim() : null,
    eventDate || null,
    isConfirmed !== undefined ? (isConfirmed ? 1 : 0) : null,
    notes || null,
    req.params.id,
    req.tenantId
  );

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'update',
    entityType: 'event',
    entityId: req.params.id,
    details: 'Etkinlik güncellendi',
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({ message: 'Etkinlik güncellendi.' });
}

function deleteEvent(req, res) {
  const db = getDb();
  const result = db.prepare('DELETE FROM events WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Etkinlik bulunamadı.' });
  }

  return res.json({ message: 'Etkinlik silindi.' });
}

module.exports = {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent
};
