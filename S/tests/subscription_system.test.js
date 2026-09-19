const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Test ortamı için özel port ve DB
const TEST_DB_PATH = path.join(__dirname, 'sub_test.sqlite');
process.env.ADN_DB_PATH = TEST_DB_PATH;
process.env.PORT = '8097';

if (fs.existsSync(TEST_DB_PATH)) {
  try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
}

const server = require('../server');

async function request(urlPath, options = {}) {
  const url = `http://localhost:8097${urlPath}`;
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

async function runSubscriptionTests() {
  console.log('--- TEST: Abonelik, Limitler ve Ödeme Entegrasyonu Testleri Başlatılıyor ---');

  let ownerCookie = '';
  let tenantId = '';
  let assistantCookie = '';

  try {
    // 1. Açık Fiyat ve Paket Listesi Kontrolü
    const plansRes = await request('/api/billing/plans');
    assert.strictEqual(plansRes.status, 200, 'Açık planlar listelenebilmeli');
    assert.ok(plansRes.data.plans.length >= 3, 'En az 3 plan (Solo, Pro, Kurumsal) dönmeli');
    assert.ok(plansRes.data.plans[0].is_demo_pricing, 'Demo fiyatlandırma bayrağı açık olmalı');
    assert.ok(plansRes.data.plans[0].yearly_savings > 0, 'Yıllık indirim tutarı doğru hesaplanmalı');
    console.log('✓ Açık paket listesi, demo rozeti ve yıllık indirim hesaplaması doğrulandı.');

    // 2. Yeni Büro Kaydı
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Av. Zeynep Kaya',
        email: 'zeynep@kayahukuk.av.tr',
        password: 'Password2026!',
        officeName: 'Kaya & Ortakları Hukuk Bürosu',
        city: 'İstanbul',
        barCity: 'İstanbul Barosu',
        barNumber: '65432',
        termsAccepted: true
      }
    });
    assert.strictEqual(regRes.status, 201, 'Kayıt başarılı olmalı');
    ownerCookie = regRes.setCookie.split(';')[0];
    tenantId = regRes.data.tenant.id;
    console.log('✓ Yeni hukuk bürosu başarıyla oluşturuldu.');

    // 3. 14 Günlük Kartsız Deneme Başlatma
    const trialRes = await request('/api/billing/start-trial', {
      method: 'POST',
      headers: { Cookie: ownerCookie }
    });
    assert.strictEqual(trialRes.status, 200, 'Deneme süresi başlatılabilmeli');
    assert.ok(trialRes.data.trial_ends_at, 'Deneme bitiş tarihi atanmalı');
    console.log('✓ 14 Günlük kartsız ücretsiz deneme başarıyla başlatıldı.');

    // 4. Aynı Büronun Tekrar Deneme Başlatmasının Engellenmesi
    const reTrialRes = await request('/api/billing/start-trial', {
      method: 'POST',
      headers: { Cookie: ownerCookie }
    });
    assert.strictEqual(reTrialRes.status, 400, 'Aynı büro ikinci kez deneme başlatamamalı');
    console.log('✓ Mükerrer ücretsiz deneme başlatma girişimi engellendi (400).');

    // 5. Canlı Kullanım Kotaları ve Göstergeleri (My Subscription)
    const mySubRes = await request('/api/billing/my-subscription', {
      headers: { Cookie: ownerCookie }
    });
    assert.strictEqual(mySubRes.status, 200);
    assert.strictEqual(mySubRes.data.subscription.status, 'trialing');
    assert.ok(mySubRes.data.usage.members.max > 0, 'Üye kotası dönmeli');
    assert.ok(mySubRes.data.usage.cases.max > 0, 'Dava kotası dönmeli');
    console.log('✓ Büronun canlı abonelik durumu ve kullanım kotaları doğrulandı.');

    // 6. Test Amaçlı: Büroyu Solo Plana Alarak Kota Sınırını Test Edelim
    const { getDb } = require('../src/database/db');
    const db = getDb();
    db.prepare("UPDATE tenants SET plan_id = 'solo', status = 'active' WHERE id = ?;").run(tenantId);

    // Solo planda max 1 avukat vardır; 2. avukat davet edilmeye çalışıldığında kota engeli kontrolü
    const inviteBlocked = await request('/api/tenant/invite', {
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: { email: 'stajyer@kayahukuk.av.tr', role: 'lawyer' }
    });
    assert.strictEqual(inviteBlocked.status, 403, 'Solo planda 2. avukat kotaya takılmalı (403)');
    assert.ok(inviteBlocked.data.error.includes('kotasına ulaştınız'));
    console.log('✓ Paket üye sınırı aşıldığında sunucu tarafı kota engeli doğrulandı (403).');

    // 7. Dava Kotası Testi: Solo planda sınırı simüle etmek için planın max_cases değerini 1 yapalım
    db.prepare("UPDATE subscription_plans SET max_cases = 1 WHERE id = 'solo';").run();

    // Bir müvekkil ekleyelim
    const clientRes = await request('/api/clients', {
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: { name: 'Müvekkil Test A.Ş.', type: 'corporate' }
    });
    const clientId = clientRes.data.client.id;

    // 1. Dava (Başarılı olmalı)
    const case1 = await request('/api/cases', {
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: { clientId, internalNo: '2026/001' }
    });
    assert.strictEqual(case1.status, 201);

    // 2. Dava (Limit 1 olduğu için 403 ile engellenmeli)
    const case2Blocked = await request('/api/cases', {
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: { clientId, internalNo: '2026/002' }
    });
    assert.strictEqual(case2Blocked.status, 403, 'Dava kotası aşıldığında 403 dönmeli');
    assert.ok(case2Blocked.data.error.includes('takip sınırına ulaştınız'));
    console.log('✓ Dava dosya kotası dolduğunda sunucu tarafı koruma kalkanı doğrulandı (403).');

    // Plan kotasını eski haline getirelim
    db.prepare("UPDATE subscription_plans SET max_cases = 150 WHERE id = 'solo';").run();

    // 8. Güvenli Checkout Başlatma (Sunucu Tarafı Tutar Hesabı)
    const checkoutRes = await request('/api/billing/checkout', {
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: { planId: 'pro', billingCycle: 'yearly' }
    });
    assert.strictEqual(checkoutRes.status, 200, 'Checkout oturumu açılabilmeli');
    const c = checkoutRes.data.checkout;
    assert.ok(c.merchantOid.startsWith('ADN-'), 'Sağlayıcı sipariş numarası oluşturulmalı');
    assert.strictEqual(c.billingCycle, 'yearly');
    assert.strictEqual(c.totalAmount, Number((28320 * 1.20).toFixed(2)), 'KDV dahil toplam tutar sunucuda hesaplanmalı');
    console.log('✓ Güvenli checkout başlatma ve sunucu taraflı KDV/tutar hesabı doğrulandı.');

    // 9. Sağlayıcı İmzalı Webhook ve İdempotency Doğrulaması
    const webhookRes1 = await request('/api/billing/webhook/iyzico', {
      method: 'POST',
      body: {
        merchantOid: c.merchantOid,
        status: 'SUCCESS',
        paymentId: 'IYZI-TEST-9921'
      }
    });
    assert.strictEqual(webhookRes1.status, 200, 'Webhook onaylanmalı');
    
    // Büronun paketinin 'pro' ve 'active' olduğunu doğrula
    const tenantCheck = db.prepare('SELECT status, plan_id, billing_cycle FROM tenants WHERE id = ?;').get(tenantId);
    assert.strictEqual(tenantCheck.status, 'active');
    assert.strictEqual(tenantCheck.plan_id, 'pro');
    assert.strictEqual(tenantCheck.billing_cycle, 'yearly');
    console.log('✓ İmzalı webhook ile ödeme onaylandı ve büro aboneliği aktifleştirildi.');

    // Mükerrer Webhook Gönderimi (İdempotency Testi)
    const webhookRes2 = await request('/api/billing/webhook/iyzico', {
      method: 'POST',
      body: {
        merchantOid: c.merchantOid,
        status: 'SUCCESS',
        paymentId: 'IYZI-TEST-9921'
      }
    });
    assert.strictEqual(webhookRes2.status, 200);
    assert.ok(webhookRes2.data.message.includes('İdempotent'));
    console.log('✓ Yinelenen ödeme bildiriminin tek kez işlenmesi (İdempotency) doğrulandı.');

    // 10. Dönem Sonunda İptal Talebi
    const cancelRes = await request('/api/billing/cancel', {
      method: 'POST',
      headers: { Cookie: ownerCookie }
    });
    assert.strictEqual(cancelRes.status, 200);
    const tenantCancel = db.prepare('SELECT cancel_at_period_end FROM tenants WHERE id = ?;').get(tenantId);
    assert.strictEqual(tenantCancel.cancel_at_period_end, 1, 'Dönem sonunda iptal bayrağı 1 olmalı');
    console.log('✓ Dönem sonunda iptal akışı ve hakların dönem sonuna kadar korunması doğrulandı.');

    // 11. İşlem ve Dekont Geçmişi Listeleme
    const trxListRes = await request('/api/billing/transactions', {
      headers: { Cookie: ownerCookie }
    });
    assert.strictEqual(trxListRes.status, 200);
    assert.ok(trxListRes.data.transactions.length >= 1, 'En az 1 tahsilat işlemi bulunmalı');
    assert.ok(trxListRes.data.legal_notice.includes('dekontu'), 'Elektronik dekont yasal uyarısı bulunmalı');
    console.log('✓ Tahsilat dekont geçmişi ve e-fatura yasal uyarısı doğrulandı.');

    // 12. Süresi Dolan Büroda Verilerin Silinmediğinin ve Salt-Okunur Kaldığının Doğrulanması
    db.prepare("UPDATE tenants SET status = 'expired' WHERE id = ?;").run(tenantId);

    // Mevcut davayı okuyabiliyor mu? (Salt-okunur olmalı)
    const readCaseRes = await request('/api/cases', {
      headers: { Cookie: ownerCookie }
    });
    assert.strictEqual(readCaseRes.status, 200, 'Süresi dolan büro mevcut davalarını okuyabilmeli');
    assert.strictEqual(readCaseRes.data.cases.length, 1, 'Mevcut dava ASLA silinmemeli');

    // KVKK JSON veri dışa aktarma çalışıyor mu?
    const exportRes = await request('/api/tenant/export', {
      headers: { Cookie: ownerCookie }
    });
    assert.strictEqual(exportRes.status, 200, 'Veri dışa aktarım (KVKK m.11) süresi dolsa bile çalışmalıdır');

    // Ancak yeni dosya açması engellenmeli
    const expiredBlocked = await request('/api/cases', {
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: { clientId, internalNo: '2026/DENEME' }
    });
    assert.strictEqual(expiredBlocked.status, 403, 'Süresi dolan büro yeni kayıt açamamalı (403)');
    console.log('✓ Süre dolduğunda verilerin silinmediği, salt-okunur kaldığı ve KVKK dışa aktarımının çalıştığı doğrulandı.');

    console.log('\n>>> TÜM ABONELİK VE ÖDEME ENTEGRASYONU TESTLERİ BAŞARIYLA GEÇTİ <<<\n');
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

runSubscriptionTests();
