const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// Set dedicated test DB path
const testDbPath = path.join(__dirname, 'test_tools.sqlite');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
process.env.ADN_DB_PATH = testDbPath;
process.env.PORT = '8095';

const server = require('../server');
const { closeDb } = require('../src/database/db');
const {
  calculateSMM,
  calculateExecutionCover,
  calculateAAUT
} = require('../src/utils/proceduralRules');

async function runLawyerInternToolsTests() {
  console.log('--- TEST: Avukat & Stajyer Araçları, SMM, İcra Kapak ve Yetki Belgesi Testleri Başlatılıyor ---');
  const BASE_URL = 'http://localhost:8095';

  try {
    // 1. SMM Hesaplama Doğrulaması (Brütten Nete ve Netten Brüte)
    {
      // 50.000 TL Brüt, %20 KDV, %20 Stopaj, Tevkifatsız
      const smm1 = calculateSMM({
        calculationType: 'gross_to_net',
        amount: 50000,
        vatRate: 20,
        withholdingRate: 20,
        withholdingDeduction: 'none'
      });

      assert.strictEqual(smm1.grossFee, 50000, 'Brüt ücret 50.000 TL olmalıdır');
      assert.strictEqual(smm1.withholdingTax, 10000, 'Stopaj 10.000 TL (%20) olmalıdır');
      assert.strictEqual(smm1.netFee, 40000, 'Net avukatlık ücreti 40.000 TL olmalıdır');
      assert.strictEqual(smm1.vatTotal, 10000, 'KDV 10.000 TL (%20) olmalıdır');
      assert.strictEqual(smm1.vatDeduction, 0, 'Tevkifat olmamalıdır');
      assert.strictEqual(smm1.totalPaidByClient, 50000, 'Müvekkilden tahsil edilen net nakit: Net (40k) + KDV (10k) = 50.000 TL olmalıdır');
      assert.strictEqual(smm1.totalClientCost, 60000, 'Müvekkilin toplam maliyeti: Brüt (50k) + KDV (10k) = 60.000 TL olmalıdır');

      // 1/2 Tevkifatlı SMM
      const smm2 = calculateSMM({
        calculationType: 'gross_to_net',
        amount: 100000,
        vatRate: 20,
        withholdingRate: 20,
        withholdingDeduction: 'half'
      });

      assert.strictEqual(smm2.vatTotal, 20000, 'Toplam KDV 20.000 TL');
      assert.strictEqual(smm2.vatDeduction, 10000, '1/2 Tevkifat ile tevkif edilen KDV 10.000 TL');
      assert.strictEqual(smm2.vatCollected, 10000, 'Avukatın tahsil ettiği KDV 10.000 TL');
      assert.strictEqual(smm2.totalPaidByClient, 90000, 'Müvekkilden tahsil: 80.000 Net + 10.000 KDV = 90.000 TL');

      console.log('✓ [1/6] SMM Hesaplayıcı formülleri ve tevkifat kuralları doğrulandı.');
    }

    // 2. İcra Kapak & Güncel Borç Hesabı Doğrulaması (İİK)
    {
      // 100.000 TL alacak, 365 gün, yasal faiz %24, haciz öncesi %9.10 tahsil harcı
      const exec = calculateExecutionCover({
        principal: 100000,
        startDateStr: '2025-01-01',
        calcDateStr: '2026-01-01',
        interestType: 'legal',
        stage: 'after_payment_order_before_seizure',
        expenses: 2500,
        partialPayments: 10000
      });

      assert.strictEqual(exec.principal, 100000, 'Asıl alacak 100.000 TL olmalıdır');
      assert.strictEqual(exec.accruedInterest, 24000, '1 yıllık %24 yasal faiz 24.000 TL olmalıdır');
      assert.strictEqual(exec.expenses, 2500, 'Masraflar 2.500 TL');
      assert(exec.attorneyFee > 0, 'İcra vekâlet ücreti hesaplanmalıdır');
      assert.strictEqual(exec.collectionLevyRate, 9.10, 'Haciz öncesi tahsil harcı %9.10 olmalıdır');
      assert.strictEqual(exec.prisonLevy, 2000, 'Cezaevi harcı asıl alacağın %2 si (2.000 TL) olmalıdır');
      assert.strictEqual(exec.partialPayments, 10000, 'Yapılan kısmi ödeme mahsup edilmelidir');
      assert(exec.totalDebt > exec.principal, 'Toplam dosya borcu ana parayı aşmalıdır');

      console.log('✓ [2/6] İcra Kapak ve Güncel Borç Hesabı motoru doğrulandı.');
    }

    // 3. AAÜT Kademeli Vekâlet Ücreti Tarifesi Doğrulaması
    {
      // 200.000 TL dava değeri (İlk dilim %16 -> 32.000 TL > 30.000 TL asliye tabanı)
      const aaut1 = calculateAAUT({ claimAmount: 200000, courtType: 'asliye' });
      assert.strictEqual(aaut1.appliedRule, 'nisbi');
      assert.strictEqual(aaut1.totalFee, 32000, '200.000 TL için %16 nisbi ücret 32.000 TL olmalıdır');

      // 50.000 TL dava değeri (Nisbi %16 = 8.000 TL, ancak Asliye Hukuk maktu tabanı 30.000 TL olduğundan taban uygulanır)
      const aaut2 = calculateAAUT({ claimAmount: 50000, courtType: 'asliye' });
      assert.strictEqual(aaut2.appliedRule, 'maktu_taban');
      assert.strictEqual(aaut2.totalFee, 30000, 'Taban maktu kuralı gereği 30.000 TL olmalıdır');

      console.log('✓ [3/6] AAÜT Kademeli Nisbi ve Maktu Taban kuralları doğrulandı.');
    }

    // 4. API Üzerinden Hesaplama Uç Noktalarının Doğrulanması
    {
      const resSmm = await fetch(`${BASE_URL}/api/calc/smm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculationType: 'gross_to_net', amount: 30000 })
      });
      assert.strictEqual(resSmm.status, 200);
      const dataSmm = await resSmm.json();
      assert(dataSmm.success && dataSmm.smm.netFee === 24000);

      const resExec = await fetch(`${BASE_URL}/api/calc/execution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ principal: 50000 })
      });
      assert.strictEqual(resExec.status, 200);
      const dataExec = await resExec.json();
      assert(dataExec.success && dataExec.execution.totalDebt > 50000);

      const resAaut = await fetch(`${BASE_URL}/api/calc/aaut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimAmount: 1000000, courtType: 'asliye' })
      });
      assert.strictEqual(resAaut.status, 200);
      const dataAaut = await resAaut.json();
      assert(dataAaut.success && dataAaut.aaut.totalFee > 0);

      console.log('✓ [4/6] /api/calc/smm, /api/calc/execution, /api/calc/aaut REST API uçları doğrulandı.');
    }

    // 5. Duruşma Zabıt Notu & Kesin Mehil Kayıt Akışı
    let cookie = '';
    let caseId = '';
    {
      // Büro ve Kullanıcı Kaydı
      const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Av. Ceyda Yılmaz',
          email: `araclar_test_${Date.now()}@adntest.av.tr`,
          officeName: 'Yılmaz Hukuk & Danışmanlık',
          city: 'İstanbul',
          barCity: 'İstanbul Barosu',
          barNumber: '55192',
          password: 'Password123!',
          termsAccepted: true
        })
      });
      assert.strictEqual(regRes.status, 201);
      cookie = regRes.headers.get('set-cookie').split(';')[0];

      // Dava Dosyası Oluştur
      const clientRes = await fetch(`${BASE_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ name: 'Delta Bilişim A.Ş.' })
      });
      const clientData = await clientRes.json();

      const caseRes = await fetch(`${BASE_URL}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({
          clientId: clientData.client.id,
          internalNo: '2026/TEST-01',
          officialNo: '2026/88 E.',
          caseType: 'dava',
          courtName: 'İstanbul 4. Asliye Ticaret Mahkemesi',
          stage: 'tahkikat'
        })
      });
      const caseData = await caseRes.json();
      caseId = caseData.caseId;

      // Duruşma Zabıt Notu Gönder
      const hearingRes = await fetch(`${BASE_URL}/api/cases/${caseId}/hearing-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({
          hearingResult: 'Duruşma Ertelendi (Ara Kararlar İfa Edilecek)',
          notes: 'Tanıkların dinlenmesi ve bilirkişi ek raporu alınması için ertelendi.',
          nextHearingDate: '2026-11-15T10:30:00',
          deadlineDescription: '2 hafta içinde tanık listesi sunulması',
          deadlineDays: 14
        })
      });

      assert.strictEqual(hearingRes.status, 200);
      const hearingData = await hearingRes.json();
      assert(hearingData.success === true);
      assert(hearingData.createdEvent, 'Gelecek duruşma takvime işlenmelidir');
      assert(hearingData.createdTask, 'Verilen ara karar acil görevlere eklenmelidir');

      console.log('✓ [5/6] Duruşma Zabıt Notu, Sonraki Celse ve Ara Karar Kesin Mehil kaydı doğrulandı.');
    }

    // 6. Adliye Masraf & Harç Pusulası Kaydı
    {
      const expRes = await fetch(`${BASE_URL}/api/finance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({
          caseId,
          recordType: 'expense',
          amount: 1450.50,
          currency: 'TRY',
          paymentDate: new Date().toISOString().split('T')[0],
          description: '[Adliye Masrafı - Bilirkişi / Keşif Gider Avansı] Bilirkişi tahsil makbuzu (Ödeme: Büro Avansından Ödendi)'
        })
      });

      assert.strictEqual(expRes.status, 201);
      const expData = await expRes.json();
      assert(expData.recordId, 'Masraf kaydı ID oluşturulmalıdır');

      // Finans dökümünden doğrula
      const finListRes = await fetch(`${BASE_URL}/api/finance?caseId=${caseId}`, {
        headers: { 'Cookie': cookie }
      });
      const finListData = await finListRes.json();
      assert.strictEqual(finListData.totals.total_expense, 1450.50);

      console.log('✓ [6/6] Adliye Masraf & Harç Pusulası dosya finans kaydına başarıyla işlendi.');
    }

    console.log('\n>>> TÜM AVUKAT & STAJYER ARAÇLARI TESTLERİ BAŞARIYLA GEÇTİ <<<\n');
  } finally {
    server.close();
    closeDb();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  }
}

if (require.main === module) {
  runLawyerInternToolsTests().catch(err => {
    console.error('Test hatası:', err);
    process.exit(1);
  });
}

module.exports = runLawyerInternToolsTests;
