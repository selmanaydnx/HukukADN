<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ADN | Avukat İş Takip & Çok Bürolu Hukuk Yönetim Platformu</title>
  <meta name="description" content="Türkiye'deki avukatlar ve hukuk büroları için TBB tavsiye ilkeleri ve KVKK uyumlu, dosya, duruşma, süre, müvekkil ve finans takip platformu.">
  
  <!-- CSS Stylesheet -->
  <link rel="stylesheet" href="css/style.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚖️</text></svg>">
</head>
<body>

  <!-- ==========================================================================
       1. ZİYARETÇİ / PUBLIC GÖRÜNÜMÜ (Oturum Açılmadığında)
       ========================================================================== -->
  <div id="public-view" style="display: none;">
    <!-- Public Header -->
    <nav class="app-topbar" style="background: #0f172a; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <div class="topbar-left">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
              <path d="M7 21h10"></path>
              <path d="M12 3v18"></path>
              <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path>
            </svg>
          </div>
          <div>
            <div class="brand-title" style="font-size: 18px;">ADN</div>
            <div class="brand-sub">Hukuk Teknolojisi</div>
          </div>
        </div>
      </div>
      <div class="topbar-right">
        <button class="btn btn-secondary" onclick="App.showCalculatorModal()" style="color: #cbd5e1; border-color: rgba(255,255,255,0.2); background: transparent;">
          ⏱️ HMK & UETS Hesapla
        </button>
        <button class="btn btn-secondary" onclick="App.showAuthScreen('login')" style="color: #cbd5e1; border-color: rgba(255,255,255,0.2); background: transparent;">
          Giriş Yap
        </button>
        <button class="btn btn-primary" onclick="App.showAuthScreen('register')">
          Büro Hesabı Aç (Kayıt Ol)
        </button>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="landing-hero">
      <div class="hero-badge">
        <span>⚖️ Türk Avukatları ve Hukuk Büroları İçin Güvenli Çalışma Alanı</span>
      </div>
      <h1 class="hero-title">Daha Fazla Zamana, Daha Fazla Adalet</h1>
      <p class="hero-desc">
        Dosya, müvekkil CRM, duruşma, tebligat süreleri ve tahsilat takibi tek platformda. 
        Türkiye Barolar Birliği meslek kurallarına ve KVKK veri izolasyonuna tam uyumlu çok bürolu mimari.
      </p>
      <div class="hero-cta-group">
        <button class="btn btn-primary" style="padding: 12px 24px; font-size: 15px;" onclick="App.showAuthScreen('register')">
          Büronuzu Oluşturun — Hemen Kayıt Olun
        </button>
        <button class="btn btn-secondary" style="padding: 12px 20px; font-size: 15px; color: #fff; background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2);" onclick="App.showCalculatorModal()">
          HMK & UETS Süre Hesaplama Motoru
        </button>
      </div>

      <!-- Landing Hero Vitrin Görseli & Dashboard Önizlemesi -->
      <div class="hero-showcase-container">
        <div class="hero-showcase-glow"></div>
        <div class="hero-showcase-frame">
          <div class="showcase-browser-bar">
            <span class="showcase-dot red"></span>
            <span class="showcase-dot yellow"></span>
            <span class="showcase-dot green"></span>
            <span class="showcase-address-bar">🔒 https://adn.av.tr/workspace/dashboard — ADN Çok Bürolu Hukuk Teknolojisi Platformu</span>
          </div>
          <img src="img/adn_hero_showcase.jpg" alt="ADN Hukuk Yönetim Paneli" class="hero-showcase-img" loading="lazy">
        </div>
      </div>
    </section>

    <!-- Trust Pillars -->
    <div class="trust-pillars">
      <div class="pillar-card">
        <div style="font-size: 28px;">🏛️</div>
        <h2 class="pillar-title">Dürüst UYAP & UETS Entegrasyon Sınırları</h2>
        <p class="pillar-desc">
          Resmi API erişimi olmadan "otomatik senkronizasyon" iddiasında bulunulmaz. 
          Resmi UYAP Avukat Portal bağlantıları, UETS 5 günlük yasal tebliğ karinesi hesabı ve dosya içe alma denetimi sunulur. Asla e-Devlet şifresi talep edilmez.
        </p>
      </div>
      <div class="pillar-card">
        <div style="font-size: 28px;">🤖</div>
        <h2 class="pillar-title">TBB Uyumlu Yapay Zekâ & İnsan Denetimi</h2>
        <p class="pillar-desc">
          TBB tavsiye rehberine uygun olarak tüm çıktılar "Taslak — Avukat Kontrolü Gerekli" ibarelidir.
          Doğrulanmamış kaynak veya hayali içtihat uydurulmaz, mesleki sır ve harici AI veri aktarımı varsayılan olarak kapalıdır.
        </p>
      </div>
      <div class="pillar-card">
        <div style="font-size: 28px;">🛡️</div>
        <h2 class="pillar-title">Büro İzolasyonu & KVKK Denetim İzi</h2>
        <p class="pillar-desc">
          Her hukuk bürosu bağımsız veritabanı ayrımıyla korunur (OWASP Multi-Tenancy). 
          Hangi kullanıcının hangi dosyayı ve evrakı incelediği IP bazlı zaman damgalı audit trail ile kayıt altındadır.
        </p>
      </div>
    </div>

    <!-- Quick Features & Pricing Section -->
    <div id="landing-pricing" style="max-width: 1100px; margin: 40px auto; padding: 0 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3); font-size: 13px; padding: 6px 14px; border-radius: 999px;">
          ⚖️ Türkiye Barolar Birliği ve KVKK Standartlarında Hukuk Paketleri
        </span>
        <h2 style="font-size: 28px; font-weight: 800; margin-top: 14px; margin-bottom: 8px;">
          Büronuzun İhtiyacına Uygun Şeffaf Çözümler
        </h2>
        <p style="color: var(--text-muted); max-width: 650px; margin: 0 auto 16px;">
          14 gün boyunca tüm Pro büro özelliklerini <strong>kredi kartı girmeden</strong> ücretsiz deneyin. Süre sonunda otomatik çekim yapılmaz.
        </p>
        <div style="display: inline-block; background: rgba(59, 130, 246, 0.1); border: 1px dashed rgba(59, 130, 246, 0.4); border-radius: 8px; padding: 6px 16px; font-size: 12px; color: #60a5fa;">
          🧪 [Demo Fiyatlandırma - Test/Sandbox Modu]: Fiyatlar ve limitler canlı öncesi yapılandırma aşamasındadır.
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <!-- Solo Kart -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--border-color); border-radius: 16px; padding: 28px 24px; background: #ffffff;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="font-size: 20px; font-weight: 700; color: #0f172a;">Bireysel (Solo)</h3>
              <span class="badge" style="background: rgba(148, 163, 184, 0.2); color: #475569;">Tek Avukat</span>
            </div>
            <div style="margin-bottom: 16px;">
              <span style="font-size: 32px; font-weight: 800; color: #0f172a;">1.250 ₺</span>
              <span style="font-size: 13px; color: var(--text-muted);">/ ay (+ %20 KDV)</span>
              <div style="font-size: 12px; color: #059669; font-weight: 600; margin-top: 4px;">Yıllık peşin: 12.000 ₺ (2 ay ücretsiz)</div>
            </div>
            <ul style="list-style: none; padding: 0; margin-bottom: 24px; font-size: 13px; color: #334155; line-height: 1.8;">
              <li>✓ 1 Avukat Çalışma Alanı</li>
              <li>✓ 150 Aktif Dava & İcra Dosyası</li>
              <li>✓ 15 GB Evrak Depolama</li>
              <li>✓ 150 TBB Uyumlu AI Analiz / Ay</li>
              <li>✓ HMK, İİK & UETS Süre Motoru</li>
              <li>✓ Av. K. m.56 Yetki Belgesi Üretici</li>
              <li>✓ 2 Adımlı Doğrulama & Veri Ayrımı</li>
              <li>✓ KVKK m.11 JSON Veri Dışa Aktarma</li>
            </ul>
          </div>
          <button class="btn btn-secondary" style="width: 100%; font-weight: 700;" onclick="App.selectPlanAndRegister('solo')">
            14 Gün Ücretsiz Dene
          </button>
        </div>

        <!-- Pro Kart -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border: 2px solid var(--primary-accent); border-radius: 16px; padding: 28px 24px; position: relative; background: #ffffff; box-shadow: 0 10px 25px -5px rgba(37,99,235,0.1);">
          <div style="position: absolute; top: -12px; right: 24px; background: var(--primary-accent); color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 999px; text-transform: uppercase;">
            En Çok Tercih Edilen
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="font-size: 20px; font-weight: 700; color: #0f172a;">Büro (Pro)</h3>
              <span class="badge" style="background: rgba(37, 99, 235, 0.15); color: #1d4ed8; font-weight: 700;">Ekip Odaklı</span>
            </div>
            <div style="margin-bottom: 16px;">
              <span style="font-size: 32px; font-weight: 800; color: #0f172a;">2.950 ₺</span>
              <span style="font-size: 13px; color: var(--text-muted);">/ ay (+ %20 KDV)</span>
              <div style="font-size: 12px; color: #059669; font-weight: 600; margin-top: 4px;">Yıllık peşin: 28.320 ₺ (%20 İndirimli)</div>
            </div>
            <ul style="list-style: none; padding: 0; margin-bottom: 24px; font-size: 13px; color: #334155; line-height: 1.8;">
              <li>✓ <strong>5 Avukat & Stajyer / Kâtip</strong></li>
              <li>✓ <strong>750 Aktif Dosya Takip Kapasitesi</strong></li>
              <li>✓ <strong>75 GB Güvenli Evrak Depolama</strong></li>
              <li>✓ <strong>750 TBB Uyumlu AI Analiz / Ay</strong></li>
              <li>✓ Duruşma Zabıt Notu & Celse Takibi</li>
              <li>✓ SMM & İcra Kapak Hesabı Paketi</li>
              <li>✓ Adliye Masraf & Harç Pusulası</li>
              <li>✓ 2FA, Veri Ayrımı & JSON Export</li>
            </ul>
          </div>
          <button class="btn btn-primary" style="width: 100%; font-weight: 700;" onclick="App.selectPlanAndRegister('pro')">
            🚀 14 Gün Ücretsiz Başla (Kartsız)
          </button>
        </div>

        <!-- Kurumsal Kart -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--border-color); border-radius: 16px; padding: 28px 24px; background: #ffffff;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="font-size: 20px; font-weight: 700; color: #0f172a;">Kurumsal & Ortaklık</h3>
              <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #6d28d9; font-weight: 700;">Geniş Ekipler</span>
            </div>
            <div style="margin-bottom: 16px;">
              <span style="font-size: 32px; font-weight: 800; color: #0f172a;">6.500 ₺</span>
              <span style="font-size: 13px; color: var(--text-muted);">/ ay veya Özel Teklif</span>
              <div style="font-size: 12px; color: #7c3aed; font-weight: 600; margin-top: 4px;">Özel baro/kurum anlaşmaları geçerlidir</div>
            </div>
            <ul style="list-style: none; padding: 0; margin-bottom: 24px; font-size: 13px; color: #334155; line-height: 1.8;">
              <li>✓ 25 Kullanıcıya Kadar Esnek Yetkilendirme</li>
              <li>✓ 5.000 Dosya Kapasitesi</li>
              <li>✓ 300 GB Evrak & UDF Depolama</li>
              <li>✓ 3.000 TBB AI Sorgusu / Ay</li>
              <li>✓ Özel KVKK Denetim İzi & JSON Yedekleme</li>
              <li>✓ Öncelikli WhatsApp & Telefon Destek Hattı</li>
              <li>✓ Özel Yetkilendirme & Rol Yönetimi</li>
            </ul>
          </div>
          <button class="btn btn-secondary" style="width: 100%; font-weight: 700;" onclick="App.showCorporateContactModal()">
            📞 İletişime Geçin & Teklif Alın
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ==========================================================================
       DEDICATED KAYIT & GİRİŞ EKRANI (AUTH SCREEN VIEW)
       ========================================================================== -->
  <div id="auth-screen-view" class="auth-page-wrapper" style="display: none;">
    <div class="auth-split-card">
      <!-- Sol Panel: Marka, İlkeler & Mesleki Güvence -->
      <div class="auth-brand-side">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
            <div class="brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
                <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
                <path d="M7 21h10"></path>
                <path d="M12 3v18"></path>
                <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path>
              </svg>
            </div>
            <div>
              <div class="brand-title" style="font-size: 20px;">ADN</div>
              <div class="brand-sub">Hukuk Teknolojisi</div>
            </div>
          </div>

          <div class="auth-brand-badge">
            ⚖️ TBB & KVKK UYUMLU ÇALIŞMA ALANI
          </div>

          <h1 class="auth-brand-headline">
            Hukuk Büronuz İçin Bağımsız ve Güvenli Çalışma Alanı
          </h1>
          <p class="auth-brand-sub">
            30 saniye içinde büronuzu kurun; dava dosyaları, müvekkil CRM, tebligat süreleri ve tahsilat takibini tek platformdan yönetmeye başlayın.
          </p>

          <div class="auth-features-list">
            <div class="auth-feature-item">
              <div class="auth-feature-icon">🛡️</div>
              <div>
                <div class="auth-feature-title">OWASP Büro İzolasyonu</div>
                <div class="auth-feature-desc">Her büro bağımsız bir çalışma alanıdır; verileriniz diğer bürolarla asla karışmaz.</div>
              </div>
            </div>
            <div class="auth-feature-item">
              <div class="auth-feature-icon">📬</div>
              <div>
                <div class="auth-feature-title">UETS & HMK Süre Motoru</div>
                <div class="auth-feature-desc">Tebligat K. m. 7/a (5 gün) ve hafta sonu ertelemesiyle hak kaybını önler.</div>
              </div>
            </div>
            <div class="auth-feature-item">
              <div class="auth-feature-icon">🤖</div>
              <div>
                <div class="auth-feature-title">TBB Uyumlu Yapay Zekâ</div>
                <div class="auth-feature-desc">Avukat denetimli taslaklar, kaynak atfı zorunluluğu ve sıfır halüsinasyon.</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="auth-quote">
            "Avukatın bağımsızlığı, mesleki sırrı ve müvekkil mahremiyeti vazgeçilmezdir."
          </div>
          <div style="margin-top: 14px;">
            <button class="btn btn-secondary btn-sm" onclick="App.showLanding()" style="color: #cbd5e1; border-color: rgba(255,255,255,0.2); background: transparent;">
              ← Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>

      <!-- Sağ Panel: Kayıt & Giriş Formu -->
      <div class="auth-form-side">
        <div class="auth-tab-bar">
          <button id="tab-btn-register" class="auth-tab-btn active" onclick="App.switchAuthTab('register')">
            🏢 Yeni Büro Kaydı (Kayıt Ol)
          </button>
          <button id="tab-btn-login" class="auth-tab-btn" onclick="App.switchAuthTab('login')">
            🔑 Giriş Yap
          </button>
        </div>

        <div id="auth-screen-alert" class="auth-alert-box"></div>

        <!-- KAYIT FORMU -->
        <div id="pane-register">
          <div class="auth-form-title">Yeni Hukuk Bürosu Açılışı</div>
          <div class="auth-form-desc">
            Büronuzun kurucu avukatı olarak bilgilerinizi giriniz. Çalışma alanınız anında hazırlanacaktır.
          </div>

          <form onsubmit="App.handleScreenRegister(event)">
            <div class="auth-form-grid">
              <div class="form-group">
                <label class="form-label">Avukat Adı ve Soyadı *</label>
                <input type="text" id="screen-reg-fullname" class="form-control" placeholder="Av. Kemal Erdem" required>
              </div>

              <div class="form-group">
                <label class="form-label">E-posta Adresi *</label>
                <input type="email" id="screen-reg-email" class="form-control" placeholder="kemal@erdemhukuk.av.tr" required>
              </div>

              <div class="form-group full-width">
                <label class="form-label">Hukuk Bürosu / Ortaklık Adı *</label>
                <input type="text" id="screen-reg-officename" class="form-control" placeholder="Erdem & Ortakları Avukatlık Ortaklığı" required>
              </div>

              <div class="form-group">
                <label class="form-label">Şehir *</label>
                <input type="text" id="screen-reg-city" class="form-control" placeholder="Ankara" required>
              </div>

              <div class="form-group">
                <label class="form-label">Kayıtlı Baro</label>
                <input type="text" id="screen-reg-barcity" class="form-control" placeholder="Ankara Barosu">
              </div>

              <div class="form-group">
                <label class="form-label">Baro Sicil Numarası</label>
                <input type="text" id="screen-reg-barnumber" class="form-control" placeholder="34821">
              </div>

              <div class="form-group">
                <label class="form-label">Parola * (En az 8 karakter)</label>
                <input type="password" id="screen-reg-password" class="form-control" placeholder="••••••••" minlength="8" required>
              </div>

              <div class="form-group full-width" style="margin-top: 4px;">
                <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: var(--text-muted); cursor: pointer;">
                  <input type="checkbox" id="screen-reg-terms" required style="margin-top: 2px;">
                  <span>
                    <a onclick="App.showLegalModal('kvkk')" style="color: var(--primary-accent); text-decoration: underline;">Kullanım Koşulları, KVKK Metni</a> ve TBB ilkelerini okudum, anladım ve kabul ediyorum. e-Devlet şifresi veya e-imza PIN'i toplanmadığını onaylıyorum.
                  </span>
                </label>
              </div>
            </div>

            <div style="margin-top: 20px;">
              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 11px 16px; font-size: 14px; font-weight: 700;">
                🚀 Büro Çalışma Alanını Oluştur ve Başla
              </button>
            </div>

            <div style="text-align: center; margin-top: 16px; font-size: 13px; color: var(--text-muted);">
              Zaten bir büro hesabınız var mı? 
              <a onclick="App.switchAuthTab('login')" style="color: var(--primary-accent); font-weight: 600; cursor: pointer;">Giriş Yapın</a>
            </div>
          </form>
        </div>

        <!-- GİRİŞ FORMU -->
        <div id="pane-login" style="display: none;">
          <div class="auth-form-title">Büro Hesabınıza Giriş Yapın</div>
          <div class="auth-form-desc">
            Kayıtlı e-posta adresiniz ve parolanız ile çalışma alanınıza erişin.
          </div>

          <form onsubmit="App.handleScreenLogin(event)">
            <div class="form-group">
              <label class="form-label">E-posta Adresi *</label>
              <input type="email" id="screen-login-email" class="form-control" placeholder="avukat@buroadi.av.tr" required>
            </div>

            <div class="form-group">
              <label class="form-label">Parola *</label>
              <input type="password" id="screen-login-password" class="form-control" placeholder="••••••••" required>
            </div>

            <div style="margin-top: 20px;">
              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 11px 16px; font-size: 14px; font-weight: 700;">
                🔑 Güvenli Giriş Yap
              </button>
            </div>

            <div style="text-align: center; margin-top: 16px; font-size: 13px; color: var(--text-muted);">
              Henüz bir büronuz yok mu? 
              <a onclick="App.switchAuthTab('register')" style="color: var(--primary-accent); font-weight: 600; cursor: pointer;">Yeni Büro Kaydı Açın</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- ==========================================================================
       2. ÇALIŞMA ALANI GÖRÜNÜMÜ (Oturum Açıldığında)
       ========================================================================== -->
  <div id="auth-app-view" class="app-layout" style="display: none;">
    <!-- Sol Menü (Sidebar) -->
    <aside class="app-sidebar">
      <div class="sidebar-header">
        <div class="brand-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
            <path d="M7 21h10"></path>
            <path d="M12 3v18"></path>
            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path>
          </svg>
        </div>
        <div>
          <div class="brand-title">ADN</div>
          <div class="brand-sub">Hukuk Çalışma Alanı</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-group-title">Yönetim & Süreç</div>
        <a class="nav-link active" onclick="App.navigate('dashboard')" id="nav-dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          <span>Ana Panel</span>
        </a>
        <a class="nav-link" onclick="App.navigate('clients')" id="nav-clients">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Müvekkiller (CRM)</span>
        </a>
        <a class="nav-link" onclick="App.navigate('cases')" id="nav-cases">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
          <span>Dava & İcra Dosyaları</span>
          <span class="nav-badge" id="badge-active-cases">0</span>
        </a>
        <a class="nav-link" onclick="App.navigate('calendar')" id="nav-calendar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
          <span>Duruşma & Süre Takvimi</span>
        </a>
        <a class="nav-link" onclick="App.navigate('procedural')" id="nav-procedural">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>HMK / UETS Süre Motoru</span>
        </a>
        <a class="nav-link" onclick="App.navigate('tasks')" id="nav-tasks">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          <span>İş & Görev Takibi</span>
          <span class="nav-badge danger" id="badge-pending-tasks">0</span>
        </a>

        <div class="nav-group-title">Büro Araçları & Teknoloji</div>
        <a class="nav-link" onclick="App.navigate('authorization-cert')" id="nav-authorization-cert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          <span>Yetki Belgesi (Tevkil)</span>
          <span class="nav-badge" style="background: rgba(16,185,129,0.2); color: #10b981;">m.56</span>
        </a>
        <a class="nav-link" onclick="App.navigate('legal-calc')" id="nav-legal-calc">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
          <span>Hukuki Hesaplama Paketi</span>
          <span class="nav-badge" style="background: rgba(139,92,246,0.2); color: #8b5cf6;">2026</span>
        </a>
        <a class="nav-link" onclick="App.navigate('petition-templates')" id="nav-petition-templates">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>
          <span>Dilekçe Taslakları</span>
        </a>
        <a class="nav-link" onclick="App.navigate('documents')" id="nav-documents">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Evrak & UDF Dosya Merkezi</span>
        </a>
        <a class="nav-link" onclick="App.navigate('finance')" id="nav-finance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
          <span>Finans, Masraf & Tahsilat</span>
        </a>
        <a class="nav-link" onclick="App.navigate('ai-assistant')" id="nav-ai-assistant">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/></svg>
          <span>Hukuk Asistanı</span>
          <span class="nav-badge" style="background: rgba(37,99,235,0.4); color: #93c5fd;">AI</span>
        </a>
        <a class="nav-link" onclick="App.navigate('tenant-settings')" id="nav-tenant-settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Büro Ayarları & Ekip</span>
        </a>
        <a class="nav-link" onclick="App.navigate('subscription')" id="nav-subscription">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M6 15h2"/><path d="M12 15h6"/></svg>
          <span>Abonelik & Paketler</span>
          <span class="nav-badge" id="badge-subscription-status" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">Deneme</span>
        </a>
        <a class="nav-link" onclick="App.navigate('audit-logs')" id="nav-audit-logs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>KVKK Denetim İzi</span>
        </a>
      </nav>

      <div style="padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11px;">
        <a onclick="App.showLegalModal('uyap')" style="color: #94a3b8; cursor: pointer; text-decoration: none; display: flex; align-items: center; gap: 6px;">
          <span>🛡️</span> <span>Güvenlik ve Entegrasyon Bilgileri</span>
        </a>
      </div>

      <div class="sidebar-footer">
        <div>
          <div style="font-weight: 600; color: #f8fafc;" id="lbl-sidebar-user">Av. Kullanıcı</div>
          <div style="color: #64748b; font-size: 11px;" id="lbl-sidebar-role">Büro Sahibi</div>
        </div>
        <button onclick="App.logout()" class="btn btn-secondary btn-sm" style="color: #ef4444; border-color: rgba(239,68,68,0.3);" title="Çıkış Yap">
          Çıkış
        </button>
      </div>
    </aside>

    <!-- Mobil Menü Karartma Katmanı -->
    <div id="sidebar-backdrop" class="sidebar-backdrop" onclick="App.toggleMobileSidebar()"></div>

    <!-- Ana İçerik Bölgesi -->
    <main class="main-wrapper">
      <!-- Topbar -->
      <div class="app-topbar">
        <div class="topbar-left">
          <button type="button" class="sidebar-mobile-toggle" onclick="App.toggleMobileSidebar()" title="Menüyü Aç/Kapat">
            ☰
          </button>
          <div class="tenant-selector" onclick="App.showTenantSwitchModal()">
            <span style="font-size: 16px;">🏢</span>
            <span id="topbar-tenant-name">Hukuk Bürosu</span>
            <span class="tenant-badge" id="topbar-tenant-role">Büro Sahibi</span>
            <span style="font-size: 11px; color: var(--text-muted);">▼</span>
          </div>

          <!-- UYAP Resmi Bağlantısı -->
          <a href="https://vatandas.uyap.gov.tr/main/avukat.jsp" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" title="Resmi UYAP Avukat Portalına yeni sekmede git">
            🏛️ UYAP Avukat Portal ↗
          </a>
        </div>

        <!-- Hızlı Arama & Komuta Merkezi (Spotlight) -->
        <div class="topbar-search" onclick="App.openCommandPalette()" title="Hızlı Arama & Komuta Merkezi (Kısayol: Ctrl+K veya /)">
          <span style="font-size: 14px; opacity: 0.7;">🔍</span>
          <span class="search-placeholder">Dosya, müvekkil, esas no veya süre ara...</span>
          <span class="search-shortcut">Ctrl+K</span>
        </div>

        <div class="topbar-right">
          <!-- Bildirim Butonu & Drawer -->
          <div class="notification-wrapper">
            <button class="notification-bell-btn" onclick="App.toggleNotificationDrawer()" title="Bildirim Merkezi & Kritik Hatırlatmalar">
              <svg class="bell-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
              </svg>
              <span class="notification-ping" id="notif-ping"></span>
              <span class="notification-badge-count" id="notif-badge-count">0</span>
            </button>

            <!-- Bildirim Paneli -->
            <div id="notification-drawer" class="notification-drawer" style="display: none;">
              <div class="notif-header">
                <div class="notif-title">
                  <span>🔔 Bildirim Merkezi</span>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="App.markAllNotificationsRead()" style="font-size: 11px; padding: 2px 8px;">
                  Okundu Say
                </button>
              </div>

              <!-- Mini Grafik Özeti -->
              <div class="notif-summary-chart" id="notif-summary-chart">
                <div class="notif-chart-item">
                  <div class="notif-chart-val amber" id="notif-stat-hearings">0</div>
                  <div class="notif-chart-label">Celse</div>
                </div>
                <div class="notif-chart-item" style="border-left: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1); padding: 0 12px;">
                  <div class="notif-chart-val red" id="notif-stat-deadlines">0</div>
                  <div class="notif-chart-label">Kritik Süre</div>
                </div>
                <div class="notif-chart-item">
                  <div class="notif-chart-val blue" id="notif-stat-tasks">0</div>
                  <div class="notif-chart-label">Acil Görev</div>
                </div>
              </div>

              <div class="notif-tabs">
                <button class="notif-tab-btn active" onclick="App.filterNotifications('all', this)">Tümü</button>
                <button class="notif-tab-btn" onclick="App.filterNotifications('duruşma', this)">🏛️ Celseler</button>
                <button class="notif-tab-btn" onclick="App.filterNotifications('sure', this)">⏱️ Süreler</button>
                <button class="notif-tab-btn" onclick="App.filterNotifications('gorev', this)">⚡ Görevler</button>
              </div>

              <div class="notif-body" id="notif-items-list">
                <!-- Bildirimler JS ile yüklenecek -->
              </div>
            </div>
          </div>

          <!-- Hızlı Ekle Butonu -->
          <div style="position: relative;">
            <button class="btn btn-primary" onclick="App.toggleQuickMenu()">
              + Hızlı Ekle
            </button>
            <div id="quick-menu" style="display: none; position: absolute; right: 0; top: 38px; background: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); width: 190px; padding: 6px; z-index: 50;">
              <div style="padding: 8px 12px; cursor: pointer; border-radius: 4px; font-size: 13px;" onclick="App.openNewCaseModal(); App.toggleQuickMenu();">⚖️ Yeni Dava Dosyası</div>
              <div style="padding: 8px 12px; cursor: pointer; border-radius: 4px; font-size: 13px;" onclick="App.openNewClientModal(); App.toggleQuickMenu();">👥 Yeni Müvekkil</div>
              <div style="padding: 8px 12px; cursor: pointer; border-radius: 4px; font-size: 13px;" onclick="App.openHearingNotesModal(); App.toggleQuickMenu();">📝 Duruşma Zabıt Notu Gir</div>
              <div style="padding: 8px 12px; cursor: pointer; border-radius: 4px; font-size: 13px;" onclick="App.openCourtExpenseModal(); App.toggleQuickMenu();">🧾 Adliye Masraf Pusulası</div>
              <div style="padding: 8px 12px; cursor: pointer; border-radius: 4px; font-size: 13px;" onclick="App.openNewEventModal(); App.toggleQuickMenu();">📅 Yeni Duruşma / Süre</div>
              <div style="padding: 8px 12px; cursor: pointer; border-radius: 4px; font-size: 13px;" onclick="App.openNewTaskModal(); App.toggleQuickMenu();">✅ Yeni Görev</div>
              <div style="padding: 8px 12px; cursor: pointer; border-radius: 4px; font-size: 13px;" onclick="App.openNewFinanceModal(); App.toggleQuickMenu();">💰 Tahsilat / Masraf Kaydı</div>
            </div>
          </div>

          <!-- Kullanıcı Rozeti -->
          <div class="user-profile-badge">
            <div class="user-avatar" id="topbar-avatar">AK</div>
            <div class="user-info">
              <div class="user-name" id="topbar-user-name">Av. Kemal Erdem</div>
              <div class="user-role" id="topbar-user-bar">Ankara Barosu (Sicil: 34821)</div>
            </div>
          </div>
        </div>
      </div> <!-- /app-topbar -->

      <!-- Üst Abonelik & Deneme Bildirim Bandı -->
      <div id="tenant-subscription-banner" style="display: none; margin: 16px 28px 0 28px;"></div>

      <!-- Dinamik Sayfa Görüntüleyici -->
      <section class="content-area" id="spa-content">
        <!-- JS Tarafından Görünüm İçeriği Yüklenecek -->
      </section>
    </main>
  </div>

  <!-- ==========================================================================
       MODALLAR & DİYALOGLAR
       ========================================================================== -->
  
  <!-- 1. Giriş Modal -->
  <div id="modal-login" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">Büro Hesabınıza Giriş Yapın</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <form onsubmit="App.handleLogin(event)">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">E-posta Adresi</label>
            <input type="email" id="login-email" class="form-control" placeholder="avukat@buroadi.av.tr" required>
          </div>
          <div class="form-group">
            <label class="form-label">Parola</label>
            <input type="password" id="login-password" class="form-control" placeholder="••••••••" required>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
            Güvenlik: Hatalı denemelere karşı hız sınırlaması ve scrypt tuzlaması aktiftir.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModals(); App.openRegisterModal();">Yeni Büro Kaydı Aç</button>
          <button type="submit" class="btn btn-primary">Giriş Yap</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 2. Kayıt / Büro Açılış Modal -->
  <div id="modal-register" class="modal-overlay">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title">Yeni Hukuk Bürosu & Avukat Çalışma Alanı Açın</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <form onsubmit="App.handleRegister(event)">
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label">Avukat Adı ve Soyadı *</label>
              <input type="text" id="reg-fullname" class="form-control" placeholder="Av. Kemal Erdem" required>
            </div>
            <div class="form-group">
              <label class="form-label">E-posta Adresi *</label>
              <input type="email" id="reg-email" class="form-control" placeholder="kemal@erdemhukuk.av.tr" required>
            </div>
            <div class="form-group">
              <label class="form-label">Hukuk Bürosu / Ortaklık Adı *</label>
              <input type="text" id="reg-officename" class="form-control" placeholder="Erdem & Ortakları Avukatlık Bürosu" required>
            </div>
            <div class="form-group">
              <label class="form-label">Şehir *</label>
              <input type="text" id="reg-city" class="form-control" placeholder="Ankara" required>
            </div>
            <div class="form-group">
              <label class="form-label">Kayıtlı Baro</label>
              <input type="text" id="reg-barcity" class="form-control" placeholder="Ankara Barosu">
            </div>
            <div class="form-group">
              <label class="form-label">Baro Sicil Numarası</label>
              <input type="text" id="reg-barnumber" class="form-control" placeholder="34821">
            </div>
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Güçlü Parola * (En az 8 karakter)</label>
              <input type="password" id="reg-password" class="form-control" placeholder="••••••••" minlength="8" required>
            </div>
          </div>

          <div style="margin-top: 14px; padding: 12px; background: #f8fafc; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 12px;">
            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="reg-terms" required style="margin-top: 3px;">
              <span>
                <strong>Kullanım Koşulları ve KVKK Aydınlatma Metnini</strong> okudum, anladım ve kabul ediyorum. 
                Sistemin bağımsız bir büro otomasyonu olduğunu, e-imza PIN'i toplamadığını ve harici veri aktarımının izne tabi olduğunu onaylıyorum.
              </span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModals(); App.openLoginModal();">Mevcut Hesaba Giriş</button>
          <button type="submit" class="btn btn-primary">Büroyu Oluştur ve Başla</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 3. Yeni Müvekkil Modal -->
  <div id="modal-new-client" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">Yeni Müvekkil Kaydı</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <form onsubmit="App.handleCreateClient(event)">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Müvekkil Türü</label>
            <select id="client-type" class="form-control">
              <option value="individual">Gerçek Kişi</option>
              <option value="corporate">Tüzel Kişi / Şirket</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ad Soyad / Şirket Unvanı *</label>
            <input type="text" id="client-name" class="form-control" onblur="App.checkClientConflict()" placeholder="Örn: Atlas Teknoloji A.Ş. veya Ahmet Yılmaz" required>
          </div>
          <div class="form-group">
            <label class="form-label">TC Kimlik No / Vergi Kimlik No (Hassas Bilgi)</label>
            <input type="text" id="client-identity" class="form-control" onblur="App.checkClientConflict()" placeholder="11 haneli TCKN veya 10 haneli VKN">
          </div>
          <div id="client-conflict-alert" style="display:none; padding: 10px; margin-bottom: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 12px; color: #92400e;">
            <!-- Çatışma Uyarısı -->
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group">
              <label class="form-label">Telefon</label>
              <input type="tel" id="client-phone" class="form-control" placeholder="0532 ...">
            </div>
            <div class="form-group">
              <label class="form-label">E-posta</label>
              <input type="email" id="client-email" class="form-control" placeholder="ornek@alanadi.com">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Vekâletname & Noter Bilgileri</label>
            <input type="text" id="client-notary" class="form-control" placeholder="Örn: Kadıköy 4. Noterliği, 12.02.2025 Tarih ve 18492 Yevmiye">
          </div>
          <div class="form-group">
            <label class="form-label">Notlar</label>
            <textarea id="client-notes" class="form-control" rows="2" placeholder="Müvekkil iletişim tercihleri, talimatlar..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModals()">İptal</button>
          <button type="submit" class="btn btn-primary">Müvekkili Kaydet</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 4. Yeni Dava Dosyası Modal -->
  <div id="modal-new-case" class="modal-overlay">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title">Yeni Dava / İcra Dosyası Açılışı</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <form onsubmit="App.handleCreateCase(event)">
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label">Müvekkil Seçimi *</label>
              <select id="case-client-id" class="form-control" required>
                <!-- Müvekkiller buraya yüklenecek -->
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Büro İçi Dosya Numarası *</label>
              <input type="text" id="case-internal-no" class="form-control" placeholder="2026/D-001" required>
            </div>
            <div class="form-group">
              <label class="form-label">Resmi Mahkeme Esas / İcra No</label>
              <input type="text" id="case-official-no" class="form-control" placeholder="2026/142 E.">
            </div>
            <div class="form-group">
              <label class="form-label">Dava / Takip Türü *</label>
              <select id="case-type" class="form-control" required>
                <option value="dava">Hukuk Davası</option>
                <option value="ceza">Ceza Davası</option>
                <option value="icra">İcra Takibi</option>
                <option value="idari">İdari Yargı</option>
                <option value="arabuluculuk">Arabuluculuk</option>
                <option value="danismanlik">Hukuki Danışmanlık</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Mahkeme / İcra Dairesi / Merci</label>
              <input type="text" id="case-court-name" class="form-control" placeholder="Örn: Ankara 3. Asliye Ticaret Mahkemesi">
            </div>
            <div class="form-group">
              <label class="form-label">Yargılama Aşaması *</label>
              <select id="case-stage" class="form-control" required>
                <option value="dava_acildi">Dava Açıldı / Tensip Bekleniyor</option>
                <option value="on_inceleme">Ön İnceleme</option>
                <option value="tahkikat">Tahkikat</option>
                <option value="bilirkisi">Bilirkişi Raporu Aşamasında</option>
                <option value="karara_cikti">Karara Çıktı / Gerekçeli Karar Bekleniyor</option>
                <option value="istinaf">İstinaf Aşamasında</option>
                <option value="temyiz">Yargıtay / Danıştay Temyiz</option>
                <option value="kesinlesti">Kesinleşti</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Karşı Taraf (Davalı / Borçlu / Davacı)</label>
              <input type="text" id="case-opponent-name" class="form-control" placeholder="Örn: Kuzey Lojistik Ltd. Şti.">
            </div>
            <div class="form-group">
              <label class="form-label">Karşı Taraf Vekili (Avukatı)</label>
              <input type="text" id="case-opponent-counsel" class="form-control" placeholder="Örn: Av. Selin Demir">
            </div>
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Dava / Harca Esas Değer (TL)</label>
              <input type="number" step="0.01" id="case-claim-amount" class="form-control" placeholder="0.00">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModals()">İptal</button>
          <button type="submit" class="btn btn-primary">Dosyayı Aç</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 5. Yeni Duruşma / Süre Modal -->
  <div id="modal-new-event" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">Duruşma, Süre veya Keşif Kaydı</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <form onsubmit="App.handleCreateEvent(event)">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">İlişkili Dava Dosyası</label>
            <select id="event-case-id" class="form-control">
              <!-- Dosyalar buraya yüklenecek -->
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">İşlem Türü *</label>
            <select id="event-type" class="form-control" required onchange="App.handleEventTypeChange()">
              <option value="hearing">Duruşma (Celse)</option>
              <option value="discovery">Keşif / Bilirkişi İncelemesi</option>
              <option value="deadline">Yasal Süre (Cevap, İstinaf, İtiraz)</option>
              <option value="meeting">Müvekkil Görüşmesi / Toplantı</option>
              <option value="task">Büro İçi Takip / İşlem</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Başlık / Mahkeme Açıklaması *</label>
            <input type="text" id="event-title" class="form-control" placeholder="Örn: 2. Celse (Bilirkişi Ek Raporu İnceleme)" required>
          </div>
          <div class="form-group">
            <label class="form-label">Duruşma / İşlem Tarihi ve Saati *</label>
            <input type="datetime-local" id="event-date" class="form-control" required>
          </div>

          <!-- UETS & Tebligat Süre Hesaplayıcı Entegrasyonu -->
          <div id="uets-box" style="padding: 12px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 12px;">
            <div style="font-weight: 600; font-size: 12px; margin-bottom: 6px; color: #1e40af;">
              📬 UETS & HMK Süre Entegrasyonu (Tebligat K. m. 7/a)
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label">Tebligatın UETS Posta Kutusuna Ulaştığı Tarih</label>
              <input type="date" id="event-service-date" class="form-control" onchange="App.calculateUetsAutoDate()">
            </div>
            <div id="uets-calc-result" style="font-size: 12px; color: #475569;">
              Tarih seçildiğinde 5. günün sonunda tebliğ edilmiş sayılma tarihi otomatik hesaplanır.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Özel Notlar</label>
            <textarea id="event-notes" class="form-control" rows="2" placeholder="Duruşma salonu, delil listesi vb."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModals()">İptal</button>
          <button type="submit" class="btn btn-primary">Takvime Ekle</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 6. HMK & UETS Süre Hesaplama Modal (Hem Ziyaretçilere Hem Avukatlara Açık) -->
  <div id="modal-calculator" class="modal-overlay">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title">⏱️ Türk Usul Hukuku & UETS Süre Hesaplama Motoru</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <div class="form-group">
              <label class="form-label">Tebliğ / Başlangıç Tarihi *</label>
              <input type="date" id="calc-base-date" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">Hesaplanacak Usul Kuralı *</label>
              <select id="calc-rule-type" class="form-control" onchange="App.toggleCalcCustomDays()">
                <option value="hmk_2_weeks">HMK m. 92 - Cevap / İstinaf Süresi (2 Hafta)</option>
                <option value="iik_7_days">İİK m. 62 - Ödeme Emrine İtiraz (7 Gün)</option>
                <option value="cmk_7_days">CMK m. 273 - Ceza İstinaf Süresi (7 Gün)</option>
                <option value="iik_5_days">İİK m. 168 - Kambiyo Senetlerine İtiraz (5 Gün)</option>
                <option value="iyuk_30_days">İYUK m. 7 - İdari Yargı Dava / İstinaf (30 Gün)</option>
                <option value="custom">Özel Kesin Mehil (Gün Belirle)</option>
              </select>
            </div>
            <div class="form-group" id="calc-custom-days-box" style="display: none;">
              <label class="form-label">Mahkemece Verilen Kesin Gün Sayısı</label>
              <input type="number" id="calc-custom-days" class="form-control" value="10" min="1">
            </div>
            <div style="margin-top: 14px;">
              <button class="btn btn-primary" style="width: 100%;" onclick="App.executeProceduralCalculation()">
                Süreyi ve Hafta Sonu / Adli Tatil Rollover'ını Hesapla
              </button>
            </div>
          </div>

          <div id="calc-result-panel" style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; justify-content: center;">
            <div style="text-align: center; color: var(--text-muted);">
              Hesaplamak için sol taraftan başlangıç tarihi ve kuralı seçip "Hesapla" butonuna basınız.
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="App.closeModals()">Kapat</button>
      </div>
    </div>
  </div>

  <!-- 7. Hukuki Bilgilendirme Modal (UYAP, TBB, KVKK) -->
  <div id="modal-legal" class="modal-overlay">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title" id="legal-modal-title">Yasal Çerçeve & Mesleki İlkeler</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <div class="modal-body" id="legal-modal-body" style="font-size: 13px; line-height: 1.7; max-height: 65vh; overflow-y: auto;">
        <!-- Dinamik hukuki bilgilendirme metni -->
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" onclick="App.closeModals()">Anladım</button>
      </div>
    </div>
  </div>

  <!-- 8. Büro Değiştirme Modal (Multi-Tenancy Switcher) -->
  <div id="modal-switch-tenant" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">Çalışma Alanı / Büro Seçin</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <div class="modal-body" id="tenant-list-body">
        <!-- Kullanıcının kayıtlı olduğu bürolar listelenecek -->
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="App.closeModals()">İptal</button>
      </div>
    </div>
  </div>

  <!-- 9. Yeni Finans / Masraf / Tahsilat Kaydı Modal -->
  <div id="modal-new-finance" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">Ücret, Masraf veya Tahsilat Kaydı</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <form onsubmit="App.handleCreateFinance(event)">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">İlgili Dava Dosyası</label>
            <select id="finance-case-id" class="form-control">
              <!-- Dosyalar yüklenecek -->
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">İşlem Türü *</label>
            <select id="finance-type" class="form-control" required>
              <option value="collection">Tahsilat (Müvekkilden / Karşı Taraftan Alınan)</option>
              <option value="advance">Müvekkil Masraf Avansı</option>
              <option value="expense">Dava / Mahkeme Masrafı (Harç, Bilirkişi vb.)</option>
              <option value="fee">Akdi Vekâlet Ücreti Tahakkuku</option>
            </select>
          </div>
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
            <div class="form-group">
              <label class="form-label">Tutar *</label>
              <input type="number" step="0.01" id="finance-amount" class="form-control" placeholder="0.00" required>
            </div>
            <div class="form-group">
              <label class="form-label">Para Birimi</label>
              <select id="finance-currency" class="form-control">
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">İşlem Tarihi *</label>
            <input type="date" id="finance-date" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label">Açıklama / Makbuz Notu</label>
            <input type="text" id="finance-desc" class="form-control" placeholder="Örn: Bilirkişi gider avansı yatırıldı">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModals()">İptal</button>
          <button type="submit" class="btn btn-primary">Kaydet</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 10. Yeni Görev Modal -->
  <div id="modal-new-task" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">Yeni Görev / Büro İşi</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <form onsubmit="App.handleCreateTask(event)">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">İlgili Dosya (İsteğe Bağlı)</label>
            <select id="task-case-id" class="form-control">
              <!-- Dosyalar yüklenecek -->
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Görev Başlığı *</label>
            <input type="text" id="task-title" class="form-control" placeholder="Örn: Delil listesinin hazırlanması" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group">
              <label class="form-label">Son Teslim Tarihi</label>
              <input type="date" id="task-due-date" class="form-control">
            </div>
            <div class="form-group">
              <label class="form-label">Öncelik</label>
              <select id="task-priority" class="form-control">
                <option value="medium">Orta</option>
                <option value="high">Yüksek (Acil)</option>
                <option value="low">Düşük</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModals()">İptal</button>
          <button type="submit" class="btn btn-primary">Görevi Oluştur</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 11. Duruşma Zabıt Notu & Ara Karar Giriş Modal -->
  <div id="modal-hearing-notes" class="modal-overlay">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title">📝 Duruşma Zabıt Notu & Hızlı Ara Karar Girişi</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <form onsubmit="App.handleSaveHearingNotes(event)">
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">İlgili Dava / Duruşma Dosyası *</label>
              <select id="hearing-note-case-id" class="form-control" required>
                <!-- Dosyalar yüklenecek -->
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Celse / Duruşma Sonucu *</label>
              <select id="hearing-note-result" class="form-control" required>
                <option value="Duruşma Ertelendi (Ara Kararlar İfa Edilecek)">Duruşma Ertelendi (Ara Kararlar İfa Edilecek)</option>
                <option value="Bilirkişiye Tevdi Edildi / Ek Rapor Bekleniyor">Bilirkişiye Tevdi Edildi / Ek Rapor Bekleniyor</option>
                <option value="Karara Çıktı / Gerekçeli Karar Bekleniyor">Karara Çıktı / Gerekçeli Karar Bekleniyor</option>
                <option value="Deliller Toplanıyor / Tanık Dinlenecek">Deliller Toplanıyor / Tanık Dinlenecek</option>
                <option value="Mazeret Sunuldu / Kabul Edildi">Mazeret Sunuldu / Kabul Edildi</option>
                <option value="Görevsizlik / Yetkisizlik Kararı">Görevsizlik / Yetkisizlik Kararı</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Bir Sonraki Duruşma Tarihi ve Saati</label>
              <input type="datetime-local" id="hearing-note-next-date" class="form-control">
            </div>
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Mahkemece Verilen Ara Karar / Kesin Mehil (Varsa)</label>
              <input type="text" id="hearing-note-deadline-desc" class="form-control" placeholder="Örn: Davacı tarafa tanık listesi sunulması ve gider avansı ikmali için 2 hafta kesin mehil verildi.">
            </div>
            <div class="form-group">
              <label class="form-label">Kesin Mehil Süresi (Gün Sayısı)</label>
              <input type="number" id="hearing-note-deadline-days" class="form-control" placeholder="Örn: 14" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">Adliye / Duruşma Salonu</label>
              <input type="text" id="hearing-note-courtroom" class="form-control" placeholder="Örn: 2. Kat Duruşma Salonu No: 14">
            </div>
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Celse Zabıt Özeti & Beyanlar *</label>
              <textarea id="hearing-note-summary" class="form-control" rows="3" placeholder="Hakimin sözlü ara kararları, karşı taraf vekilinin beyanları ve dosyaya eklenen belgeler..." required></textarea>
            </div>
          </div>
          <div style="background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.2); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 12px; color: #1e40af; margin-top: 4px;">
            💡 <strong>Otomasyon:</strong> Bu form kaydedildiğinde bir sonraki duruşma otomatik olarak ajandaya işlenir ve ara karar varsa acil görev/süre olarak bildirim merkezine aktarılır.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModals()">İptal</button>
          <button type="submit" class="btn btn-primary">📝 Notu & Kararları Kaydet</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 12. Adliye Masraf & Harç Pusulası Modal -->
  <div id="modal-court-expense" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">🧾 Adliye Masraf & Avans Pusulası</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <form onsubmit="App.handleSaveCourtExpense(event)">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">İlgili Dava / Takip Dosyası *</label>
            <select id="court-expense-case-id" class="form-control" required>
              <!-- Dosyalar yüklenecek -->
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Masraf Kalemi / Kategorisi *</label>
            <select id="court-expense-category" class="form-control" required>
              <option value="Harç (Başvurma / Peşin / Suret)">Harç (Başvurma / Peşin / Suret / Karar)</option>
              <option value="Bilirkişi / Keşif Gider Avansı">Bilirkişi / Keşif Gider Avansı</option>
              <option value="Posta / Tebligat / Müzekkere">Posta / Tebligat / Müzekkere Gideri</option>
              <option value="İcra Haciz & Muhafaza Yolluğu">İcra Haciz & Muhafaza Yolluğu</option>
              <option value="Yol, Ulaşım & Otopark">Yol, Ulaşım & Otopark</option>
              <option value="Fotokopi & Kırtasiye">Fotokopi & Dosya Masrafı</option>
              <option value="Diğer Zorunlu Adliye Masrafı">Diğer Zorunlu Adliye Masrafı</option>
            </select>
          </div>
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
            <div class="form-group">
              <label class="form-label">Harcama Tutarı (TL) *</label>
              <input type="number" step="0.01" id="court-expense-amount" class="form-control" placeholder="0.00" required>
            </div>
            <div class="form-group">
              <label class="form-label">Harcama Tarihi *</label>
              <input type="date" id="court-expense-date" class="form-control" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Ödeme Kaynağı *</label>
            <select id="court-expense-payer" class="form-control" required>
              <option value="Büro Avansından Ödendi">Büro Avansından Ödendi</option>
              <option value="Stajyer / Avukat Cebinden Ödedi (Geri Ödenecek)">Stajyer / Avukat Cebinden Ödedi (Geri Ödenecek)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Açıklama / Makbuz No / Kalem Notu</label>
            <input type="text" id="court-expense-desc" class="form-control" placeholder="Örn: 2026/142 E. Bilirkişi ek avans tahsil fişi No: 48921">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModals()">İptal</button>
          <button type="submit" class="btn btn-primary">🧾 Masraf Pusulasını Kaydet</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ==========================================================================
       ÖZEL ONAY & BİLDİRİM DİYALOĞU (CUSTOM CONFIRM & ALERT DIALOG)
       ========================================================================== -->
  <div id="custom-dialog-overlay" class="custom-dialog-backdrop" style="display: none;">
    <div class="custom-dialog-card" id="custom-dialog-card">
      <div class="dialog-icon-wrapper danger" id="dialog-icon-box">
        <span class="dialog-icon" id="dialog-icon">🗑️</span>
      </div>
      <h3 class="dialog-title" id="dialog-title">İşlem Onayı</h3>
      <p class="dialog-message" id="dialog-message">Bu işlemi gerçekleştirmek istediğinize emin misiniz?</p>
      
      <!-- İsteğe bağlı kopyalama alanı (Davet linki vb. için) -->
      <div id="dialog-copy-box" class="dialog-copy-box" style="display: none;">
        <input type="text" id="dialog-copy-input" class="form-control" readonly style="font-size: 13px; background: #f8fafc; text-align: center;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="App.copyDialogLink()" id="btn-copy-dialog" style="white-space: nowrap;">
          📋 Kopyala
        </button>
      </div>

      <div class="dialog-actions">
        <button type="button" id="dialog-btn-cancel" class="dialog-btn dialog-btn-cancel">Vazgeç</button>
        <button type="button" id="dialog-btn-confirm" class="dialog-btn dialog-btn-confirm danger">Onayla</button>
      </div>
    </div>
  </div>

  <!-- ==========================================================================
       HIZLI KOMUTA MERKEZİ VE SPOTLIGHT MODALI (COMMAND PALETTE)
       ========================================================================== -->
  <div id="modal-command-palette" class="modal-overlay" onclick="if(event.target===this) App.closeModals()">
    <div class="modal cmd-palette-modal">
      <div class="cmd-palette-header">
        <span style="font-size: 18px; color: var(--primary-accent);">🔍</span>
        <input type="text" id="cmd-palette-input" class="cmd-palette-input" placeholder="Dosya esas no, müvekkil adı, mahkeme veya görev yazın... (Esc ile çık)" oninput="App.handleCommandPaletteSearch(this.value)">
        <button type="button" class="btn btn-secondary btn-sm" onclick="App.closeModals()">ESC</button>
      </div>
      <div class="cmd-palette-shortcuts">
        <span class="cmd-chip" onclick="App.filterCommandPalette('case')">⚖️ Dava Dosyaları</span>
        <span class="cmd-chip" onclick="App.filterCommandPalette('client')">👥 Müvekkiller</span>
        <span class="cmd-chip" onclick="App.filterCommandPalette('event')">📅 Celseler & Süreler</span>
        <span class="cmd-chip" onclick="App.filterCommandPalette('quick_add')">+ Hızlı İşlemler</span>
        <span class="cmd-chip" onclick="App.filterCommandPalette('calc')">🧮 Hesaplama Motoru</span>
      </div>
      <div class="cmd-results-list" id="cmd-palette-results">
        <!-- Dinamik Arama Sonuçları -->
      </div>
    </div>
  </div>

  <!-- ==========================================================================
       FİYATLANDIRMA & SATIN ALMA MODALI (PRICING & CHECKOUT MODAL)
       ========================================================================== -->
  <div id="modal-pricing" class="modal-overlay">
    <div class="modal modal-lg" style="max-width: 1050px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <div>
          <div class="modal-title">Abonelik Paketleri ve Kapasite Yönetimi</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
            Hukuk büronuz için en uygun çalışma kapasitesini seçin veya 14 gün kartsız ücretsiz deneyin.
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>

      <div class="modal-body">
        <!-- Aylık / Yıllık Seçim Anahtarı -->
        <div style="display: flex; justify-content: center; align-items: center; gap: 14px; margin-bottom: 24px;">
          <span id="label-cycle-monthly" style="font-weight: 700; color: #0f172a; cursor: pointer;" onclick="App.setPricingCycle('monthly')">Aylık Ödeme</span>
          <label class="switch-toggle" style="position: relative; display: inline-block; width: 52px; height: 28px;">
            <input type="checkbox" id="pricing-cycle-toggle" onchange="App.handlePricingToggle(this.checked)" style="opacity: 0; width: 0; height: 0;">
            <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; border: 1px solid var(--border-color); border-radius: 28px; transition: .3s;"></span>
          </label>
          <span id="label-cycle-yearly" style="font-weight: 600; color: var(--text-muted); cursor: pointer;" onclick="App.setPricingCycle('yearly')">
            Yıllık Ödeme <span class="badge" style="background: rgba(16,185,129,0.2); color: #10b981; font-size: 11px;">%20 Tasarruf</span>
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;" id="pricing-modal-cards">
          <!-- JS doldurur -->
        </div>

        <!-- Yasal ve Teknik Bilgilendirme Notu -->
        <div style="margin-top: 24px; padding: 14px 18px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 10px; font-size: 12px; color: #334155; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div>
            🔒 <strong>PCI-DSS Güvencesi:</strong> Kart bilgileriniz sistemde tutulmaz, sağlayıcının (iyzico / PayTR) 256-bit SSL korumalı altyapısında işlenir.
          </div>
          <div style="color: #b45309; font-weight: 600;">
            🧪 Sandbox Test Ortamı (Demo)
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ABONELİK İPTAL MODALI -->
  <div id="modal-cancel-subscription" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">Aboneliği İptal Et</div>
        <button class="btn btn-secondary btn-sm" onclick="App.closeModals()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
          Aboneliğinizi iptal ettiğinizde:
        </p>
        <ul style="font-size: 13px; color: #334155; line-height: 1.8; margin-bottom: 20px; padding-left: 20px;">
          <li>Mevcut döneminizin sonuna kadar tüm paket özellikleriniz <strong>kesintisiz devam eder</strong>.</li>
          <li>Gelecek dönem için kredi kartınızdan <strong>herhangi bir tahsilat yapılmaz</strong>.</li>
          <li>Dönem bittiğinde dava, müvekkil ve evraklarınız <strong>ASLA SİLİNMEZ</strong>; büronuz güvenli salt-okunur erişimde kalır.</li>
        </ul>
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 12px; border-radius: 8px; font-size: 13px;">
          Aboneliğinizi dönem sonunda iptal etmek istediğinizi onaylıyor musunuz?
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="App.closeModals()">Vazgeç</button>
        <button type="button" class="btn btn-danger" onclick="App.handleConfirmCancelSubscription()">Evet, Aboneliğimi İptal Et</button>
      </div>
    </div>
  </div>

  <!-- Toast Bildirim Alanı -->
  <div id="toast-container" class="toast-container"></div>

  <!-- JavaScript Kodları -->
  <script src="js/api.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
