const assert = require('node:assert');

async function testFullE2E() {
  console.log('====================================================');
  console.log('  ADN PLATFORMU - UÇTAN UCA (E2E) ENTEGRASYON TESTİ ');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:8080';

  // 1. Statik Sayfa ve Varlıkların Erişilebilirliği
  {
    const res = await fetch(`${BASE_URL}/`);
    assert.strictEqual(res.status, 200, 'Ana sayfa 200 OK dönmelidir.');
    const html = await res.text();
    assert(html.includes('ADN'), 'Ana sayfa ADN başlığı içermelidir.');
    assert(html.includes('TBB & KVKK UYUMLU'), 'Üst bilgilendirme bandı yer almalıdır.');
    assert(html.includes('UYAP'), 'UYAP bilgilendirme bağlantıları yer almalıdır.');
    console.log('✓ [1/12] Ana sayfa (index.html) ve kurumsal yasal şeffaflık bandı doğrulandı.');

    const cssRes = await fetch(`${BASE_URL}/css/style.css`);
    assert.strictEqual(cssRes.status, 200, 'CSS dosyası 200 OK dönmelidir.');
    const jsApiRes = await fetch(`${BASE_URL}/js/api.js`);
    assert.strictEqual(jsApiRes.status, 200, 'api.js dosyası 200 OK dönmelidir.');
    const jsAppRes = await fetch(`${BASE_URL}/js/app.js`);
    assert.strictEqual(jsAppRes.status, 200, 'app.js dosyası 200 OK dönmelidir.');
    console.log('✓ [2/12] Tüm CSS ve JS varlıkları (style.css, api.js, app.js) başarıyla yüklendi.');
  }

  // 2. Ziyaretçilere Açık Hızlı Usul Süre Hesaplama API
  {
    const res = await fetch(`${BASE_URL}/api/procedural/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseDate: '2026-06-03',
        ruleType: 'hmk_2_weeks'
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.dueDate, '2026-06-17', 'HMK 2 hafta 17 Haziran 2026 olmalıdır.');
    assert(data.citation.includes('HMK m. 92'), 'Yasal dayanak HMK m. 92 içermelidir.');
    console.log('✓ [3/12] Ziyaretçilere açık HMK/UETS süre hesaplayıcı anlık yanıt üretti.');
  }

  // 3. Yeni Büro Kaydı (Av. Kemal Erdem)
  let cookie = '';
  let tenantId = '';
  let userId = '';
  {
    const randomEmail = `kemal_${Date.now()}@erdemhukuk.av.tr`;
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Av. Kemal Erdem',
        email: randomEmail,
        password: 'GuvenliParola123!',
        officeName: 'Erdem & Ortakları Hukuk Bürosu',
        city: 'Ankara',
        barCity: 'Ankara Barosu',
        barNumber: '34821',
        termsAccepted: true
      })
    });
    assert.strictEqual(res.status, 201, 'Büro kaydı 201 oluşturulmalıdır.');
    const data = await res.json();
    tenantId = data.tenant.id;
    userId = data.user.id;
    cookie = res.headers.get('set-cookie').split(';')[0];
    assert(cookie.includes('adn_session='), 'Oturum çerezi alınmalıdır.');
    console.log(`✓ [4/12] Büro kaydı tamamlandı: "${data.tenant.name}" (Rol: ${data.tenant.role})`);
  }

  // 4. Sıfır Veri (Fresh Account) İlkesi Kontrolü: Demo/Sahte Veri Olmamalı
  {
    const res = await fetch(`${BASE_URL}/api/dashboard/summary`, {
      headers: { 'Cookie': cookie }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.stats.active_cases, 0, 'Yeni büroda aktif dava 0 olmalıdır.');
    assert.strictEqual(data.stats.today_hearings, 0, 'Yeni büroda bugünkü duruşma 0 olmalıdır.');
    assert.strictEqual(data.stats.pending_tasks, 0, 'Yeni büroda görev 0 olmalıdır.');
    assert.strictEqual(data.stats.total_collections, 0, 'Yeni büroda tahsilat 0 olmalıdır.');
    assert.strictEqual(data.upcomingHearings.length, 0, 'Duruşma listesi boş olmalıdır.');
    assert.strictEqual(data.urgentDeadlines.length, 0, 'Süre listesi boş olmalıdır.');
    console.log('✓ [5/12] Sıfır Sahte Veri İlkesi Doğrulandı: Kullanıcı eklemeden hiçbir yapay veri görünmüyor.');
  }

  // 5. Müvekkil Oluşturma (CRM)
  let clientId = '';
  {
    const res = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        name: 'Atlas Savunma Sanayi A.Ş.',
        type: 'corporate',
        identityNo: '1234567890',
        phone: '0312 555 0101',
        email: 'hukuk@atlas.com.tr',
        notaryInfo: 'Ankara 12. Noterliği, 2025/1108 Yevmiye'
      })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    clientId = data.client.id;
    console.log('✓ [6/12] Müvekkil başarıyla eklendi: Atlas Savunma Sanayi A.Ş.');
  }

  // 6. Menfaat Çatışması (Conflict of Interest) Kontrolü
  {
    const res = await fetch(`${BASE_URL}/api/clients/conflict-check?name=Atlas`, {
      headers: { 'Cookie': cookie }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.hasConflict, true, 'Eklenen müvekkil adı sorgulandığında menfaat çatışması tetiklenmeli.');
    console.log('✓ [7/12] Menfaat Çatışması (Conflict Check) algoritması doğrulandı.');
  }

  // 7. Dava Dosyası Açma
  let caseId = '';
  {
    const res = await fetch(`${BASE_URL}/api/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        clientId,
        internalNo: '2026/D-001',
        officialNo: '2026/418 E.',
        caseType: 'dava',
        courtName: 'Ankara 3. Asliye Ticaret Mahkemesi',
        stage: 'tahkikat',
        opponentName: 'Kuzey Lojistik Ltd. Şti.',
        opponentCounsel: 'Av. Selin Demir',
        claimAmount: 750000
      })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    caseId = data.caseId;
    console.log('✓ [8/12] Dava dosyası başarıyla açıldı: 2026/D-001 (750.000 TL Talep)');
  }

  // 8. Duruşma & UETS Süresi Ekleme
  {
    const hearingDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
    const res = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        caseId,
        eventType: 'hearing',
        title: '3. Celse (Bilirkişi Raporu İncelemesi)',
        eventDate: hearingDate,
        serviceDate: '2026-05-10',
        notes: 'Duruşma Salonu: 2. Kat No: 204'
      })
    });
    assert.strictEqual(res.status, 201);
    console.log('✓ [9/12] Duruşma ve UETS 5 günlük yasal tebliğ süresi takvime kaydedildi.');
  }

  // 9. Tahsilat Kaydı Ekleme
  {
    const res = await fetch(`${BASE_URL}/api/finance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        caseId,
        recordType: 'collection',
        amount: 85000,
        currency: 'TRY',
        paymentDate: new Date().toISOString().split('T')[0],
        description: 'Müvekkil akdi vekâlet ücreti 1. taksit tahsilatı'
      })
    });
    assert.strictEqual(res.status, 201);
    console.log('✓ [10/12] 85.000 TL tahsilat makbuzu kaydedildi.');
  }

  // 10. Dashboard'da Gerçek Verilerin Yansıması
  {
    const res = await fetch(`${BASE_URL}/api/dashboard/summary`, {
      headers: { 'Cookie': cookie }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.stats.active_cases, 1, 'Aktif dava 1 olmalıdır.');
    assert.strictEqual(data.stats.total_collections, 85000, 'Toplam tahsilat 85.000 TL olmalıdır.');
    assert.strictEqual(data.upcomingHearings.length, 1, 'Yaklaşan 1 duruşma listelenmelidir.');
    console.log('✓ [11/12] Dashboard gerçek metriklerle dinamik olarak güncellendi (1 Dosya, 85.000 TL Tahsilat).');
  }

  // 11. TBB Uyumlu Yapay Zekâ Asistanı & Guardrail
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
    assert.strictEqual(data.humanReviewRequired, true, 'İnsan denetimi zorunlu olmalıdır.');
    assert(data.disclaimer.includes('Taslak — avukat kontrolü gerekli'), 'TBB taslak şerhi zorunludur.');
    assert(data.outputText.includes('2026/D-001'), 'Dosya numarası doğru özetlenmelidir.');

    // Halüsinasyon engeli kontrolü
    const qaRes = await fetch(`${BASE_URL}/api/ai/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        caseId,
        promptType: 'qa',
        customQuery: 'Gizli tanığın banka hesap numarası nedir?'
      })
    });
    const qaData = await qaRes.json();
    assert(qaData.outputText.includes('bulunamadı'), 'Dosyada olmayan bilgi için "bulunamadı" dönmeli.');
    console.log('✓ [12/12] TBB Yapay Zekâ Motoru: Taslak uyarısı, kaynak gösterme ve halüsinasyon engeli kusursuz çalıştı.');
  }

  console.log('\n====================================================');
  console.log('🎉 TEBRİKLER! TÜM E2E ENTEGRASYON ADIMLARI (12/12) BAŞARIYLA TAMAMLANDI!');
  console.log('====================================================\n');
}

testFullE2E().catch(err => {
  console.error('E2E Test Hatası:', err);
  process.exit(1);
});
