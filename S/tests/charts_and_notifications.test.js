/**
 * ADN Platform - Grafikler, Animasyonlar ve Bildirim Merkezi Test Süiti
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080';

async function runChartsAndNotificationsTests() {
  console.log('--- TEST: Grafikler, Animasyonlar ve Bildirim Merkezi Başlatılıyor ---');

  // 1. Static Assets Verification
  const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');

  assert(indexHtml.includes('notification-bell-btn'), 'index.html bildirim zili butonu içermeli');
  assert(indexHtml.includes('notification-drawer'), 'index.html bildirim drawer paneli içermeli');
  assert(indexHtml.includes('notif-summary-chart'), 'index.html bildirim içi mini grafik barı içermeli');
  assert(indexHtml.includes('custom-dialog-overlay'), 'index.html özel onay ve bildirim diyaloğu içermeli');
  console.log('✓ [1/6] index.html bildirim paneli, mini grafik ve özel diyalog bileşenleri doğrulandı.');

  assert(styleCss.includes('@keyframes bellShake'), 'style.css zil sallanma animasyonu içermeli');
  assert(styleCss.includes('@keyframes pingPulse'), 'style.css kırmızı pulsing ping animasyonu içermeli');
  assert(styleCss.includes('.donut-container'), 'style.css Donut chart sınıfları içermeli');
  assert(styleCss.includes('.bar-pillar.income'), 'style.css Finansal sütun chart sınıfları içermeli');
  assert(styleCss.includes('.pipeline-container'), 'style.css Yargılama aşamaları boru hattı sınıfları içermeli');
  assert(styleCss.includes('@keyframes toastProgressShrink'), 'style.css toast geri sayım animasyonu içermeli');
  assert(styleCss.includes('.custom-dialog-backdrop'), 'style.css özel diyalog arka plan sınıfı içermeli');
  assert(styleCss.includes('@keyframes dialogPopUp'), 'style.css özel diyalog animasyonu içermeli');
  console.log('✓ [2/6] style.css tüm CSS animasyonları, grafik ve özel diyalog stil kuralları doğrulandı.');

  assert(appJs.includes('renderDonutChart'), 'app.js SVG Donut grafik çizicisi içermeli');
  assert(appJs.includes('renderBarChart'), 'app.js Finansal sütun grafik çizicisi içermeli');
  assert(appJs.includes('renderPipelineFunnel'), 'app.js Aşama boru hattı çizicisi içermeli');
  assert(appJs.includes('animateCount'), 'app.js KPI sayaç animasyonu fonksiyonu içermeli');
  assert(appJs.includes('toggleNotificationDrawer'), 'app.js bildirim paneli açma/kapama fonksiyonu içermeli');
  assert(appJs.includes('filterNotifications'), 'app.js bildirim kategori filtreleme fonksiyonu içermeli');
  assert(appJs.includes('toast-progress'), 'app.js toast ilerleme çubuğu içermeli');
  assert(appJs.includes('confirm(options'), 'app.js App.confirm özel diyalog metodu içermeli');
  assert(appJs.includes('alert(options'), 'app.js App.alert özel diyalog metodu içermeli');
  assert(!appJs.includes('if (!confirm('), 'app.js içinde hiçbir yerel tarayıcı confirm çağrısı kalmamalı');
  console.log('✓ [3/6] app.js grafik, bildirim ve özel diyalog işleyicileri (sıfır yerel confirm) doğrulandı.');

  // 2. API Test: Register a test lawyer
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Av. Görsel Test',
      email: `grafik_test_${Date.now()}@adntest.av.tr`,
      officeName: 'Grafik & Analitik Hukuk Bürosu',
      city: 'İzmir',
      barCity: 'İzmir Barosu',
      barNumber: '99182',
      password: 'StrongPassword123!',
      termsAccepted: true
    })
  });
  assert.strictEqual(regRes.status, 201, 'Kayıt başarılı olmalı');
  const cookie = regRes.headers.get('set-cookie');

  // 3. Check Fresh Dashboard Summary: Zero Fake Data Integrity
  const sumRes1 = await fetch(`${BASE_URL}/api/dashboard/summary`, {
    headers: { 'Cookie': cookie }
  });
  assert.strictEqual(sumRes1.status, 200);
  const data1 = await sumRes1.json();
  assert.strictEqual(data1.stats.active_cases, 0);
  assert.strictEqual(data1.caseTypeDistribution.length, 0);
  assert.strictEqual(data1.monthlyFinancials.length, 0);
  assert.strictEqual(data1.notifications.length, 0);
  console.log('✓ [4/6] Sıfır veri doğruluğu: Yeni açılan büroda sahte grafik verisi olmadığı doğrulandı.');

  // 4. Add Real Data: Client, Cases, Hearings, Deadlines, Financials
  // Client
  const clientRes = await fetch(`${BASE_URL}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      name: 'Ege Lojistik A.Ş.',
      type: 'corporate',
      taxNumber: '1122334455'
    })
  });
  const { client } = await clientRes.json();

  // Case 1: Dava
  await fetch(`${BASE_URL}/api/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      clientId: client.id,
      internalNo: '2026/01-DAVA',
      caseType: 'dava',
      courtName: 'İzmir 1. Asliye Hukuk Mahkemesi',
      stage: 'on_inceleme',
      claimAmount: 500000
    })
  });

  // Case 2: İcra
  await fetch(`${BASE_URL}/api/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      clientId: client.id,
      internalNo: '2026/02-ICRA',
      caseType: 'icra',
      courtName: 'İzmir 3. İcra Dairesi',
      stage: 'dava_acildi',
      claimAmount: 250000
    })
  });

  // Event 1: Hearing (today or tomorrow)
  const todayStr = new Date().toISOString().split('T')[0];
  await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      eventType: 'hearing',
      eventDate: `${todayStr}T10:00:00`,
      title: '1. Celse Ön İnceleme'
    })
  });

  // Event 2: Urgent Deadline
  await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      eventType: 'deadline',
      eventDate: `${todayStr}T17:00:00`,
      title: 'HMK Cevap Dilekçesi Son Günü'
    })
  });

  // Financial: Collection & Expense
  await fetch(`${BASE_URL}/api/finance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      recordType: 'collection',
      amount: 180000,
      paymentDate: todayStr,
      paymentMethod: 'bank_transfer',
      description: 'Peşin Vekâlet Ücreti'
    })
  });

  await fetch(`${BASE_URL}/api/finance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      recordType: 'expense',
      amount: 25000,
      paymentDate: todayStr,
      paymentMethod: 'cash',
      description: 'Bilirkişi ve Keşif Avansı'
    })
  });

  console.log('✓ [5/6] Gerçek veriler (2 Dosya, 1 Celse, 1 Süre, 180.000 TL Tahsilat, 25.000 TL Masraf) kaydedildi.');

  // 5. Check Populated Dashboard Summary: Graphs & Notifications
  const sumRes2 = await fetch(`${BASE_URL}/api/dashboard/summary`, {
    headers: { 'Cookie': cookie }
  });
  assert.strictEqual(sumRes2.status, 200);
  const data2 = await sumRes2.json();

  assert.strictEqual(data2.stats.active_cases, 2, '2 aktif dosya olmalı');
  assert.strictEqual(Number(data2.stats.total_collections), 180000, 'Tahsilat 180.000 TL olmalı');

  // Case distribution
  assert(data2.caseTypeDistribution.length >= 2, 'En az 2 dava türü olmalı');
  const davaType = data2.caseTypeDistribution.find(d => d.case_type === 'dava');
  const icraType = data2.caseTypeDistribution.find(d => d.case_type === 'icra');
  assert(davaType && davaType.count === 1, 'Hukuk davası 1 adet olmalı');
  assert(icraType && icraType.count === 1, 'İcra takibi 1 adet olmalı');

  // Financial trend
  assert(data2.monthlyFinancials.length >= 2, 'Aylık gelir ve gider kayıtları dönmeli');
  const colRec = data2.monthlyFinancials.find(f => f.record_type === 'collection');
  const expRec = data2.monthlyFinancials.find(f => f.record_type === 'expense');
  assert.strictEqual(Number(colRec.total), 180000, 'Aylık tahsilat toplamı 180.000 TL olmalı');
  assert.strictEqual(Number(expRec.total), 25000, 'Aylık masraf toplamı 25.000 TL olmalı');

  // Notifications
  assert(data2.notifications.length >= 2, 'En az 2 kritik bildirim üretilmeli (Celse ve Süre)');
  const notifHearing = data2.notifications.find(n => n.type === 'hearing');
  const notifDeadline = data2.notifications.find(n => n.type === 'deadline');
  assert(notifHearing, 'Duruşma bildirimi mevcut olmalı');
  assert(notifDeadline, 'Kritik süre bildirimi mevcut olmalı');
  console.log(`✓ [6/6] Grafik ve bildirim verileri doğrulandı: ${data2.notifications.length} bildirim, Donut dilimleri ve Finansal trend hazır.`);

  console.log('\n>>> TÜM GRAFİK, ANİMASYON VE BİLDİRİM TESTLERİ BAŞARIYLA GEÇTİ <<<');
}

runChartsAndNotificationsTests().catch(err => {
  console.error('Test hatası:', err);
  process.exit(1);
});
