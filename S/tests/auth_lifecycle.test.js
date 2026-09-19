const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

// Test veritabanı yolu
const TEST_DB = path.join(__dirname, 'test_auth_lifecycle.sqlite');
process.env.ADN_DB_PATH = TEST_DB;
process.env.PORT = '8098';

// Temizlik
[TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`].forEach(f => {
  if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch (e) {}
});

const server = require('../server');

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 8098,
      path,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (options.body) {
      const data = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.setHeader('Content-Type', 'application/json');
      req.write(data);
    }
    req.end();
  });
}

function parseCookie(setCookieHeader) {
  if (!setCookieHeader) return '';
  const first = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return first.split(';')[0];
}

async function runTests() {
  console.log('--- TEST: Üyelik, Güvenlik, Bağımsız Sayfalar & Ödeme Güvencesi Başlatılıyor ---');

  try {
    // 1. Oturumsuz ziyaretçinin korunan panele erişememesi (HTTP 302 -> /giris)
    const panelRes = await makeRequest('/panel');
    assert.strictEqual(panelRes.status, 302, 'Oturumsuz /panel isteği 302 ile yönlendirmeli.');
    assert.strictEqual(panelRes.headers.location, '/giris', 'Oturumsuz istek /giris adresine yönlenmeli.');
    console.log('✓ [1/7] Oturumsuz ziyaretçinin korunan /panel sayfasına erişimi sunucu tarafında engellendi (302 -> /giris).');

    // 2. Oturumsuz API koruması
    const casesRes = await makeRequest('/api/cases');
    assert.strictEqual(casesRes.status, 401, 'Oturumsuz /api/cases 401 Unauthorized dönmeli.');
    console.log('✓ [2/7] Oturumsuz API istekleri sunucu tarafında 401 Unauthorized ile korundu.');

    // 3. Yeni kayıt ve seçilen paketin korunması
    const regPayload = {
      fullName: 'Av. Zeynep Kaya',
      email: 'zeynep@kayahukuk.av.tr',
      officeName: 'Kaya & Ortakları Hukuk Bürosu',
      password: 'ParolaGuclu123!',
      planId: 'pro',
      billingCycle: 'yearly',
      termsAccepted: true
    };
    const regRes = await makeRequest('/api/auth/register', { method: 'POST', body: regPayload });
    assert.strictEqual(regRes.status, 201, 'Kayıt başarılı olmalı (201).');
    assert.strictEqual(regRes.body.tenant.planId, 'pro', 'Kayıt sırasında seçilen Pro paket korunmalı.');
    assert.strictEqual(regRes.body.tenant.billingCycle, 'yearly', 'Kayıt sırasında seçilen Yıllık döngü korunmalı.');
    assert.ok(regRes.body.verificationToken, 'Kayıt sonrası e-posta doğrulama tokeni üretilmeli.');

    const sessionCookie = parseCookie(regRes.headers['set-cookie']);
    assert.ok(sessionCookie, 'Kayıt sonrası geçerli oturum çerezi verilmeli.');
    console.log('✓ [3/7] Seçilen paket hafızada tutularak kayıt açıldı ve doğrulama tokeni üretildi.');

    // 4. E-Posta doğrulama akışı
    const verifyRes = await makeRequest('/api/auth/verify-email', {
      method: 'POST',
      body: { token: regRes.body.verificationToken }
    });
    assert.strictEqual(verifyRes.status, 200, 'E-posta doğrulama başarılı olmalı (200).');

    // Mükerrer/kullanılmış token denemesi
    const repeatVerify = await makeRequest('/api/auth/verify-email', {
      method: 'POST',
      body: { token: regRes.body.verificationToken }
    });
    assert.strictEqual(repeatVerify.status, 400, 'Kullanılmış token reddedilmeli (400).');
    console.log('✓ [4/7] E-posta doğrulama ve tek kullanımlık token güvenlik kalkanı doğrulandı.');

    // 5. Parola sıfırlama (Forgot Password -> Reset Password)
    const forgotRes = await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'zeynep@kayahukuk.av.tr' }
    });
    assert.strictEqual(forgotRes.status, 200);
    assert.ok(forgotRes.body.resetToken, 'Sıfırlama tokeni dönmeli.');

    const resetRes = await makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: { token: forgotRes.body.resetToken, newPassword: 'YeniGucluParola2026!' }
    });
    assert.strictEqual(resetRes.status, 200, 'Parola başarıyla güncellenmeli.');

    // Eski parola ile giriş denenmeli -> 401
    const oldLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'zeynep@kayahukuk.av.tr', password: 'ParolaGuclu123!' }
    });
    assert.strictEqual(oldLogin.status, 401, 'Eski parola reddedilmeli.');

    // Yeni parola ile giriş denenmeli -> 200
    const newLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'zeynep@kayahukuk.av.tr', password: 'YeniGucluParola2026!' }
    });
    assert.strictEqual(newLogin.status, 200, 'Yeni parola ile giriş başarılı olmalı.');
    const newCookie = parseCookie(newLogin.headers['set-cookie']);
    console.log('✓ [5/7] Parola sıfırlama, eski parolanın geçersiz kılınması ve yeni parola ile giriş doğrulandı.');

    // 6. Ödeme doğrulanmadan paketin açılmaması
    // Checkout başlatıldığında durum 'pending' kalmalı, 'active' olmamalı
    const checkoutRes = await makeRequest('/api/billing/checkout', {
      method: 'POST',
      headers: { Cookie: newCookie },
      body: { planId: 'enterprise', billingCycle: 'yearly' }
    });
    assert.strictEqual(checkoutRes.status, 200);
    assert.strictEqual(checkoutRes.body.checkout.provider, 'mock_sandbox');

    // Abonelik durumunu kontrol et: Halen 'trialing' olmalı, sunucu onayı olmadan 'active' olmamalı
    const subCheck = await makeRequest('/api/billing/my-subscription', {
      headers: { Cookie: newCookie }
    });
    assert.strictEqual(subCheck.body.subscription.status, 'trialing', 'Ödeme doğrulanmadan paket active olmamalı.');
    assert.strictEqual(subCheck.body.subscription.plan_id, 'pro', 'Ödeme onaylanmadan plan değişmemeli.');
    console.log('✓ [6/7] Butona basarak veya checkout başlatarak yetkisiz paket aktivasyonu engellendi; sunucu doğrulaması zorunluluğu onaylandı.');

    // 7. Çıkış yapınca korunan verilere erişimin kesilmesi
    const logoutRes = await makeRequest('/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: newCookie }
    });
    assert.strictEqual(logoutRes.status, 200);

    const postLogoutCheck = await makeRequest('/api/cases', {
      headers: { Cookie: newCookie }
    });
    assert.strictEqual(postLogoutCheck.status, 401, 'Çıkış sonrası oturum sonlandırılmış olmalı.');
    console.log('✓ [7/7] Çıkış sonrası oturumun sunucu tarafında sonlandırıldığı doğrulandı.');

    console.log('\n>>> TÜM ÜYELİK, GÜVENLİK VE ÖDEME TESTLERİ BAŞARIYLA GEÇTİ <<<');

  } finally {
    server.close();
    [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`].forEach(f => {
      if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch (e) {}
    });
  }
}

runTests().catch(err => {
  console.error('TEST BAŞARISIZ:', err);
  process.exit(1);
});
