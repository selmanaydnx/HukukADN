const { getDb } = require('../database/db');
const { generateId } = require('../utils/crypto');
const { logAudit } = require('../utils/audit');

function listTasks(req, res) {
  const db = getDb();
  const { status, caseId } = req.query;

  let query = `
    SELECT t.*, c.internal_no, c.official_no, u.full_name AS assigned_user_name
    FROM tasks t
    LEFT JOIN cases c ON t.case_id = c.id
    LEFT JOIN users u ON t.assigned_user_id = u.id
    WHERE t.tenant_id = ?
  `;
  const params = [req.tenantId];

  if (status) {
    query += ` AND t.status = ?`;
    params.push(status);
  }

  if (caseId) {
    query += ` AND t.case_id = ?`;
    params.push(caseId);
  }

  query += ` ORDER BY t.due_date ASC, t.created_at DESC`;

  const tasks = db.prepare(query).all(...params);
  return res.json({ tasks });
}

function createTask(req, res) {
  const { caseId, title, dueDate, priority = 'normal', assignedUserId } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Görev başlığı zorunludur.' });
  }

  const db = getDb();
  const taskId = generateId('tsk');

  db.prepare(`
    INSERT INTO tasks (id, tenant_id, case_id, title, due_date, priority, status, assigned_user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'))
  `).run(
    taskId,
    req.tenantId,
    caseId || null,
    title.trim(),
    dueDate || null,
    priority,
    assignedUserId || req.user.id
  );

  return res.status(201).json({ message: 'Görev oluşturuldu.', taskId });
}

function toggleTask(req, res) {
  const db = getDb();
  const task = db.prepare('SELECT id, status FROM tasks WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);

  if (!task) {
    return res.status(404).json({ error: 'Görev bulunamadı.' });
  }

  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
  db.prepare('UPDATE tasks SET status = ? WHERE id = ? AND tenant_id = ?').run(newStatus, task.id, req.tenantId);

  return res.json({ message: 'Görev durumu güncellendi.', status: newStatus });
}

function deleteTask(req, res) {
  const db = getDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Görev bulunamadı.' });
  }
  return res.json({ message: 'Görev silindi.' });
}

module.exports = {
  listTasks,
  createTask,
  toggleTask,
  deleteTask
};
