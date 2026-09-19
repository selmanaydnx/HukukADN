const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { getDb } = require('../database/db');

// Sistem Giriş Bilgileri (ömer:2571)
const SYSTEM_USERNAME = 'ömer';
const SYSTEM_PASSWORD = '2571';

// Parola Hashleme Yardımcısı (Kullanıcı şifresi sıfırlama için)
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/**
 * Sistem Yöneticisi Girişi (POST /api/system/auth/login)
 * Sadece kullanıcıadı: ömer, şifre: 2571
 */
function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur.' });
  }

  // Türkçe karakter ve küçük-büyük harf toleransı
  const normalizedUser = String(username).trim().toLocaleLowerCase('tr');
  const normalizedPassword = String(password).trim();

  const isValidUser = normalizedUser === SYSTEM_USERNAME || normalizedUser === 'omer';
  const isValidPass = normalizedPassword === SYSTEM_PASSWORD;

  if (!isValidUser || !isValidPass) {
    return res.status(401).json({ error: 'Geçersiz sistem yöneticisi kullanıcı adı veya şifresi.' });
  }

  const db = getDb();
  const sessionId = crypto.randomUUID();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'System-Client';

  try {
    // 24 saatlik oturum
    db.prepare(`
      INSERT INTO system_sessions (id, username, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, datetime('now', '+1 day'));
    `).run(sessionId, 'ömer', ip, userAgent);

    // Çerez tanımla
    res.setHeader('Set-Cookie', `adn_system_session=${sessionId}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax`);

    return res.json({
      message: 'Sistem komuta merkezine başarıyla giriş yapıldı.',
      user: { username: 'ömer', role: 'super_admin' }
    });
  } catch (err) {
    console.error('System Login Error:', err);
    return res.status(500).json({ error: 'Giriş işlemi sırasında sunucu hatası oluştu.' });
  }
}

/**
 * Sistem Yöneticisi Çıkışı (POST /api/system/auth/logout)
 */
function logout(req, res) {
  let sessionId = req.systemUser ? req.systemUser.sessionId : null;
  if (!sessionId && req.headers.cookie) {
    const match = req.headers.cookie.match(/adn_system_session=([^;]+)/);
    if (match) sessionId = match[1].trim();
  }

  if (sessionId) {
    try {
      const db = getDb();
      db.prepare('DELETE FROM system_sessions WHERE id = ?;').run(sessionId);
    } catch (e) {}
  }
  res.setHeader('Set-Cookie', 'adn_system_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');
  return res.json({ message: 'Sistem yöneticisi oturumu güvenle kapatıldı.' });
}

/**
 * Aktif Yönetici Bilgisi (GET /api/system/auth/me)
 */
function getMe(req, res) {
  return res.json({
    authenticated: true,
    user: req.systemUser
  });
}

/**
 * Sistem İstatistikleri & Dashboard Verileri (GET /api/system/stats)
 */
function getDashboardStats(req, res) {
  const db = getDb();
  try {
    const totalTenants = db.prepare('SELECT COUNT(*) as count FROM tenants;').get().count;
    const activeTenants = db.prepare("SELECT COUNT(*) as count FROM tenants WHERE status = 'active' OR status IS NULL;").get().count;
    const suspendedTenants = db.prepare("SELECT COUNT(*) as count FROM tenants WHERE status = 'suspended';").get().count;
    
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users;').get().count;
    const totalCases = db.prepare('SELECT COUNT(*) as count FROM cases;').get().count;
    const totalClients = db.prepare('SELECT COUNT(*) as count FROM clients;').get().count;
    const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events;').get().count;
    const totalDocuments = db.prepare('SELECT COUNT(*) as count FROM documents;').get().count;

    // Tahmini Aylık Gelir (MRR) Hesabı
    const mrrResult = db.prepare(`
      SELECT COALESCE(SUM(p.price_monthly), 0) as mrr
      FROM tenants t
      LEFT JOIN subscription_plans p ON COALESCE(t.plan_id, 'solo') = p.id
      WHERE t.status = 'active' OR t.status IS NULL;
    `).get();

    // Veritabanı dosya boyutu
    let dbSizeBytes = 0;
    const dbPath = process.env.ADN_DB_PATH || path.join(__dirname, '../../adn_database.sqlite');
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      dbSizeBytes = stats.size;
    }

    return res.json({
      metrics: {
        totalTenants,
        activeTenants,
        suspendedTenants,
        totalUsers,
        totalCases,
        totalClients,
        totalEvents,
        totalDocuments,
        estimatedMrr: mrrResult ? mrrResult.mrr : 0,
        dbSizeBytes,
        dbSizeFormatted: (dbSizeBytes / (1024 * 1024)).toFixed(2) + ' MB',
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: (process.memoryUsage().rss / (1024 * 1024)).toFixed(1)
      }
    });
  } catch (err) {
    console.error('System Stats Error:', err);
    return res.status(500).json({ error: 'İstatistikler alınırken hata oluştu.' });
  }
}

