const { getDb } = require('../database/db');
const { generateId } = require('../utils/crypto');
const { logAudit } = require('../utils/audit');

function listFinancialRecords(req, res) {
  const db = getDb();
  const { caseId, type } = req.query;

  let query = `
    SELECT f.*, c.internal_no, c.official_no, cl.name AS client_name
    FROM financial_records f
    LEFT JOIN cases c ON f.case_id = c.id
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE f.tenant_id = ?
  `;
  const params = [req.tenantId];

  if (caseId) {
    query += ` AND f.case_id = ?`;
    params.push(caseId);
  }

  if (type) {
    query += ` AND f.record_type = ?`;
    params.push(type);
  }

  query += ` ORDER BY f.payment_date DESC, f.created_at DESC`;

  const records = db.prepare(query).all(...params);

  // Totals
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN record_type = 'fee' THEN amount ELSE 0 END), 0) AS total_agreed_fee,
      COALESCE(SUM(CASE WHEN record_type = 'collection' THEN amount ELSE 0 END), 0) AS total_collected,
      COALESCE(SUM(CASE WHEN record_type = 'advance' THEN amount ELSE 0 END), 0) AS total_advance,
      COALESCE(SUM(CASE WHEN record_type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
    FROM financial_records
    WHERE tenant_id = ?
  `).get(req.tenantId);

  return res.json({ records, totals });
}

function createFinancialRecord(req, res) {
  const { caseId, recordType, amount, currency = 'TRY', paymentDate, description } = req.body;

  if (!recordType || !amount || !paymentDate) {
    return res.status(400).json({ error: 'İşlem türü, tutar ve tarih alanları zorunludur.' });
  }

  const validTypes = ['fee', 'collection', 'advance', 'expense'];
  if (!validTypes.includes(recordType)) {
    return res.status(400).json({ error: 'Geçersiz işlem türü.' });
  }

  const db = getDb();
  const id = generateId('fin');

  db.prepare(`
    INSERT INTO financial_records (id, tenant_id, case_id, record_type, amount, currency, payment_date, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    id,
    req.tenantId,
    caseId || null,
    recordType,
    parseFloat(amount),
    currency,
    paymentDate,
    description ? description.trim() : null
  );

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'create',
    entityType: 'finance',
    entityId: id,
    details: `${recordType} kaydı eklendi: ${amount} ${currency}`,
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.status(201).json({ message: 'Mali kayıt başarıyla eklendi.', recordId: id });
}

function deleteFinancialRecord(req, res) {
  const db = getDb();
  const result = db.prepare('DELETE FROM financial_records WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Kayıt bulunamadı.' });
  }

  return res.json({ message: 'Mali kayıt silindi.' });
}

module.exports = {
  listFinancialRecords,
  createFinancialRecord,
  deleteFinancialRecord
};
