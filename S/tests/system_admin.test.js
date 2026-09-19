const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Test veritabanı yolu
const TEST_DB_PATH = path.join(__dirname, 'system_test.sqlite');
process.env.ADN_DB_PATH = TEST_DB_PATH;
process.env.PORT = '8096';

// Test öncesi temizlik
if (fs.existsSync(TEST_DB_PATH)) {
  try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
}

const server = require('../server');

async function request(urlPath, options = {}) {
  const url = `http://localhost:8096${urlPath}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data = {};
  try {
    data = await res.json();
  } catch (e) {}

  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, headers: res.headers, data, setCookie };
}

async function runSystemAdminTests() {
  console.log('--- TEST: /system Süper Yönetici Paneli & Abonelik Testleri Başlatılıyor ---');

  let systemCookie = '';
  let testTenantId = '';
  let testUserId = '';

  try {
    // 1. Yetkisiz giriş testi: Yanlış kullanıcı adı veya şifre
    const badLogin = await request('/api/system/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: '123' }
    });
    assert.strictEqual(badLogin.status, 401, 'Hatalı bilgiler 401 dönmeli');
    console.log('✓ Hatalı kullanıcı adı/şifre ile /system girişi engellendi (401).');

    // 2. Başarılı giriş: kullanıcıadı: ömer, şifre: 2571
    const goodLogin = await request('/api/system/auth/login', {
      method: 'POST',
      body: { username: 'ömer', password: '2571' }
    });
    assert.strictEqual(goodLogin.status, 200, 'Doğru bilgiler 200 dönmeli');
    assert.ok(goodLogin.setCookie && goodLogin.setCookie.includes('adn_system_session'), 'Sistem oturum çerezi üretilmeli');
    
    systemCookie = goodLogin.setCookie.split(';')[0];
    console.log('✓ Doğru kimlik bilgileriyle (ömer:2571) sistem yöneticisi girişi başarılı (200).');

    // 3. Yetkisiz erişim denemesi: Çerez olmadan /api/system/stats çağırma
    const unauthStats = await request('/api/system/stats');
    assert.strictEqual(unauthStats.status, 401, 'Yetkisiz erişim 401 dönmeli');
    console.log('✓ Yetkisiz isteklerin /api/system/* rotalarına erişimi engellendi (401).');

    // 4. Sistem İstatistikleri ve Metrikleri
    const statsRes = await request('/api/system/stats', {
      headers: { Cookie: systemCookie }
    });
    assert.strictEqual(statsRes.status, 200);
    assert.ok(statsRes.data.metrics, 'Metrikler dönmeli');
    console.log('✓ Sistem metrikleri ve MRR hesabı başarıyla çekildi.');

    // 5. Abonelik Planlarını Listeleme ve Fiyat Güncelleme
    const plansRes = await request('/api/system/plans');
    assert.strictEqual(plansRes.status, 200);
    assert.ok(plansRes.data.plans.length >= 3, 'En az 3 varsayılan paket bulunmalı');
    
    // Pro paket fiyatını 3.500 TL olarak güncelle
    const updatePlanRes = await request('/api/system/plans/pro', {
      method: 'PUT',
      headers: { Cookie: systemCookie },
      body: { price_monthly: 3500, price_yearly: 35000 }
    });
    assert.strictEqual(updatePlanRes.status, 200);

    const recheckPlans = await request('/api/system/plans');
    const proPlan = recheckPlans.data.plans.find(p => p.id === 'pro');
    assert.strictEqual(proPlan.price_monthly, 3500, 'Aylık fiyat 3500 olarak güncellenmiş olmalı');
    console.log('✓ Abonelik paket fiyatları canlı olarak güncellendi ve doğrulandı.');

    // 6. Test için normal bir büro ve kullanıcı kaydedelim
    const registerRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Av. Kemal Erdem',
        email: 'kemal@erdemhukuk.av.tr',
        password: 'GuvenliParola123!',
        officeName: 'Erdem & Ortakları Hukuk Bürosu',
        city: 'Ankara',
        barCity: 'Ankara Barosu',
        barNumber: '54321',
        termsAccepted: true
      }
    });
    assert.strictEqual(registerRes.status, 201);
    testTenantId = registerRes.data.tenant.id;

    // Kullanıcı listesini sistem panelinden çek
    const usersRes = await request('/api/system/users', {
      headers: { Cookie: systemCookie }
    });
    assert.strictEqual(usersRes.status, 200);
    const createdUser = usersRes.data.users.find(u => u.email === 'kemal@erdemhukuk.av.tr');
    assert.ok(createdUser, 'Kayıt olan kullanıcı sistem paneli listesinde görünmeli');
    testUserId = createdUser.id;
    console.log('✓ Kayıtlı büro ve kullanıcılar sistem panelinde listelendi.');

    // 7. Büro Askıya Alma (Suspend) ve Giriş Engelleme Testi
    const suspendRes = await request(`/api/system/tenants/${testTenantId}`, {
      method: 'PATCH',
      headers: { Cookie: systemCookie },
      body: { status: 'suspended' }
    });
    assert.strictEqual(suspendRes.status, 200);

    // Askıya alınan büronun kullanıcısı giriş yapmayı denesin
    const blockedLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'kemal@erdemhukuk.av.tr', password: 'GuvenliParola123!' }
    });
    assert.strictEqual(blockedLogin.status, 403, 'Askıdaki büro kullanıcısı 403 ile engellenmeli');
    assert.ok(blockedLogin.data.error.includes('askıya alınmıştır'));
    console.log('✓ Askıya alınan (suspended) büro kullanıcılarının sisteme girişi 403 ile engellendi.');

    // Büroyu tekrar aktif et
    await request(`/api/system/tenants/${testTenantId}`, {
      method: 'PATCH',
      headers: { Cookie: systemCookie },
      body: { status: 'active' }
    });

    // 8. Kullanıcı Şifresini Yönetici Tarafından Sıfırlama
    const resetPassRes = await request(`/api/system/users/${testUserId}/reset-password`, {
      method: 'POST',
      headers: { Cookie: systemCookie },
      body: { newPassword: 'YeniSifre2026!' }
    });
    assert.strictEqual(resetPassRes.status, 200);

    // Yeni şifreyle normal giriş testi
    const newPassLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'kemal@erdemhukuk.av.tr', password: 'YeniSifre2026!' }
    });
    assert.strictEqual(newPassLogin.status, 200, 'Yeni sıfırlanan şifreyle giriş başarılı olmalı');
    console.log('✓ Sistem yöneticisi tarafından sıfırlanan yeni şifreyle büroya giriş doğrulandı.');

    // 9. Sistem Yöneticisi Çıkışı (Logout)
    const logoutRes = await request('/api/system/auth/logout', {
      method: 'POST',
      headers: { Cookie: systemCookie }
    });
    assert.strictEqual(logoutRes.status, 200);

    // Oturum sonlandırıldıktan sonra erişim denemesi
    const afterLogout = await request('/api/system/stats', {
      headers: { Cookie: systemCookie }
    });
    assert.strictEqual(afterLogout.status, 401, 'Çıkış yapıldıktan sonra 401 dönmeli');
    console.log('✓ Sistem yöneticisi güvenli çıkışı ve oturum iptali doğrulandı.');

    console.log('\n>>> TÜM /system SÜPER YÖNETİCİ TESTLERİ BAŞARIYLA GEÇTİ <<<\n');
    process.exit(0);

  } catch (err) {
    console.error('❌ TEST BAŞARISIZ:', err);
    process.exit(1);
  } finally {
    try {
      server.close();
      if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    } catch (e) {}
  }
}

runSystemAdminTests();