/**
 * Tüm Hukuk Bürolarını Listele (GET /api/system/tenants)
 */
function listTenants(req, res) {
  const db = getDb();
  try {
    const tenants = db.prepare(`
      SELECT 
        t.id,
        t.name,
        t.city,
        t.phone,
        t.email,
        COALESCE(t.plan_id, 'solo') as plan_id,
        COALESCE(t.status, 'active') as status,
        t.subscription_expires_at,
        t.created_at,
        p.name as plan_name,
        p.price_monthly,
        (SELECT u.full_name FROM tenant_members tm JOIN users u ON tm.user_id = u.id WHERE tm.tenant_id = t.id AND tm.role = 'owner' LIMIT 1) as owner_name,
        (SELECT u.email FROM tenant_members tm JOIN users u ON tm.user_id = u.id WHERE tm.tenant_id = t.id AND tm.role = 'owner' LIMIT 1) as owner_email,
        (SELECT COUNT(*) FROM tenant_members WHERE tenant_id = t.id) as member_count,
        (SELECT COUNT(*) FROM cases WHERE tenant_id = t.id) as case_count,
        (SELECT COUNT(*) FROM clients WHERE tenant_id = t.id) as client_count
      FROM tenants t
      LEFT JOIN subscription_plans p ON COALESCE(t.plan_id, 'solo') = p.id
      ORDER BY t.created_at DESC;
    `).all();

    return res.json({ tenants });
  } catch (err) {
    console.error('System List Tenants Error:', err);
    return res.status(500).json({ error: 'Bürolar listelenirken hata oluştu.' });
  }
}

/**
 * Büro Durumunu ve Abonelik Planını Güncelle (PATCH /api/system/tenants/:id)
 */
function updateTenant(req, res) {
  const { id } = req.params;
  const { status, plan_id, subscription_expires_at, name } = req.body || {};

  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM tenants WHERE id = ?;').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Büro bulunamadı.' });
    }

    const newStatus = status || existing.status || 'active';
    const newPlan = plan_id || existing.plan_id || 'solo';
    const newName = name || existing.name;
    const newExpires = subscription_expires_at !== undefined ? subscription_expires_at : (existing.subscription_expires_at || null);

    db.prepare(`
      UPDATE tenants 
      SET status = ?, plan_id = ?, name = ?, subscription_expires_at = ?
      WHERE id = ?;
    `).run(newStatus, newPlan, newName, newExpires, id);

    return res.json({
      message: 'Büro bilgileri ve abonelik durumu başarıyla güncellendi.',
      tenant: { id, status: newStatus, plan_id: newPlan }
    });
  } catch (err) {
    console.error('Update Tenant Error:', err);
    return res.status(500).json({ error: 'Büro güncellenirken hata oluştu.' });
  }
}

/**
 * Büro Sil (DELETE /api/system/tenants/:id)
 */
function deleteTenant(req, res) {
  const { id } = req.params;
  const db = getDb();
  try {
    const existing = db.prepare('SELECT name FROM tenants WHERE id = ?;').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Büro bulunamadı.' });
    }

    db.prepare('DELETE FROM tenants WHERE id = ?;').run(id);
    return res.json({ message: `"${existing.name}" bürosu ve tüm verileri kalıcı olarak silindi.` });
  } catch (err) {
    console.error('Delete Tenant Error:', err);
    return res.status(500).json({ error: 'Büro silinirken hata oluştu.' });
  }
}

/**
 * Tüm Kullanıcıları Listele (GET /api/system/users)
 */
