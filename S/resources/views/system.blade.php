<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ADN Sistem Yönetim Konsolu (/system) - Süper Yönetici Paneli</title>
  <meta name="description" content="ADN Çok Bürolu Hukuk Otomasyonu - Süper Yönetici Komuta Merkezi, Üye ve Büro Yönetimi, Abonelik ve Fiyatlandırma">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/system.css">
</head>
<body>

  <!-- ================= 1. SİSTEM YÖNETİCİSİ GİRİŞ EKRANI (LOGIN VIEW) ================= -->
  <div id="sys-login-view" class="sys-login-container" style="display: flex;">
    <div class="sys-login-card">
      <div class="sys-login-badge">🛡️ ADN Sistem Komuta Merkezi</div>
      <h1 class="sys-login-title">Yönetici Girişi</h1>
      <p class="sys-login-desc">Bu alana yalnızca yetkili sistem yöneticileri erişebilir. Lütfen kimlik bilgilerinizi giriniz.</p>

      <div id="sys-login-error" style="display:none; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 20px; text-align: left;"></div>

      <form id="sys-login-form">
        <div class="sys-input-group">
          <label class="sys-input-label" for="sys-username">Yönetici Kullanıcı Adı</label>
          <input type="text" id="sys-username" class="sys-input" placeholder="ömer" required autocomplete="username" autofocus>
        </div>

        <div class="sys-input-group">
          <label class="sys-input-label" for="sys-password">Sistem Giriş Şifresi</label>
          <input type="password" id="sys-password" class="sys-input" placeholder="••••" required autocomplete="current-password">
        </div>

        <button type="submit" class="sys-btn-primary" id="btn-sys-login">
          <span>⚡ Güvenli Giriş Yap</span>
        </button>
      </form>

      <div class="sys-login-warning">
        🔒 KVKK ve 5651 Uyarınca tüm sistem girişleri IP ve zaman damgasıyla izlenmektedir.
      </div>
    </div>
  </div>

  <!-- ================= 2. SİSTEM DASHBOARD GÖRÜNÜMÜ (DASHBOARD VIEW) ================= -->
  <div id="sys-dashboard-view" class="sys-dashboard" style="display: none;">
    
    <!-- Topbar -->
    <header class="sys-topbar">
      <div class="sys-logo-wrap">
        <span class="sys-logo-badge">ADN</span>
        <div>
          <div class="sys-logo-title">Sistem Komuta Merkezi</div>
          <div class="sys-logo-subtitle">Master Administration v2.4</div>
        </div>
      </div>

      <div class="sys-topbar-metrics">
        <div class="sys-meta-item">
          <span class="sys-pulse-green"></span>
          <span>Sistem: <strong>Canlı</strong></span>
        </div>
        <div class="sys-meta-item">
          <span>DB Boyutu: <strong id="topbar-dbsize">0 MB</strong></span>
        </div>
        <div class="sys-meta-item">
          <span>Uptime: <strong id="topbar-uptime">0 dk</strong></span>
        </div>
      </div>

      <div class="sys-user-actions">
        <div class="sys-meta-item" style="border-color: rgba(245, 158, 11, 0.3);">
          <span>👑 Yönetici: <strong id="sys-logged-user" style="color:var(--sys-gold);">ömer</strong></span>
        </div>
        <a href="/" class="sys-btn-link" target="_blank" title="Hukuk Bürosu Platformuna Geç">
          🌐 Platforma Git ↗
        </a>
        <button class="sys-btn-danger-outline" id="sys-btn-logout">
          Çıkış Yap
        </button>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="sys-nav">
      <button class="sys-tab-btn active" data-tab="overview">
        📊 Genel Bakış & KPI'lar
      </button>
      <button class="sys-tab-btn" data-tab="tenants">
        🏢 Hukuk Büroları <span class="sys-tab-badge" id="badge-tenants-count">0</span>
      </button>
      <button class="sys-tab-btn" data-tab="users">
        👥 Üyeler & Avukatlar <span class="sys-tab-badge" id="badge-users-count">0</span>
      </button>
      <button class="sys-tab-btn" data-tab="plans">
        💳 Abonelik & Fiyat Yönetimi
      </button>
      <button class="sys-tab-btn" data-tab="announcements">
        📢 Sistem Duyuru Yayını
      </button>
      <button class="sys-tab-btn" data-tab="audit">
        🛡️ Merkezi Güvenlik & Denetim
      </button>
    </nav>

    <!-- Main Container -->
    <main class="sys-main">

      <!-- TAB 1: OVERVIEW -->
      <section id="sys-view-overview" class="sys-view active">
        <div class="sys-kpi-grid">
          <div class="sys-kpi-card">
            <div class="sys-kpi-header">
              <span class="sys-kpi-title">Toplam Hukuk Bürosu</span>
              <span class="sys-kpi-icon">🏢</span>
            </div>
            <div class="sys-kpi-value" id="stat-total-tenants">0</div>
            <div class="sys-kpi-sub">Kayıtlı ve yetkilendirilmiş çalışma alanları</div>
          </div>

          <div class="sys-kpi-card">
            <div class="sys-kpi-header">
              <span class="sys-kpi-title">Aktif Büro</span>
              <span class="sys-kpi-icon">✅</span>
            </div>
            <div class="sys-kpi-value" id="stat-active-tenants" style="color:var(--sys-green);">0</div>
            <div class="sys-kpi-sub">Hizmet vermeye devam eden bürolar</div>
          </div>

          <div class="sys-kpi-card">
            <div class="sys-kpi-header">
              <span class="sys-kpi-title">Askıdaki Büro</span>
              <span class="sys-kpi-icon">⚠️</span>
            </div>
            <div class="sys-kpi-value" id="stat-suspended-tenants" style="color:var(--sys-red);">0</div>
            <div class="sys-kpi-sub">Erişimi durdurulmuş bürolar</div>
          </div>

          <div class="sys-kpi-card">
            <div class="sys-kpi-header">
              <span class="sys-kpi-title">Toplam Kullanıcı</span>
              <span class="sys-kpi-icon">👥</span>
            </div>
            <div class="sys-kpi-value" id="stat-total-users">0</div>
            <div class="sys-kpi-sub">Avukat, stajyer, kâtip ve finans personeli</div>
          </div>

          <div class="sys-kpi-card">
            <div class="sys-kpi-header">
              <span class="sys-kpi-title">Dava & İcra Dosyası</span>
              <span class="sys-kpi-icon">📂</span>
            </div>
            <div class="sys-kpi-value" id="stat-total-cases">0</div>
            <div class="sys-kpi-sub">Platformda işlem gören aktif/kapalı dosyalar</div>
          </div>

          <div class="sys-kpi-card">
            <div class="sys-kpi-header">
              <span class="sys-kpi-title">Tahmini Aylık MRR</span>
              <span class="sys-kpi-icon">💰</span>
            </div>
            <div class="sys-kpi-value" id="stat-mrr" style="color:var(--sys-gold);">0 ₺</div>
            <div class="sys-kpi-sub">Aktif büroların aylık abonelik cirosu</div>
          </div>
        </div>

        <div class="sys-section-card">
          <div class="sys-card-header">
            <h2 class="sys-card-title">⚡ Hızlı Yönetim Eylemleri</h2>
          </div>
          <div style="display:flex; gap:14px; flex-wrap:wrap;">
            <button class="sys-btn-primary" style="width:auto;" onclick="SystemApp.switchTab('plans')">
              💳 Abonelik Fiyatlarını Güncelle
            </button>
            <button class="sys-btn-link" onclick="SystemApp.switchTab('tenants')">
              🏢 Büroları Denetle & Askıya Al
            </button>
            <button class="sys-btn-link" onclick="SystemApp.switchTab('users')">
              👥 Kullanıcı Şifresi Sıfırla
            </button>
            <button class="sys-btn-link" onclick="SystemApp.switchTab('announcements')">
              📢 Genel Duyuru Yayınla
            </button>
          </div>
        </div>
      </section>

      <!-- TAB 2: TENANTS -->
      <section id="sys-view-tenants" class="sys-view">
        <div class="sys-section-card">
          <div class="sys-card-header">
            <h2 class="sys-card-title">🏢 Kayıtlı Hukuk Büroları</h2>
            <div class="sys-toolbar">
              <input type="text" id="tenant-search-input" class="sys-search-input" placeholder="Büro adı, kurucu veya şehir ara...">
              <select id="tenant-status-filter" class="sys-select">
                <option value="all">Tüm Durumlar</option>
                <option value="active">Yalnızca Aktif</option>
                <option value="suspended">Yalnızca Askıda</option>
              </select>
            </div>
          </div>

          <div class="sys-table-responsive">
            <table class="sys-table">
              <thead>
                <tr>
                  <th>Büro Adı / Kimlik</th>
                  <th>Kurucu Avukat</th>
                  <th>Şehir</th>
                  <th>Abonelik Paketi</th>
                  <th>Kullanım (Üye/Dava/Müv)</th>
                  <th>Durum</th>
                  <th>Kayıt Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody id="tenants-table-body">
                <tr><td colspan="8" style="text-align:center; padding:24px;">Yükleniyor...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 3: USERS -->
      <section id="sys-view-users" class="sys-view">
        <div class="sys-section-card">
          <div class="sys-card-header">
            <h2 class="sys-card-title">👥 Tüm Kullanıcılar & Avukatlar</h2>
            <div class="sys-toolbar">
              <input type="text" id="user-search-input" class="sys-search-input" placeholder="İsim, e-posta veya sicil no ara...">
            </div>
          </div>

          <div class="sys-table-responsive">
            <table class="sys-table">
              <thead>
                <tr>
                  <th>Adı Soyadı</th>
                  <th>E-posta</th>
                  <th>Bağlı Büro</th>
                  <th>Büro Rolü</th>
                  <th>Baro & Sicil No</th>
                  <th>Kayıt Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody id="users-table-body">
                <tr><td colspan="7" style="text-align:center; padding:24px;">Yükleniyor...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 4: PLANS & PRICING -->
      <section id="sys-view-plans" class="sys-view">
        <div class="sys-section-card">
          <div class="sys-card-header">
            <div>
              <h2 class="sys-card-title">💳 Abonelik Paketleri ve Fiyat Yönetimi</h2>
              <p style="font-size:0.85rem; color:var(--sys-text-muted); margin-top:4px;">
                Paketlerin aylık ve yıllık fiyatlarını, avukat/dava limitlerini ve saklama kotalarını anlık olarak buradan düzenleyebilirsiniz.
              </p>
            </div>
          </div>

          <div class="sys-plans-grid" id="plans-cards-grid">
            <!-- JavaScript ile dinamik doldurulur -->
          </div>
        </div>
      </section>

      <!-- TAB 5: ANNOUNCEMENTS -->
      <section id="sys-view-announcements" class="sys-view">
        <div class="sys-section-card">
          <div class="sys-card-header">
            <h2 class="sys-card-title">📢 Yeni Sistem Duyurusu / Bakım Bildirimi Yayınla</h2>
          </div>
          <form id="sys-announcement-form" style="max-width: 680px;">
            <div class="sys-input-group">
              <label class="sys-input-label">Duyuru Başlığı</label>
              <input type="text" id="ann-title" class="sys-input" placeholder="Örn: Sistem Bakım Bildirimi (Pazar 02:00 - 04:00)" required>
            </div>
            <div class="sys-input-group">
              <label class="sys-input-label">Duyuru Metni</label>
              <textarea id="ann-message" class="sys-input" rows="4" placeholder="Tüm hukuk bürolarının göreceği bildirim mesajı..." required></textarea>
            </div>
            <div class="sys-input-group">
              <label class="sys-input-label">Bildirim Türü</label>
              <select id="ann-type" class="sys-select" style="width:100%;">
                <option value="info">ℹ️ Bilgilendirme (Mavi)</option>
                <option value="warning">⚠️ Önemli Uyarı (Sarı)</option>
                <option value="maintenance">🛠️ Sistem Bakım Bildirimi (Kırmızı)</option>
              </select>
            </div>
            <button type="submit" class="sys-btn-primary" style="width:auto;">
              📢 Tüm Bürolara Yayınla
            </button>
          </form>
        </div>

        <div class="sys-section-card">
          <div class="sys-card-header">
            <h3 class="sys-card-title">Son Yayınlanan Duyurular</h3>
          </div>
          <div id="announcements-list">
            <!-- JS doldurur -->
          </div>
        </div>
      </section>

      <!-- TAB 6: AUDIT LOGS -->
      <section id="sys-view-audit" class="sys-view">
        <div class="sys-section-card">
          <div class="sys-card-header">
            <h2 class="sys-card-title">🛡️ Merkezi Güvenlik & Denetim İzi (Son 100 Olay)</h2>
          </div>

          <div class="sys-table-responsive">
            <table class="sys-table">
              <thead>
                <tr>
                  <th>Zaman Damgası</th>
                  <th>Eylem</th>
                  <th>Hukuk Bürosu</th>
                  <th>Kullanıcı</th>
                  <th>Detaylar</th>
                  <th>IP Adresi</th>
                </tr>
              </thead>
              <tbody id="audit-table-body">
                <tr><td colspan="6" style="text-align:center; padding:24px;">Yükleniyor...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </main>
  </div>

  <!-- ================= MODALS ================= -->

  <!-- 1. Büro Yönetim Modalı -->
  <div id="sys-tenant-modal" class="sys-modal-backdrop">
    <div class="sys-modal">
      <div class="sys-modal-header">
        <h3 class="sys-modal-title">Büro Detay ve Abonelik Ayarı</h3>
        <button class="sys-modal-close" onclick="SystemApp.closeTenantModal()">&times;</button>
      </div>
      <input type="hidden" id="modal-tenant-id">
      <div class="sys-input-group">
        <label class="sys-input-label">Hukuk Bürosu Adı</label>
        <input type="text" id="modal-tenant-name" class="sys-input">
      </div>
      <div class="sys-input-group">
        <label class="sys-input-label">Abonelik Paketi</label>
        <select id="modal-tenant-plan" class="sys-select" style="width:100%;">
          <option value="solo">Solo Avukat / Stajyer (1.250 ₺/Ay)</option>
          <option value="pro">Pro Hukuk Bürosu (2.950 ₺/Ay)</option>
          <option value="enterprise">Kurumsal & Ortaklık (6.500 ₺/Ay)</option>
        </select>
      </div>
      <div class="sys-input-group">
        <label class="sys-input-label">Çalışma Alanı Durumu</label>
        <select id="modal-tenant-status" class="sys-select" style="width:100%;">
          <option value="active">✓ Aktif (Erişim Açık)</option>
          <option value="suspended">⚠️ Askıya Alındı (Erişim Engelli)</option>
        </select>
      </div>
      <div class="sys-modal-footer">
        <button class="sys-btn-link" onclick="SystemApp.closeTenantModal()">Vazgeç</button>
        <button class="sys-btn-primary" style="width:auto;" onclick="SystemApp.saveTenantModal()">Kaydet</button>
      </div>
    </div>
  </div>

  <!-- 2. Şifre Sıfırlama Modalı -->
  <div id="sys-reset-password-modal" class="sys-modal-backdrop">
    <div class="sys-modal">
      <div class="sys-modal-header">
        <h3 class="sys-modal-title">Kullanıcı Şifresi Sıfırla</h3>
        <button class="sys-modal-close" onclick="SystemApp.closeResetPasswordModal()">&times;</button>
      </div>
      <input type="hidden" id="modal-reset-user-id">
      <p style="font-size:0.88rem; color:var(--sys-text-muted); margin-bottom:16px;">
        Kullanıcı: <strong id="modal-reset-user-name" style="color:#fff;">-</strong>
      </p>
      <div class="sys-input-group">
        <label class="sys-input-label">Yeni Belirlenecek Geçici Şifre</label>
        <input type="password" id="modal-reset-new-pass" class="sys-input" placeholder="En az 6 karakter...">
      </div>
      <div class="sys-modal-footer">
        <button class="sys-btn-link" onclick="SystemApp.closeResetPasswordModal()">Vazgeç</button>
        <button class="sys-btn-primary" style="width:auto;" onclick="SystemApp.handleResetPassword()">Şifreyi Güncelle</button>
      </div>
    </div>
  </div>

  <!-- Toast Notification Box -->
  <div id="sys-toast" class="sys-toast">İşlem tamamlandı.</div>

  <script src="/js/system.js"></script>
</body>
</html>
