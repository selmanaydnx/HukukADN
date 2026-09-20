<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Büro Hesabı Aç | ADN Hukuk Platformu</title>
  <link rel="stylesheet" href="{{ asset('css/style.css') }}">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚖️</text></svg>">
</head>
<body style="background: #0b1329; color: var(--text-main); min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px;">

  <!-- Üst Logo -->
  <div style="text-align: center; margin-bottom: 24px;">
    <a href="/" style="display: inline-flex; align-items: center; gap: 10px; text-decoration: none;">
      <div class="brand-icon" style="background: var(--primary-accent); padding: 8px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2">
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
          <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
          <path d="M7 21h10"></path>
          <path d="M12 3v18"></path>
          <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path>
        </svg>
      </div>
      <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">ADN</span>
    </a>
    <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Yeni Büro Çalışma Alanı Oluşturma</div>
  </div>

  <!-- Kayıt Kartı -->
  <div class="card" style="width: 100%; max-width: 520px; background: #ffffff; border-radius: 20px; box-shadow: 0 25px 60px -15px rgba(0,0,0,0.5); border: 1px solid var(--border-color); padding: 36px 32px;">
    <h1 style="font-size: 22px; font-weight: 800; margin-bottom: 4px; color: #0f172a; text-align: center;">14 Gün Kartsız Ücretsiz Deneyin</h1>
    <p style="font-size: 13px; color: #64748b; margin-bottom: 20px; text-align: center;">Kredi kartı gerekmez. Süre bitiminde otomatik çekim yapılmaz.</p>

    <!-- Seçilen Paket Bilgi Kutucuğu (URL Parametresiyle dinamik gelir) -->
    <div id="selected-plan-badge" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #1e40af;">
      <div>
        <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #3b82f6; display: block;">Seçili Paket:</span>
        <strong id="lbl-plan-name">Büro (Pro) Paketi</strong> <span id="lbl-cycle-name">(Aylık)</span>
      </div>
      <a href="/paketler" style="font-size: 12px; color: #2563eb; text-decoration: underline; font-weight: 600;">Değiştir</a>
    </div>

    <!-- Bildirim / Hata Kutusu -->
    <div id="alert-box" style="display: none; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; line-height: 1.5;"></div>

    <!-- Kayıt Sonrası Doğrulama Adımı -->
    <div id="verification-step" style="display: none; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
      <div style="font-size: 28px; margin-bottom: 8px;">📬</div>
      <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">E-posta Doğrulama Bağlantısı</h3>
      <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">
        Hesabınız açıldı. E-posta adresinizi doğrulamak için aşağıdaki bağlantıya tıklayabilir veya doğrudan büronuza geçebilirsiniz.
      </p>
      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <button id="btn-verify-now" class="btn btn-secondary btn-sm" style="font-weight: 600;">
          ✓ E-postamı Şimdi Doğrula
        </button>
        <a href="/panel" class="btn btn-primary btn-sm" style="font-weight: 700; text-decoration: none;">
          Büro Paneline Git →
        </a>
      </div>
    </div>

    <form id="form-register" onsubmit="handleRegisterSubmit(event)">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
        <div>
          <label class="form-label" style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Adınız Soyadınız *</label>
          <input type="text" id="reg-fullname" class="form-control" required placeholder="Av. Kemal Erdem" style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">E-posta Adresi *</label>
          <input type="email" id="reg-email" class="form-control" required placeholder="avukat@ornek.av.tr" style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;">
        </div>
      </div>

      <div style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Hukuk Bürosu / Ortaklık Adı *</label>
        <input type="text" id="reg-officename" class="form-control" required placeholder="Erdem & Ortakları Hukuk Bürosu" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;">
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
        <div>
          <label class="form-label" style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Kayıtlı Baro (Opsiyonel)</label>
          <input type="text" id="reg-barcity" class="form-control" placeholder="İstanbul Barosu" style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Baro Sicil No (Opsiyonel)</label>
          <input type="text" id="reg-barnumber" class="form-control" placeholder="34821" style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;">
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <label class="form-label" style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Parola (En az 8 karakter) *</label>
        <input type="password" id="reg-password" class="form-control" minlength="8" required placeholder="••••••••" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;">
      </div>

      <div style="margin-bottom: 22px; font-size: 12px; color: #64748b; line-height: 1.5;">
        <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="reg-terms" required checked style="margin-top: 2px;">
          <span>Kullanım Koşulları ile Gizlilik ve Kişisel Verilerin Korunması Politikasını okudum, kabul ediyorum.</span>
        </label>
      </div>

      <button type="submit" id="btn-submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 15px; font-weight: 700; border-radius: 8px; cursor: pointer;">
        Büromu Oluştur ve 14 Gün Ücretsiz Başla
      </button>
    </form>

    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 13px; color: #64748b;">
      Zaten bir hesabınız var mı? <br>
      <a href="/giris" style="color: var(--primary-accent); font-weight: 700; text-decoration: none; display: inline-block; margin-top: 4px;">
        Giriş Yapın →
      </a>
    </div>
  </div>

  <div style="margin-top: 24px; text-align: center; font-size: 12px; color: #64748b;">
    <a href="/" style="color: #94a3b8; text-decoration: none;">← Tanıtım Sayfasına Dön</a>
  </div>

  <script>
    let currentPlanId = 'solo';
    let currentCycle = 'monthly';

    window.addEventListener('DOMContentLoaded', () => {
      const params = new URLSearchParams(window.location.search);
      const plan = params.get('plan');
      const cycle = params.get('cycle');

      if (plan && ['solo', 'pro', 'enterprise'].includes(plan.toLowerCase())) {
        currentPlanId = plan.toLowerCase();
      }
      if (cycle && ['monthly', 'yearly'].includes(cycle.toLowerCase())) {
        currentCycle = cycle.toLowerCase();
      }

      updatePlanBadge();
    });

    function updatePlanBadge() {
      const planNames = {
        solo: 'Bireysel (Solo)',
        pro: 'Büro (Pro)',
        enterprise: 'Kurumsal & Ortaklık'
      };
      document.getElementById('lbl-plan-name').textContent = planNames[currentPlanId] || 'Bireysel (Solo)';
      document.getElementById('lbl-cycle-name').textContent = currentCycle === 'yearly' ? '(Yıllık - %20 İndirimli)' : '(Aylık)';
    }

    function showAlert(msg, type) {
      const box = document.getElementById('alert-box');
      box.textContent = msg;
      box.style.display = 'block';
      if (type === 'error') {
        box.style.background = '#fef2f2';
        box.style.color = '#991b1b';
        box.style.border = '1px solid #fecaca';
      } else if (type === 'success') {
        box.style.background = '#f0fdf4';
        box.style.color = '#166534';
        box.style.border = '1px solid #bbf7d0';
      } else {
        box.style.background = '#eff6ff';
        box.style.color = '#1e40af';
        box.style.border = '1px solid #bfdbfe';
      }
    }

    async function handleRegisterSubmit(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-submit');
      const payload = {
        fullName: document.getElementById('reg-fullname').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        officeName: document.getElementById('reg-officename').value.trim(),
        barCity: document.getElementById('reg-barcity').value.trim(),
        barNumber: document.getElementById('reg-barnumber').value.trim(),
        password: document.getElementById('reg-password').value,
        termsAccepted: document.getElementById('reg-terms').checked,
        planId: currentPlanId,
        billingCycle: currentCycle
      };

      btn.disabled = true;
      btn.textContent = 'Büro alanı kuruluyor...';

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Kayıt işlemi başarısız.');
        }

        showAlert('Tebrikler! Büronuz ve 14 günlük deneme sürümünüz hazırlandı.', 'success');
        document.getElementById('form-register').style.display = 'none';
        
        const vStep = document.getElementById('verification-step');
        if (vStep && data.verificationToken) {
          vStep.style.display = 'block';
          const btnVerify = document.getElementById('btn-verify-now');
          btnVerify.onclick = async () => {
            btnVerify.disabled = true;
            btnVerify.textContent = 'Doğrulanıyor...';
            try {
              const vRes = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: data.verificationToken })
              });
              const vData = await vRes.json();
              if (vRes.ok) {
                showAlert('✓ E-posta adresiniz doğrulandı! Büronuza aktarılıyorsunuz...', 'success');
                setTimeout(() => window.location.href = '/panel', 600);
              } else {
                showAlert(vData.error || 'Doğrulama yapılamadı.', 'error');
              }
            } catch (err) {
              showAlert(err.message, 'error');
            }
          };
        } else {
          setTimeout(() => window.location.href = '/panel', 800);
        }
      } catch (err) {
        showAlert(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Büromu Oluştur ve 14 Gün Ücretsiz Başla';
      }
    }
  </script>
</body>
</html>
