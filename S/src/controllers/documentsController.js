const fs = require('fs');
const path = require('path');
const { getDb } = require('../database/db');
const { generateId } = require('../utils/crypto');
const { logAudit } = require('../utils/audit');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.udf', '.txt', '.png', '.jpg', '.jpeg'];
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.scr'];

function listDocuments(req, res) {
  const db = getDb();
  const { caseId } = req.query;

  let query = `
    SELECT d.*, c.internal_no, c.official_no, cl.name AS client_name
    FROM documents d
    LEFT JOIN cases c ON d.case_id = c.id
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE d.tenant_id = ?
  `;
  const params = [req.tenantId];

  if (caseId) {
    query += ` AND d.case_id = ?`;
    params.push(caseId);
  }

  query += ` ORDER BY d.created_at DESC`;

  const documents = db.prepare(query).all(...params);
  return res.json({ documents });
}

function uploadDocument(req, res) {
  const { caseId, title, fileName, fileBase64, mimeType } = req.body;

  if (!title || !fileName || !fileBase64) {
    return res.status(400).json({ error: 'Belge başlığı, dosya adı ve dosya içeriği zorunludur.' });
  }

  const ext = path.extname(fileName).toLowerCase();

  // Security checks
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return res.status(400).json({ error: 'Yürütülebilir ve zararlı olabilecek dosya türlerinin yüklenmesine izin verilmez.' });
  }

  const isUdf = (ext === '.udf');
  const docId = generateId('doc');
  const safeFileName = `${docId}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(UPLOADS_DIR, safeFileName);

  // Write file buffer
  const fileBuffer = Buffer.from(fileBase64, 'base64');
  fs.writeFileSync(filePath, fileBuffer);

  const db = getDb();
  db.prepare(`
    INSERT INTO documents (id, tenant_id, case_id, title, file_name, file_path, file_size, mime_type, version, uploaded_by, is_quarantined, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, datetime('now'))
  `).run(
    docId,
    req.tenantId,
    caseId || null,
    title.trim(),
    fileName.trim(),
    safeFileName,
    fileBuffer.length,
    mimeType || 'application/octet-stream',
    req.user.fullName
  );

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'upload',
    entityType: 'document',
    entityId: docId,
    details: `Belge yüklendi: ${fileName} (${(fileBuffer.length / 1024).toFixed(1)} KB)`,
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.status(201).json({
    message: 'Belge başarıyla yüklendi.',
    docId,
    udfNotice: isUdf ? 'UDF formatındaki dosyalar güvenle saklanmıştır. Açmak ve düzenlemek için UYAP Doküman Editörü gereklidir.' : null
  });
}

function downloadDocument(req, res) {
  const db = getDb();
  const doc = db.prepare(`SELECT * FROM documents WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);

  if (!doc) {
    return res.status(404).json({ error: 'Belge bulunamadı veya bu çalışma alanına ait değil.' });
  }

  const absolutePath = path.join(UPLOADS_DIR, doc.file_path);
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'Dosya sunucu diskinde bulunamadı.' });
  }

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'download',
    entityType: 'document',
    entityId: doc.id,
    details: `Belge indirildi: ${doc.file_name}`,
    ipAddress: req.socket.remoteAddress || ''
  });

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.file_name)}"`);
  res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
  const stream = fs.createReadStream(absolutePath);
  stream.pipe(res);
}

function deleteDocument(req, res) {
  const db = getDb();
  const doc = db.prepare(`SELECT * FROM documents WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);

  if (!doc) {
    return res.status(404).json({ error: 'Belge bulunamadı.' });
  }

  const absolutePath = path.join(UPLOADS_DIR, doc.file_path);
  if (fs.existsSync(absolutePath)) {
    try { fs.unlinkSync(absolutePath); } catch (e) {}
  }

  db.prepare('DELETE FROM documents WHERE id = ? AND tenant_id = ?').run(doc.id, req.tenantId);

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'delete',
    entityType: 'document',
    entityId: doc.id,
    details: `Belge silindi: ${doc.file_name}`,
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({ message: 'Belge silindi.' });
}

module.exports = {
  listDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument
};
