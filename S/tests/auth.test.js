const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// Set dedicated test DB path
const testDbPath = path.join(__dirname, 'test_auth.sqlite');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
process.env.ADN_DB_PATH = testDbPath;
process.env.PORT = '8091';

const server = require('../server');
const { getDb, closeDb } = require('../src/database/db');

async function runAuthTests() {
  console.log('--- TEST: Kimlik Doğrulama & Oturum Güvenliği Testleri Başlatılıyor ---');
  const BASE_URL = 'http://localhost:8091';

  try {
    // 1. Kayıt Doğrulaması (Eksik alan veya onay yokken hata vermeli)
    {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'Av. Kemal Erdem', email: 'kemal@erdemhukuk.av.tr', password: 'Short' })
      });
      assert.strictEqual(res.status, 400, 'Şartlar onaylanmadığında veya kısa şifrede 400 dönmeli');
      console.log('✓ Eksik şartlar ile kayıt engellendi (400)');
    }

    // 2. Başarılı Kayıt
    let authCookie = '';
    {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Av. Kemal Erdem',
          email: 'kemal@erdemhukuk.av.tr',
          password: 'GuvenliParola123!',
          officeName: 'Erdem & Ortakları Avukatlık Ortaklığı',
          city: 'Ankara',
          barCity: 'Ankara Barosu',
          barNumber: '34821',
          termsAccepted: true
        })
      });

      assert.strictEqual(res.status, 201, 'Kayıt başarılı olmalı (201 Created)');
      const data = await res.json();
      assert(data.user && data.user.id, 'Kayıt yanıtı user objesi içermeli');
      assert(data.tenant && data.tenant.id, 'Kayıt yanıtı otomatik oluşturulan tenant bilgisi içermeli');
      assert.strictEqual(data.tenant.role, 'owner', 'Kayıt olan avukat büronun kurucusu/owner olmalıdır');

      // Cookie kontrolü
      const rawCookie = res.headers.get('set-cookie');
      assert(rawCookie && rawCookie.includes('adn_session='), 'HttpOnly adn_session çerezi set edilmeli');
      authCookie = rawCookie.split(';')[0];
      console.log('✓ Başarılı kayıt ve otomatik çalışma alanı oluşturuldu (201)');
    }

    // 3. Parola Güvenliği (Veritabanında düz metin parola bulunmamalı, scrypt salt ile saklanmalı)
    {
      const db = getDb();
      const user = db.prepare('SELECT password_hash, salt FROM users WHERE email = ?').get('kemal@erdemhukuk.av.tr');
      assert(user, 'Kullanıcı veritabanında bulunmalı');
      assert.notStrictEqual(user.password_hash, 'GuvenliParola123!', 'Parola kesinlikle düz metin saklanmamalı');
      assert(user.salt && user.salt.length >= 32, 'Kriptografik salt mevcut ve yeterli uzunlukta olmalı');
      assert(user.password_hash.length >= 64, 'Scrypt derived hash kaydedilmiş olmalı');
      console.log('✓ Kriptografik parola saklama (scrypt + tuzlama) doğrulandı');
    }

    // 4. Yetkili Profil Sorgusu (Kayıttan gelen cookie ile)
    {
      const res = await fetch(`${BASE_URL}/api/auth/profile`, {
        headers: { 'Cookie': authCookie }
      });
      assert.strictEqual(res.status, 200, 'Oturumlu profil sorgusu 200 dönmeli');
      const data = await res.json();
      assert.strictEqual(data.user.email, 'kemal@erdemhukuk.av.tr');
      assert.strictEqual(data.currentTenant.name, 'Erdem & Ortakları Avukatlık Ortaklığı');
      console.log('✓ Oturum çerezi ile profil ve büro bağlamı başarıyla çekildi');
    }

    // 5. Hatalı Giriş ve Hesap Varlığı Sızdırmama
    {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'kemal@erdemhukuk.av.tr', password: 'YanlisParola' })
      });
      assert.strictEqual(res.status, 401, 'Hatalı parolada 401 dönmeli');
      const data = await res.json();
      assert.strictEqual(data.error, 'E-posta veya parola hatalı.', 'Hesap varlığını ifşa etmeyen genel hata mesajı dönmeli');
      console.log('✓ Hatalı parola genel hata mesajıyla reddedildi (401)');
    }

    // 6. Başarılı Giriş
    {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'kemal@erdemhukuk.av.tr', password: 'GuvenliParola123!' })
      });
      assert.strictEqual(res.status, 200, 'Doğru bilgilerle giriş başarılı olmalı');
      console.log('✓ Doğru parola ile giriş başarılı (200)');
    }

    // 7. Çıkış Yapma (Logout)
    {
      const res = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Cookie': authCookie }
      });
      assert.strictEqual(res.status, 200, 'Çıkış başarılı olmalı');
      const rawCookie = res.headers.get('set-cookie');
      assert(rawCookie && rawCookie.includes('Max-Age=0'), 'Çıkışta session çerezi sonlandırılmalı (Max-Age=0)');

      // Çıkış sonrası profil isteği 401 dönmeli
      const profileAfterLogout = await fetch(`${BASE_URL}/api/auth/profile`, {
        headers: { 'Cookie': authCookie }
      });
      assert.strictEqual(profileAfterLogout.status, 401, 'Sonlandırılmış oturum ile işlem yapılamamalı');
      console.log('✓ Oturum sonlandırma (logout) ve çerez temizleme doğrulandı');
    }

    console.log('>>> TÜM KİMLİK DOĞRULAMA TESTLERİ BAŞARIYLA GEÇTİ <<<\n');
  } finally {
    closeDb();
    server.close();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(testDbPath + '-wal')) fs.unlinkSync(testDbPath + '-wal');
      if (fs.existsSync(testDbPath + '-shm')) fs.unlinkSync(testDbPath + '-shm');
    } catch (e) {}
  }
}

runAuthTests().catch(err => {
  console.error('Auth Test Hatası:', err);
  process.exit(1);
});
