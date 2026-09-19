-- ADN Hukuk Bürosu Veritabanı Şeması (Node.js node:sqlite Uyumlu)

-- Bürolar / Çalışma Alanları (Multi-Tenant)
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  phone TEXT,
  email TEXT,
  plan TEXT DEFAULT 'individual',
  status TEXT DEFAULT 'trialing', -- trialing, active, payment_pending, past_due, canceling, expired, suspended
  plan_id TEXT DEFAULT 'solo',
  billing_cycle TEXT DEFAULT 'monthly', -- monthly, yearly
  trial_ends_at DATETIME,
  current_period_starts_at DATETIME,
  current_period_ends_at DATETIME,
  cancel_at_period_end INTEGER DEFAULT 0,
  has_used_trial INTEGER DEFAULT 0,
  subscription_expires_at DATETIME,
  ai_external_allowed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Kullanıcılar
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  bar_city TEXT,
  bar_number TEXT,
  is_verified_lawyer INTEGER DEFAULT 0,
  email_verified INTEGER DEFAULT 1,
  two_factor_enabled INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Büro Üyelikleri & Rolleri (RBAC: owner, manager, lawyer, assistant, finance)
CREATE TABLE IF NOT EXISTS tenant_members (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tm_tenant_user ON tenant_members(tenant_id, user_id);

-- Oturumlar (Session Table)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Davetler (Tek kullanımlık, süreli)
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- E-posta Doğrulama ve Parola Sıfırlama Belirteçleri (Verification Tokens)
CREATE TABLE IF NOT EXISTS verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'email_verify', 'password_reset'
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON verification_tokens(user_id, type);

-- Müvekkiller CRM
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'individual', -- individual, corporate
  name TEXT NOT NULL,
  identity_no TEXT, -- TC / VKN
  phone TEXT,
  email TEXT,
  address TEXT,
  notary_info TEXT, -- Noterlik, Yevmiye No, Tarih
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);

-- Dava, İcra & Danışmanlık Dosyaları
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  internal_no TEXT NOT NULL, -- Büro İçi Dosya No
  official_no TEXT,          -- Mahkeme Esas No / İcra No
  case_type TEXT NOT NULL,    -- dava, icra, arabuluculuk, danismanlik, sozlesme
  court_name TEXT,           -- Mahkeme veya Merci
  stage TEXT NOT NULL,       -- dava_acildi, on_inceleme, tahkikat, bilirkisi, karara_cikti, istinaf, temyiz, kapandi
  status TEXT DEFAULT 'active', -- active, closed, archived
  opponent_name TEXT,
  opponent_counsel TEXT,
  claim_amount REAL DEFAULT 0,
  assigned_lawyer_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_cases_tenant ON cases(tenant_id);

-- Duruşma, Keşif, Süre & Toplantılar
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id TEXT,
  event_type TEXT NOT NULL, -- hearing, discovery, deadline, meeting
  title TEXT NOT NULL,
  event_date DATETIME NOT NULL,
  service_date DATETIME,        -- Tebliğ Tarihi
  legal_service_date DATETIME,  -- UETS 5 gün tebliğ edilmiş sayılma tarihi
  is_confirmed INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual', -- manual, calculation, import
  assigned_user_id TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_tenant ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- Görevler
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id TEXT,
  title TEXT NOT NULL,
  due_date DATE,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT DEFAULT 'pending',  -- pending, completed, cancelled
  assigned_user_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);

-- Belgeler
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id TEXT,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  uploaded_by TEXT NOT NULL,
  is_quarantined INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);

-- Finans (Ücret, Masraf, Avans & Tahsilat)
CREATE TABLE IF NOT EXISTS financial_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id TEXT,
  record_type TEXT NOT NULL, -- fee, collection, advance, expense
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'TRY',
  payment_date DATE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fin_tenant ON financial_records(tenant_id);

-- Denetim İzi (Audit Logs - KVKK m.12 ve Güvenlik)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL, -- login, logout, create, update, delete, download, export
  entity_type TEXT NOT NULL, -- auth, case, client, document, event, finance
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);

-- ===================================================
-- SİSTEM YÖNETİCİSİ (SÜPER ADMİN) TABLOLARI (/system)
-- ===================================================

-- Sistem Yönetici Oturumları (ömer:2571)
CREATE TABLE IF NOT EXISTS system_sessions (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sys_sess_exp ON system_sessions(expires_at);

-- Abonelik Paketleri ve Fiyatlandırma
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,             -- solo, pro, enterprise
  name TEXT NOT NULL,             -- Solo / Bireysel, Pro Büro, Kurumsal Ortaklık
  badge TEXT,                     -- Popüler, Önerilen vb.
  price_monthly REAL NOT NULL,    -- Aylık Fiyat TL
  price_yearly REAL NOT NULL,     -- Yıllık Fiyat TL
  max_lawyers INTEGER NOT NULL,   -- Avukat & Kullanıcı Limiti
  max_cases INTEGER NOT NULL,     -- Dava Limiti
  storage_gb INTEGER NOT NULL,    -- Depolama Alanı (GB)
  ai_queries_monthly INTEGER NOT NULL, -- TBB AI Sorgu Kotası
  features TEXT NOT NULL,         -- JSON Array [özellik1, özellik2, ...]
  is_active INTEGER DEFAULT 1,
  is_demo_pricing INTEGER DEFAULT 1, -- Canlıda uydurma fiyat olmaması için demo bayrağı
  plan_version INTEGER DEFAULT 1, -- Sürümlü plan kaydı
  sort_order INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sistem Genel Duyuru & Bakım Bildirimleri
CREATE TABLE IF NOT EXISTS system_announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',       -- info, warning, maintenance, alert
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ödeme İşlemleri & Tahsilat Kayıtları (iyzico / PayTR / Dekont)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,         -- iyzico, paytr, manual
  merchant_oid TEXT NOT NULL,     -- Sağlayıcı Sipariş Numarası
  amount REAL NOT NULL,           -- Net Tahsil Edilen Tutar
  currency TEXT DEFAULT 'TRY',    -- Para birimi
  status TEXT NOT NULL,           -- pending, success, failure, cancelled
  payment_type TEXT NOT NULL,     -- subscription_new, renewal, upgrade
  plan_id TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,    -- monthly, yearly
  idempotency_key TEXT UNIQUE,    -- Mükerrer webhook önleme anahtarı
  receipt_number TEXT UNIQUE,     -- İşlem Dekont Numarası (ADN-TRX-...)
  raw_payload TEXT,               -- Sağlayıcıdan gelen ham bildirim (log/audit)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pay_trx_tenant ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pay_trx_oid ON payment_transactions(merchant_oid);

-- Abonelik Değişim Geçmişi (Denetim & Sürüm Takibi)
CREATE TABLE IF NOT EXISTS subscription_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  from_plan_id TEXT,
  to_plan_id TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  action TEXT NOT NULL,           -- trial_started, upgraded, downgraded, cancelled, renewed, expired
  effective_date DATETIME NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sub_hist_tenant ON subscription_history(tenant_id);

