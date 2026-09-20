<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Abonelik Paketleri ve Fiyatlandırma | ADN</title>
  <meta name="description" content="ADN Hukuk Platformu Bireysel, Büro ve Kurumsal abonelik paketleri, kapasite limitleri ve şeffaf fiyatlandırma.">
  <link rel="stylesheet" href="{{ asset('css/style.css') }}">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚖️</text></svg>">
</head>
<body style="background: var(--bg-main); color: var(--text-main); min-height: 100vh; display: flex; flex-direction: column;">

  <!-- Üst Menü -->
  <nav class="app-topbar" style="background: #0f172a; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 14px 28px;">
    <div class="topbar-left">
      <a href="/" style="display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit;">
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
          <div class="brand-title" style="font-size: 18px; color: #ffffff;">ADN</div>
          <div class="brand-sub" style="color: #94a3b8;">Hukuk Teknolojisi</div>
        </div>
      </a>
    </div>
    <div class="topbar-right" style="display: flex; align-items: center; gap: 12px;">
      <a href="/giris" class="btn btn-secondary" style="color: #cbd5e1; border-color: rgba(255,255,255,0.2); background: transparent; text-decoration: none;">
        🔑 Giriş Yap
      </a>
      <a href="/kayit" class="btn btn-primary" style="text-decoration: none; font-weight: 700;">
        🎁 14 Gün Ücretsiz Başla
      </a>
    </div>
  </nav>

  <!-- Başlık ve Fiyat Döngüsü Seçici -->
  <div style="max-width: 1150px; margin: 40px auto 20px; padding: 0 20px; text-align: center;">
    <span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); font-size: 13px; padding: 6px 16px; border-radius: 999px;">
      📦 Şeffaf Büro Paketleri & Kapasite Limitleri
    </span>
    <h1 style="font-size: 36px; font-weight: 800; color: #ffffff; margin-top: 16px; margin-bottom: 10px;">
      Hukuk Büronuzun Ölçeğine Uygun Planlar
    </h1>
    <p style="color: #94a3b8; font-size: 16px; max-width: 680px; margin: 0 auto 28px;">
      Tüm planlar 14 gün boyunca kartsız ücretsiz denenebilir. Süre bittiğinde otomatik ücret tahsilatı yapılmaz; verileriniz güvenle saklanır.
    </p>

    <!-- Fiyatlandırma Şeffaflık / Test Modu Uyarısı -->
    <div style="display: inline-block; background: rgba(245, 158, 11, 0.1); border: 1px dashed rgba(245, 158, 11, 0.4); border-radius: 10px; padding: 10px 20px; font-size: 13px; color: #fbbf24; margin-bottom: 28px;">
      ℹ️ <strong>Test / Demo Modu:</strong> Listelenen fiyatlar platform test ortamı tarifesidir. Canlı ödeme sağlayıcı entegrasyonu onaylandığında resmi tarifeye geçilecektir.
    </div>

    <!-- Aylık / Yıllık Geçiş Toggle -->
    <div style="display: flex; justify-content: center; align-items: center; gap: 14px; margin-bottom: 36px;">
      <span id="lbl-cycle-monthly" style="font-weight: 700; font-size: 14px; color: #ffffff;">Aylık Ödeme</span>
      <label class="toggle-switch" style="position: relative; display: inline-block; width: 56px; height: 28px;">
        <input type="checkbox" id="pricing-cycle-toggle" onchange="toggleCycle(this.checked)" style="opacity: 0; width: 0; height: 0;">
        <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #334155; border: 1px solid rgba(255,255,255,0.2); border-radius: 28px; transition: .3s;"></span>
      </label>
      <span id="lbl-cycle-yearly" style="font-weight: 700; font-size: 14px; color: #94a3b8;">
        Yıllık Ödeme <span class="badge" style="background: #10b981; color: #070b14; font-size: 11px; padding: 2px 8px; border-radius: 999px; margin-left: 4px;">%20 Tasarruf</span>
      </span>
    </div>

    <!-- 3 Paket Kartı -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; text-align: left;">
      
      <!-- 1. Bireysel (Solo) -->
      <div class="card" style="background: #ffffff; color: #0f172a; border-radius: 20px; border: 1px solid var(--border-color); padding: 32px 28px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="font-size: 22px; font-weight: 800;">Bireysel (Solo)</h3>
            <span class="badge" style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700;">Tek Avukat</span>
          </div>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 20px; min-height: 38px;">Bağımsız çalışan avukatlar ve tek kişilik hukuk büroları için temel iş takip paketi.</p>

          <div style="margin-bottom: 20px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
            <div id="price-solo" style="font-size: 32px; font-weight: 800; color: #0f172a;">1.250 ₺ <span style="font-size: 14px; font-weight: 500; color: #64748b;">/ ay</span></div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">+ %20 KDV tahakkuk eder</div>
          </div>

          <ul style="list-style: none; padding: 0; margin-bottom: 28px; font-size: 13px; color: #334155; line-height: 1.9;">
            <li>✓ <strong>1 Kullanıcı</strong> (Avukat / Çalışma Alanı)</li>
            <li>✓ <strong>150 Aktif</strong> Dava & İcra Dosyası</li>
            <li>✓ <strong>15 GB</strong> Evrak & UDF Depolama</li>
            <li>✓ <strong>150</strong> Hukuk Asistanı Analizi / Ay</li>
            <li>✓ HMK & UETS Yasal Süre Motoru</li>
            <li>✓ SMM & İcra Kapak Hesaplayıcı</li>
            <li>✓ Av. K. m.56 Yetki Belgesi Üretici</li>
            <li>✓ Büro İzolasyonu & KVKK Dışa Aktarma</li>
          </ul>
        </div>

        <a id="btn-solo" href="/kayit?plan=solo&cycle=monthly" class="btn btn-secondary" style="display: block; text-align: center; width: 100%; padding: 12px; font-weight: 700; text-decoration: none; border-radius: 10px;">
          Solo ile Ücretsiz Başla
        </a>
      </div>

      <!-- 2. Büro (Pro) - Öne Çıkan -->
      <div class="card" style="background: #ffffff; color: #0f172a; border-radius: 20px; border: 2px solid var(--primary-accent); padding: 32px 28px; display: flex; flex-direction: column; justify-content: space-between; position: relative; box-shadow: 0 15px 35px rgba(37, 99, 235, 0.15);">
        <div style="position: absolute; top: -12px; right: 24px; background: var(--primary-accent); color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 999px; text-transform: uppercase;">
          En Çok Tercih Edilen
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="font-size: 22px; font-weight: 800; color: #1e3a8a;">Büro (Pro)</h3>
            <span class="badge" style="background: #dbeafe; color: #1e40af; font-size: 11px; font-weight: 700;">Ekip Yönetimi</span>
          </div>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 20px; min-height: 38px;">Büyüyen hukuk büroları, ortaklıklar ve stajyer çalıştıran ekipler için ideal kapasite.</p>

          <div style="margin-bottom: 20px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
            <div id="price-pro" style="font-size: 32px; font-weight: 800; color: #0f172a;">2.950 ₺ <span style="font-size: 14px; font-weight: 500; color: #64748b;">/ ay</span></div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">+ %20 KDV tahakkuk eder</div>
          </div>

          <ul style="list-style: none; padding: 0; margin-bottom: 28px; font-size: 13px; color: #334155; line-height: 1.9;">
            <li>✓ <strong>5 Ekip Üyesi</strong> (Avukat, Stajyer, Kâtip)</li>
            <li>✓ <strong>750 Aktif</strong> Dava & İcra Dosyası</li>
            <li>✓ <strong>75 GB</strong> Evrak & UDF Depolama</li>
            <li>✓ <strong>750</strong> Hukuk Asistanı Analizi / Ay</li>
            <li>✓ Gelişmiş Duruşma & Celse Takibi</li>
            <li>✓ Adliye Masraf & Harç Pusulası</li>
            <li>✓ SMM & İcra Kapak & AAÜT Hesabı</li>
            <li>✓ Büro İzolasyonu & KVKK Dışa Aktarma</li>
          </ul>
        </div>

        <a id="btn-pro" href="/kayit?plan=pro&cycle=monthly" class="btn btn-primary" style="display: block; text-align: center; width: 100%; padding: 12px; font-weight: 700; text-decoration: none; border-radius: 10px;">
          Pro ile 14 Gün Ücretsiz Başla
        </a>
      </div>

      <!-- 3. Kurumsal (Enterprise) -->
      <div class="card" style="background: #ffffff; color: #0f172a; border-radius: 20px; border: 1px solid var(--border-color); padding: 32px 28px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="font-size: 22px; font-weight: 800;">Kurumsal & Ortaklık</h3>
            <span class="badge" style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700;">Geniş Ekipler</span>
          </div>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 20px; min-height: 38px;">Çok ortaklı büyük hukuk büroları ve kurumsal hukuk departmanları için yüksek kapasite.</p>

          <div style="margin-bottom: 20px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
            <div id="price-enterprise" style="font-size: 32px; font-weight: 800; color: #0f172a;">6.500 ₺ <span style="font-size: 14px; font-weight: 500; color: #64748b;">/ ay</span></div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">+ %20 KDV tahakkuk eder</div>
          </div>

          <ul style="list-style: none; padding: 0; margin-bottom: 28px; font-size: 13px; color: #334155; line-height: 1.9;">
            <li>✓ <strong>25 Ekip Üyesine Kadar</strong> Kullanıcı</li>
            <li>✓ <strong>5.000 Aktif</strong> Dosya Kapasitesi</li>
            <li>✓ <strong>300 GB</strong> Evrak & UDF Depolama</li>
            <li>✓ <strong>3.000</strong> Hukuk Asistanı Analizi / Ay</li>
            <li>✓ Özel Yetkilendirme & Rol Yönetimi</li>
            <li>✓ Öncelikli Destek Hattı</li>
            <li>✓ Özel KVKK Denetim İzi & JSON Yedekleme</li>
            <li>✓ Büro İzolasyonu & KVKK Dışa Aktarma</li>
          </ul>
        </div>

        <a id="btn-enterprise" href="/kayit?plan=enterprise&cycle=monthly" class="btn btn-secondary" style="display: block; text-align: center; width: 100%; padding: 12px; font-weight: 700; text-decoration: none; border-radius: 10px;">
          Kurumsal ile Başla
        </a>
      </div>

    </div>
  </div>

  <!-- Sıkça Sorulan Sorular / Bilgilendirme -->
  <div style="max-width: 900px; margin: 40px auto 60px; padding: 0 20px;">
    <h2 style="font-size: 24px; font-weight: 800; color: #ffffff; text-align: center; margin-bottom: 24px;">Paketler Hakkında Sıkça Sorulan Sorular</h2>
    
    <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; margin-bottom: 14px;">
      <h4 style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Deneme süresi bitince dosyalarım silinir mi?</h4>
      <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0;">
        Hayır. Deneme veya ücretli abonelik süreniz bittiğinde hiçbir dosyanız, müvekkiliniz veya evrakınız silinmez. Çalışma alanınız salt-okunur (read-only) moda geçer; dilediğiniz zaman tüm verilerinizi tek tıkla JSON olarak dışa aktarabilirsiniz.
      </p>
    </div>

    <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; margin-bottom: 14px;">
      <h4 style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Abonelik kullanıcıya mı büroya mı bağlıdır?</h4>
      <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0;">
        Abonelik doğrudan hukuk bürosuna (çalışma alanına) bağlıdır. Büroya davet ettiğiniz avukat, stajyer ve kâtipler aynı paketin limit ve haklarından ortak yararlanır.
      </p>
    </div>

    <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px;">
      <h4 style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Paketimi dilediğim an değiştirebilir veya iptal edebilir miyim?</h4>
      <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0;">
        Evet. Büro sahibi dilediği an paketi yükseltebilir veya iptal edebilir. İptal durumunda ödenmiş sürenin sonuna kadar haklarınız korunur.
      </p>
    </div>
  </div>

  <!-- Footer -->
  <footer style="margin-top: auto; background: #070b14; border-top: 1px solid rgba(255,255,255,0.1); padding: 28px 20px; font-size: 13px; color: #64748b; text-align: center;">
    <div style="margin-bottom: 8px;">
      <a href="/" style="color: #94a3b8; text-decoration: none; margin: 0 10px;">Ana Sayfa</a>
      <a href="/giris" style="color: #94a3b8; text-decoration: none; margin: 0 10px;">Giriş Yap</a>
      <a href="/kayit" style="color: #94a3b8; text-decoration: none; margin: 0 10px;">Ücretsiz Kayıt Ol</a>
    </div>
    <div>© 2026 ADN Hukuk Teknolojisi Platformu. Tüm hakları saklıdır.</div>
  </footer>

  <script>
    let isYearly = false;

    function toggleCycle(checked) {
      isYearly = checked;
      const cycle = isYearly ? 'yearly' : 'monthly';

      const lblMonthly = document.getElementById('lbl-cycle-monthly');
      const lblYearly = document.getElementById('lbl-cycle-yearly');
      lblMonthly.style.color = isYearly ? '#94a3b8' : '#ffffff';
      lblYearly.style.color = isYearly ? '#ffffff' : '#94a3b8';

      if (isYearly) {
        document.getElementById('price-solo').innerHTML = '12.000 ₺ <span style="font-size: 14px; font-weight: 500; color: #64748b;">/ yıl (1.000 ₺/ay)</span>';
        document.getElementById('price-pro').innerHTML = '28.320 ₺ <span style="font-size: 14px; font-weight: 500; color: #64748b;">/ yıl (2.360 ₺/ay)</span>';
        document.getElementById('price-enterprise').innerHTML = '62.400 ₺ <span style="font-size: 14px; font-weight: 500; color: #64748b;">/ yıl (5.200 ₺/ay)</span>';
      } else {
        document.getElementById('price-solo').innerHTML = '1.250 ₺ <span style="font-size: 14px; font-weight: 500; color: #64748b;">/ ay</span>';
        document.getElementById('price-pro').innerHTML = '2.950 ₺ <span style="font-size: 14px; font-weight: 500; color: #64748b;">/ ay</span>';
        document.getElementById('price-enterprise').innerHTML = '6.500 ₺ <span style="font-size: 14px; font-weight: 500; color: #64748b;">/ ay</span>';
      }

      document.getElementById('btn-solo').href = `/kayit?plan=solo&cycle=${cycle}`;
      document.getElementById('btn-pro').href = `/kayit?plan=pro&cycle=${cycle}`;
      document.getElementById('btn-enterprise').href = `/kayit?plan=enterprise&cycle=${cycle}`;
    }
  </script>
</body>
</html>
