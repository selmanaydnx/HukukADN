const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

let dbInstance = null;

function getDb() {
  const DB_PATH = process.env.ADN_DB_PATH || path.join(__dirname, '../../adn_database.sqlite');
  if (!dbInstance) {
    // Ensure directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    dbInstance = new DatabaseSync(DB_PATH);

    // Enable WAL mode and foreign keys for performance and integrity
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');

    // Initialize Schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    dbInstance.exec(schemaSql);

    // Apply incremental migrations for existing databases
    applyMigrations(dbInstance);
  }
  return dbInstance;
}

function applyMigrations(db) {
  try {
    // Check and add status column to tenants
    const tenantCols = db.prepare("PRAGMA table_info(tenants);").all();
    const colNames = tenantCols.map(c => c.name);

    if (!colNames.includes('status')) {
      db.exec("ALTER TABLE tenants ADD COLUMN status TEXT DEFAULT 'trialing';");
    }
    if (!colNames.includes('plan_id')) {
      db.exec("ALTER TABLE tenants ADD COLUMN plan_id TEXT DEFAULT 'solo';");
    }
    if (!colNames.includes('billing_cycle')) {
      db.exec("ALTER TABLE tenants ADD COLUMN billing_cycle TEXT DEFAULT 'monthly';");
    }
    if (!colNames.includes('trial_ends_at')) {
      db.exec("ALTER TABLE tenants ADD COLUMN trial_ends_at DATETIME;");
    }
    if (!colNames.includes('current_period_starts_at')) {
      db.exec("ALTER TABLE tenants ADD COLUMN current_period_starts_at DATETIME;");
    }
    if (!colNames.includes('current_period_ends_at')) {
      db.exec("ALTER TABLE tenants ADD COLUMN current_period_ends_at DATETIME;");
    }
    if (!colNames.includes('cancel_at_period_end')) {
      db.exec("ALTER TABLE tenants ADD COLUMN cancel_at_period_end INTEGER DEFAULT 0;");
    }
    if (!colNames.includes('has_used_trial')) {
      db.exec("ALTER TABLE tenants ADD COLUMN has_used_trial INTEGER DEFAULT 0;");
    }
    if (!colNames.includes('subscription_expires_at')) {
      db.exec("ALTER TABLE tenants ADD COLUMN subscription_expires_at DATETIME;");
    }

    // Check subscription_plans columns
    const planCols = db.prepare("PRAGMA table_info(subscription_plans);").all();
    const planColNames = planCols.map(c => c.name);
    if (!planColNames.includes('is_demo_pricing')) {
      db.exec("ALTER TABLE subscription_plans ADD COLUMN is_demo_pricing INTEGER DEFAULT 1;");
    }
    if (!planColNames.includes('plan_version')) {
      db.exec("ALTER TABLE subscription_plans ADD COLUMN plan_version INTEGER DEFAULT 1;");
    }

    // Ensure verification_tokens table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_tokens_token ON verification_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_tokens_user ON verification_tokens(user_id, type);
    `);

    // Seed or update default subscription plans
    const planCount = db.prepare("SELECT COUNT(*) as count FROM subscription_plans;").get();
    if (!planCount || planCount.count === 0) {
      const defaultPlans = [
        {
          id: 'solo',
          name: 'Bireysel (Solo)',
          badge: 'Tek Avukat & Stajyer',
          price_monthly: 1250,
          price_yearly: 12000, // Yıllık 1.000 TL/ay (%20 indirimli)
          max_lawyers: 1,
          max_cases: 150,
          storage_gb: 15,
          ai_queries_monthly: 150,
          features: JSON.stringify([
            '1 Avukat / Çalışma Alanı',
            '150 Aktif Dava & İcra Dosyası',
            '15 GB Güvenli Evrak Depolama',
            '150 TBB Uyumlu AI Analiz / Ay',
            'HMK, İİK & UETS Yasal Süre Motoru',
            'Av. K. m.56 Yetki Belgesi Üretici',
            '2 Adımlı Doğrulama & Büro Veri İzolasyonu',
            'KVKK m.11 JSON Veri Dışa Aktarma'
          ]),
          is_demo_pricing: 1,
          plan_version: 1,
          sort_order: 1
        },
        {
          id: 'pro',
          name: 'Büro (Pro)',
          badge: 'En Çok Tercih Edilen',
          price_monthly: 2950,
          price_yearly: 28320, // Yıllık 2.360 TL/ay (%20 indirimli)
          max_lawyers: 5,
          max_cases: 750,
          storage_gb: 75,
          ai_queries_monthly: 750,
          features: JSON.stringify([
            '5 Avukat, Stajyer & Büro Personeli',
            '750 Aktif Dosya Takip Kapasitesi',
            '75 GB Güvenli Evrak Depolama',
            '750 TBB Uyumlu AI Analiz / Ay',
            'Gelişmiş Duruşma & Celse Takibi',
            'SMM & İcra Kapak Hesabı Paketi',
            'Adliye Masraf & Harç Pusulası',
            '2 Adımlı Doğrulama & Büro Veri İzolasyonu',
            'KVKK m.11 JSON Veri Dışa Aktarma'
          ]),
          is_demo_pricing: 1,
          plan_version: 1,
          sort_order: 2
        },
        {
          id: 'enterprise',
          name: 'Kurumsal & Ortaklık',
          badge: 'Özel Kapasite / Teklif Alın',
          price_monthly: 6500,
          price_yearly: 62400, // Yıllık 5.200 TL/ay (%20 indirimli)
          max_lawyers: 25,
          max_cases: 5000,
          storage_gb: 300,
          ai_queries_monthly: 3000,
          features: JSON.stringify([
            '25 Kullanıcıya Kadar Genişletilebilir Ekip',
            '5.000 Dosya Yönetim Kapasitesi',
            '300 GB Evrak & UDF Depolama',
            '3.000 TBB Uyumlu AI Analiz / Ay',
            'Özel KVKK Denetim İzi & JSON Yedekleme',
            'Öncelikli Telefon & WhatsApp Destek Hattı',
            'Özel Yetkilendirme & Rol Yönetimi',
            '2 Adımlı Doğrulama & Büro Veri İzolasyonu',
            'KVKK m.11 JSON Veri Dışa Aktarma'
          ]),
          is_demo_pricing: 1,
          plan_version: 1,
          sort_order: 3
        }
      ];

      const insertPlan = db.prepare(`
        INSERT INTO subscription_plans 
        (id, name, badge, price_monthly, price_yearly, max_lawyers, max_cases, storage_gb, ai_queries_monthly, features, is_demo_pricing, plan_version, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);

      for (const p of defaultPlans) {
        insertPlan.run(
          p.id,
          p.name,
          p.badge,
          p.price_monthly,
          p.price_yearly,
          p.max_lawyers,
          p.max_cases,
          p.storage_gb,
          p.ai_queries_monthly,
          p.features,
          p.is_demo_pricing,
          p.plan_version,
          p.sort_order
        );
      }
    }
  } catch (err) {
    console.error('Migration / Seed Warning:', err.message);
  }
}

function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {}
    dbInstance = null;
  }
}

module.exports = {
  getDb,
  closeDb
};
