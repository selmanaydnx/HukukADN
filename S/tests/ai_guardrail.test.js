const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const testDbPath = path.join(__dirname, 'test_ai.sqlite');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
process.env.ADN_DB_PATH = testDbPath;
process.env.PORT = '8093';

const server = require('../server');
const { closeDb } = require('../src/database/db');

async function runAiGuardrailTests() {
  console.log('--- TEST: TBB Uyumlu AI Guardrail & Mesleki Sır Denetimleri ---');
  const BASE_URL = 'http://localhost:8093';

  try {
    // 1. Büro ve Kullanıcı Kaydı
    let cookie = '';
    let caseId = '';
    {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Av. Zeynep Kaya',
          email: 'zeynep@kayahukuk.av.tr',
          password: 'Password123!',
          officeName: 'Kaya Hukuk Bürosu',
          city: 'İzmir',
          termsAccepted: true
        })
      });
      assert.strictEqual(res.status, 201);
      cookie = res.headers.get('set-cookie').split(';')[0];
    }

    // 2. Müvekkil ve Dava Ekleme
    {
      const clientRes = await fetch(`${BASE_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ name: 'Ege Nakliyat A.Ş.', type: 'corporate' })
      });
      const clientData = await clientRes.json();

      const caseRes = await fetch(`${BASE_URL}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({
          clientId: clientData.client.id,
          internalNo: '2026/EGE-01',
          officialNo: '2026/552 E.',
          caseType: 'dava',
          courtName: 'İzmir 4. Asliye Ticaret Mahkemesi',
          stage: 'on_inceleme',
          claimAmount: 850000
        })
      });
      const caseData = await caseRes.json();
      caseId = caseData.caseId;
    }

    // 3. AI Dosya Özeti İsteme -> Zorunlu Taslak Uyarısı ve İnsan Denetimi Bayrağı
    {
      const res = await fetch(`${BASE_URL}/api/ai/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({
          caseId,
          promptType: 'summarize'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.humanReviewRequired, true, 'İnsan denetimi (Human review) bayrağı true olmalıdır.');
      assert(data.disclaimer.includes('Taslak — avukat kontrolü gerekli'), 'TBB tavsiye şerhi yanıtta yer almalıdır.');
      assert.strictEqual(data.externalAITransfer, 'Kapalı (Veriler Yalnızca Yerel Olarak İşlenmektedir)', 'Harici AI aktarımı varsayılan olarak kapalı olmalıdır.');
      console.log('✓ TBB Zorunlu Taslak Uyarısı ve İnsan Denetimi bayrağı doğrulandı');
    }

    // 4. Bilinmeyen / Dosyada Olmayan Hususta Soru Sorma (Hallucination Testi)
    {
      const res = await fetch(`${BASE_URL}/api/ai/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({
          caseId,
          promptType: 'qa',
          customQuery: 'Bu davadaki gizli tanığın kimliği nedir?'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert(data.outputText.includes('bulunamadı'), 'Dosyada olmayan bilgi için "bulunamadı" yanıtı verilmeli, uydurma yapılmamalıdır.');
      assert(data.citations && data.citations.length > 0, 'Kaynak atfı (citation) zorunlu olmalıdır.');
      console.log('✓ Halüsinasyon engeli: Dosyada olmayan bilgi uydurulmayıp "bulunamadı" döndü');
    }

    // 5. Bilinen Veriyi Sorgulama
    {
      const res = await fetch(`${BASE_URL}/api/ai/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({
          caseId,
          promptType: 'qa',
          customQuery: 'Dosyanın talep edilen tutarı veya alacak miktarı nedir?'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert(data.outputText.includes('850.000 TL') || data.outputText.includes('850000'), 'Davadaki gerçek talep tutarı yanıtlanmalı.');
      console.log('✓ Dosya verisine dayalı doğrulanmış yanıt üretildi');
    }

    console.log('>>> TÜM AI GUARDRAIL TESTLERİ BAŞARIYLA GEÇTİ <<<\n');
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

runAiGuardrailTests().catch(err => {
  console.error('AI Guardrail Test Hatası:', err);
  process.exit(1);
});
