<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Giriş Yap | ADN Hukuk Platformu</title>
  <link rel="stylesheet" href="{{ asset('css/style.css') }}">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚖️</text></svg>">
</head>
<body style="background: #0b1329; color: var(--text-main); min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px;">

  <!-- Üst Logo -->
  <div style="text-align: center; margin-bottom: 28px;">
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
    <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Hukuk Bürosu Yönetim Paneli</div>
  </div>

  <!-- Giriş Kartı -->
  <div class="card" style="width: 100%; max-width: 440px; background: #ffffff; border-radius: 20px; box-shadow: 0 25px 60px -15px rgba(0,0,0,0.5); border: 1px solid var(--border-color); padding: 36px 32px;">
    <h1 style="font-size: 22px; font-weight: 800; margin-bottom: 6px; color: #0f172a; text-align: center;">Büro Hesabınıza Giriş Yapın</h1>
    <p style="font-size: 13px; color: #64748b; margin-bottom: 24px; text-align: center;">Kayıtlı e-posta adresiniz ve parolanızla çalışma alanınıza erişin.</p>

    <!-- Bildirim / Hata Kutusu -->
    <div id="alert-box" style="display: none; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; line-height: 1.5;"></div>

    <form id="form-login" onsubmit="handleLoginSubmit(event)">
      <div class="form-group" style="margin-bottom: 18px;">
        <label class="form-label" style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">E-posta Adresi</label>
        <input type="email" id="login-email" class="form-control" required placeholder="avukat@ornek.av.tr" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;">
      </div>

      <div class="form-group" style="margin-bottom: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label class="form-label" style="font-size: 13px; font-weight: 600; color: #334155;">Parola</label>
          <a href="/sifremi-unuttum" style="font-size: 12px; color: var(--primary-accent); text-decoration: none;">Şifremi unuttum?</a>
        </div>
        <input type="password" id="login-password" class="form-control" required placeholder="••••••••" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;">
      </div>

      <button type="submit" id="btn-submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 15px; font-weight: 700; border-radius: 8px; cursor: pointer;">
        Giriş Yap
      </button>
    </form>

    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 13px; color: #64748b;">
      Henüz bir büro hesabınız yok mu? <br>
      <a href="/kayit" style="color: var(--primary-accent); font-weight: 700; text-decoration: none; display: inline-block; margin-top: 4px;">
        14 Gün Ücretsiz Deneme Başlat →
      </a>
    </div>
  </div>

  <div style="margin-top: 24px; text-align: center; font-size: 12px; color: #64748b;">
    <a href="/" style="color: #94a3b8; text-decoration: none;">← Tanıtım Sayfasına Dön</a>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', async () => {
      const params = new URLSearchParams(window.location.search);
      const verifyToken = params.get('verify_token');
      if (verifyToken) {
        showAlert('E-posta adresiniz doğrulanıyor...', 'info');
        try {
          const res = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: verifyToken })
          });
          const data = await res.json();
          if (res.ok) {
            showAlert('✓ ' + data.message, 'success');
            if (data.user && data.user.email) {
              document.getElementById('login-email').value = data.user.email;
            }
          } else {
            showAlert(data.error || 'Doğrulama bağlantısı geçersiz.', 'error');
          }
        } catch (e) {
          showAlert('Doğrulama işlemi sırasında bir bağlantı hatası oluştu.', 'error');
        }
      }
    });

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

    async function handleLoginSubmit(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-submit');
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      btn.disabled = true;
      btn.textContent = 'Giriş yapılıyor...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Giriş başarısız.');
        }

        showAlert('Giriş başarılı, büronuza yönlendiriliyorsunuz...', 'success');
        setTimeout(() => {
          window.location.href = '/panel';
        }, 300);
      } catch (err) {
        showAlert(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Giriş Yap';
      }
    }
  </script>
</body>
</html>
