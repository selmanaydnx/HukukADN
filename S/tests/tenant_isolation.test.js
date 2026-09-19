const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// Set dedicated test DB path
const testDbPath = path.join(__dirname, 'test_isolation.sqlite');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
process.env.ADN_DB_PATH = testDbPath;
process.env.PORT = '8092';

const server = require('../server');
const { closeDb } = require('../src/database/db');

async function runIsolationTests() {
  console.log('--- TEST: Çok Bürolu (Multi-Tenant) Veri İzolasyonu & Güvenlik Testleri ---');
  const BASE_URL = 'http://localhost:8092';

  try {
    // 1. Büro A (Av. Kemal Erdem) Kaydı
    let cookieA = '';
    let clientAId = '';
    let caseAId = '';

    {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Av. Kemal Erdem',
          email: 'kemal@office-a.com',
          password: 'Password123!',
          officeName: 'Erdem Hukuk Bürosu (Büro A)',
          city: 'Ankara',
          termsAccepted: true
        })
      });
      assert.strictEqual(res.status, 201);
      cookieA = res.headers.get('set-cookie').split(';')[0];
    }

    // 2. Büro B (Av. Selin Demir) Kaydı
    let cookieB = '';
    {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Av. Selin Demir',
          email: 'selin@office-b.com',
          password: 'Password123!',
          officeName: 'Demir & Ortakları (Büro B)',
          city: 'İstanbul',
          termsAccepted: true
        })
      });
      assert.strictEqual(res.status, 201);
      cookieB = res.headers.get('set-cookie').split(';')[0];
    }

    console.log('✓ Büro A ve Büro B bağımsız oturumlarla oluşturuldu.');

    // 3. Büro A bir müvekkil oluşturur
    {
      const res = await fetch(`${BASE_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookieA },
        body: JSON.stringify({
          name: 'Atlas Savunma Sanayi A.Ş.',
          type: 'corporate',
          identityNo: '1234567890',
          email: 'hukuk@atlas.com.tr',
          phone: '0312 555 0001'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      clientAId = data.client.id;
      assert(clientAId, 'Müvekkil ID üretilmiş olmalı');
      console.log('✓ Büro A müvekkil oluşturdu: Atlas Savunma Sanayi A.Ş.');
    }

    // 4. Büro A bu müvekkil için bir dava dosyası açar
    {
      const res = await fetch(`${BASE_URL}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookieA },
        body: JSON.stringify({
          clientId: clientAId,
          internalNo: '2026/A-001',
          officialNo: '2026/418 E.',
          caseType: 'dava',
          courtName: 'Ankara 3. Asliye Ticaret Mahkemesi',
          stage: 'tahkikat',
          opponentName: 'Kuzey Lojistik Ltd.',
          claimAmount: 450000
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      caseAId = data.caseId;
      assert(caseAId, 'Dava dosyası ID üretilmiş olmalı');
      console.log('✓ Büro A dava dosyası açtı: 2026/418 E.');
    }

    // 5. İZOLASYON KONTROLÜ: Büro B müvekkil listesi çeker (Büro A'nın müvekkilini ASLA görmemeli)
    {
      const res = await fetch(`${BASE_URL}/api/clients`, {
        headers: { 'Cookie': cookieB }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.clients.length, 0, 'Büro B henüz müvekkil eklemediğinden liste boş olmalıdır.');
      console.log('✓ Büro B müvekkil listesinde Büro A müvekkili sızmadı (0 müvekkil)');
    }

    // 6. İZOLASYON KONTROLÜ: Büro B dava dosyaları listesi çeker
    {
      const res = await fetch(`${BASE_URL}/api/cases`, {
        headers: { 'Cookie': cookieB }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.cases.length, 0, 'Büro B dosya listesinde Büro A dosyası bulunmamalıdır.');
      console.log('✓ Büro B dosya listesinde Büro A davası sızmadı (0 dosya)');
    }

    // 7. YETKİSİZ ERİŞİM ENGELİ (IDOR): Büro B doğrudan Büro A'nın müvekkil ID'sini sorgular
    {
      const res = await fetch(`${BASE_URL}/api/clients/${clientAId}`, {
        headers: { 'Cookie': cookieB }
      });
      assert.strictEqual(res.status, 404, 'Farklı büroya ait müvekkil sorgusuna 404 dönmeli (Varlığı sızdırılmamalı)');
      console.log('✓ IDOR Koruması: Büro B müvekkil ID ile erişmeye çalıştığında 404 ile engellendi');
    }

    // 8. YETKİSİZ DEĞİŞİKLİK ENGELİ: Büro B Büro A'nın davasını güncellemeye çalışır
    {
      const res = await fetch(`${BASE_URL}/api/cases/${caseAId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookieB },
        body: JSON.stringify({ stage: 'kapandi' })
      });
      assert.strictEqual(res.status, 404, 'Farklı büro davasını güncelleme girişimi 404 ile engellenmeli');
      console.log('✓ Yetkisiz güncelleme engellendi (404)');
    }

    // 9. YETKİSİZ SİLME ENGELİ: Büro B Büro A'nın müvekkilini silmeye çalışır
    {
      const res = await fetch(`${BASE_URL}/api/clients/${clientAId}`, {
        method: 'DELETE',
        headers: { 'Cookie': cookieB }
      });
      assert.strictEqual(res.status, 404, 'Farklı büro müvekkilini silme girişimi 404 ile engellenmeli');
      console.log('✓ Yetkisiz silme engellendi (404)');
    }

    // 10. DENETİM İZİ (AUDIT LOG) İZOLASYONU: Büro B denetim izini çeker
    {
      const res = await fetch(`${BASE_URL}/api/tenant/audit-logs`, {
        headers: { 'Cookie': cookieB }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      const logs = data.logs || data;
      // Yalnızca Büro B'nin kendi kayıt ve login logları olmalı
      for (const log of logs) {
        assert.notStrictEqual(log.entity_id, clientAId, 'Büro A müvekkil ID logu Büro B loglarında olamaz');
        assert.notStrictEqual(log.entity_id, caseAId, 'Büro A dava ID logu Büro B loglarında olamaz');
      }
      console.log('✓ Denetim izi (Audit log) bürolar arasında kesin olarak izole edilmiştir');
    }

    // 11. BÜRO A KENDİ VERİLERİNİ EKSİKSİZ GÖRÜR
    {
      const res = await fetch(`${BASE_URL}/api/clients/${clientAId}`, {
        headers: { 'Cookie': cookieA }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.client.name, 'Atlas Savunma Sanayi A.Ş.');
      console.log('✓ Büro A kendi verilerine sorunsuz erişmektedir');
    }

    console.log('>>> TÜM ÇOK BÜROLU VERİ İZOLASYONU TESTLERİ BAŞARIYLA GEÇTİ <<<\n');
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

runIsolationTests().catch(err => {
  console.error('İzolasyon Test Hatası:', err);
  process.exit(1);
});
