const { getDb } = require('../database/db');
const { generateId } = require('./crypto');

function logAudit({ tenantId, userId, action, entityType, entityId = null, details = '', ipAddress = '' }) {
  try {
    const db = getDb();
    const id = generateId('aud');
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(id, tenantId, userId || null, action, entityType, entityId, details, ipAddress);
  } catch (err) {
    console.error('Audit log write error:', err.message);
  }
}

module.exports = {
  logAudit
};