function listUsers(req, res) {
  const db = getDb();
  try {
    const users = db.prepare(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.bar_city,
        u.bar_number,
        u.is_verified_lawyer,
        u.created_at,
        tm.role,
        t.id as tenant_id,
        t.name as tenant_name,
        COALESCE(t.status, 'active') as tenant_status
      FROM users u
      LEFT JOIN tenant_members tm ON u.id = tm.user_id
      LEFT JOIN tenants t ON tm.tenant_id = t.id
      ORDER BY u.created_at DESC;
    `).all();

    return res.json({ users });
  } catch (err) {
    console.error('List Users Error:', err);
    return res.status(500).json({ error: 'Kullanıcılar listelenirken hata oluştu.' });
  }
}

/**
 * Kullanıcı Parolasını Sıfırla (POST /api/system/users/:id/reset-password)
 */
function resetUserPassword(req, res) {
  const { id } = req.params;
  const { newPassword } = req.body || {};

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Yeni parola en az 6 karakter olmalıdır.' });
  }

  const db = getDb();
  try {
    const user = db.prepare('SELECT id, full_name, email FROM users WHERE id = ?;').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(newPassword, salt);

    db.prepare(`
      UPDATE users 
      SET password_hash = ?, salt = ? 
      WHERE id = ?;
    `).run(hash, salt, id);

    // Kullanıcının mevcut oturumlarını güvenlik amacıyla sonlandır
    db.prepare('DELETE FROM sessions WHERE user_id = ?;').run(id);

    return res.json({
      message: `"${user.full_name}" kullanıcısının parolası başarıyla güncellendi. Tüm eski oturumları kapatıldı.`
    });
  } catch (err) {
    console.error('Reset Password Error:', err);
    return res.status(500).json({ error: 'Parola sıfırlanırken hata oluştu.' });
  }
}

/**
 * Abonelik Paketlerini Listele (GET /api/system/plans)
 */
function listPlans(req, res) {
  const db = getDb();
  try {
    const plans = db.prepare(`
      SELECT * FROM subscription_plans 
      ORDER BY sort_order ASC;
    `).all();

    const parsedPlans = plans.map(p => {
      try {
        p.features = typeof p.features === 'string' ? JSON.parse(p.features) : p.features;
      } catch (e) {
        p.features = [];
      }
      return p;
    });

    return res.json({ plans: parsedPlans });
  } catch (err) {
    console.error('List Plans Error:', err);
    return res.status(500).json({ error: 'Abonelik paketleri alınırken hata oluştu.' });
  }
}

/**
 * Abonelik Paketini & Fiyatlarını Güncelle (PUT /api/system/plans/:id)
 */
function updatePlan(req, res) {
  const { id } = req.params;
  const {
    name,
    badge,
    price_monthly,
    price_yearly,
    max_lawyers,
    max_cases,
    storage_gb,
    ai_queries_monthly,
    features,
    is_active
  } = req.body || {};

  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM subscription_plans WHERE id = ?;').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Abonelik paketi bulunamadı.' });
    }

    const updatedFeatures = features !== undefined 
      ? (typeof features === 'string' ? features : JSON.stringify(features))
      : existing.features;

    db.prepare(`
      UPDATE subscription_plans
      SET 
        name = COALESCE(?, name),
        badge = COALESCE(?, badge),
        price_monthly = COALESCE(?, price_monthly),
        price_yearly = COALESCE(?, price_yearly),
        max_lawyers = COALESCE(?, max_lawyers),
        max_cases = COALESCE(?, max_cases),
        storage_gb = COALESCE(?, storage_gb),
        ai_queries_monthly = COALESCE(?, ai_queries_monthly),
        features = COALESCE(?, features),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `).run(
      name !== undefined ? name : null,
      badge !== undefined ? badge : null,
      price_monthly !== undefined ? Number(price_monthly) : null,
      price_yearly !== undefined ? Number(price_yearly) : null,
      max_lawyers !== undefined ? Number(max_lawyers) : null,
      max_cases !== undefined ? Number(max_cases) : null,
      storage_gb !== undefined ? Number(storage_gb) : null,
      ai_queries_monthly !== undefined ? Number(ai_queries_monthly) : null,
      updatedFeatures !== undefined ? updatedFeatures : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    );

    return res.json({ message: `"${name || existing.name}" paketi ve fiyatlandırma kuralları güncellendi.` });
  } catch (err) {
    console.error('Update Plan Error:', err);
    return res.status(500).json({ error: 'Paket güncellenirken hata oluştu.' });
  }
}

/**
 * Yeni Abonelik Paketi Oluştur (POST /api/system/plans)
 */
function createPlan(req, res) {
  const {
    id,
    name,
    badge,
    price_monthly,
    price_yearly,
    max_lawyers,
    max_cases,
    storage_gb,
    ai_queries_monthly,
    features
  } = req.body || {};

  if (!id || !name || price_monthly === undefined || price_yearly === undefined) {
    return res.status(400).json({ error: 'Paket kimliği (id), adı, aylık ve yıllık fiyatları zorunludur.' });
  }

  const db = getDb();
  try {
    const existing = db.prepare('SELECT id FROM subscription_plans WHERE id = ?;').get(id);
    if (existing) {
      return res.status(400).json({ error: 'Bu paket kimliği zaten mevcut.' });
    }

    const featuresJson = typeof features === 'string' ? features : JSON.stringify(features || []);

    db.prepare(`
      INSERT INTO subscription_plans 
      (id, name, badge, price_monthly, price_yearly, max_lawyers, max_cases, storage_gb, ai_queries_monthly, features)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `).run(
      id.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
      name,
      badge || '',
      Number(price_monthly),
      Number(price_yearly),
      Number(max_lawyers || 1),
      Number(max_cases || 100),
      Number(storage_gb || 10),
      Number(ai_queries_monthly || 100),
      featuresJson
    );

    return res.status(201).json({ message: 'Yeni abonelik paketi başarıyla oluşturuldu.' });
  } catch (err) {
    console.error('Create Plan Error:', err);
    return res.status(500).json({ error: 'Paket oluşturulurken hata oluştu.' });
  }
}

/**
 * Merkezi Güvenlik ve Denetim İzi (GET /api/system/audit-logs)
 */
function listAuditLogs(req, res) {
  const db = getDb();
  try {
    const logs = db.prepare(`
      SELECT 
        a.id,
        a.action,
        a.entity_type,
        a.entity_id,
        a.details,
        a.ip_address,
        a.created_at,
        t.name as tenant_name,
        u.full_name as user_name,
        u.email as user_email
      FROM audit_logs a
      LEFT JOIN tenants t ON a.tenant_id = t.id
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100;
    `).all();

    return res.json({ logs });
  } catch (err) {
    console.error('System Audit Logs Error:', err);
    return res.status(500).json({ error: 'Denetim kayıtları alınırken hata oluştu.' });
  }
}

/**
 * Sistem Duyuruları & Bakım Mesajları (GET / POST)
 */
function getAnnouncements(req, res) {
  const db = getDb();
  try {
    const announcements = db.prepare(`
      SELECT * FROM system_announcements 
      WHERE is_active = 1 
      ORDER BY created_at DESC LIMIT 5;
    `).all();
    return res.json({ announcements });
  } catch (err) {
    return res.json({ announcements: [] });
  }
}

function saveAnnouncement(req, res) {
  const { title, message, type, is_active } = req.body || {};
  if (!title || !message) {
    return res.status(400).json({ error: 'Başlık ve duyuru metni zorunludur.' });
  }

  const db = getDb();
  try {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO system_announcements (id, title, message, type, is_active)
      VALUES (?, ?, ?, ?, ?);
    `).run(id, title, message, type || 'info', is_active !== undefined ? (is_active ? 1 : 0) : 1);

    return res.status(201).json({ message: 'Sistem duyurusu tüm bürolara yayınlandı.' });
  } catch (err) {
    console.error('Save Announcement Error:', err);
    return res.status(500).json({ error: 'Duyuru kaydedilirken hata oluştu.' });
  }
}

module.exports = {
  login,
  logout,
  getMe,
  getDashboardStats,
  listTenants,
  updateTenant,
  deleteTenant,
  listUsers,
  resetUserPassword,
  listPlans,
  updatePlan,
  createPlan,
  listAuditLogs,
  getAnnouncements,
  saveAnnouncement
};
