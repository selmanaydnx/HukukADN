const crypto = require('node:crypto');
const { getDb } = require('../database/db');
const { logAudit } = require('../utils/audit');

// Çevresel Değişkenler & Yapılandırma
const IYZICO_API_KEY = process.env.IYZICO_API_KEY || '';
const IYZICO_SECRET_KEY = process.env.IYZICO_SECRET_KEY || '';
const IYZICO_BASE_URL = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';

const PAYTR_MERCHANT_ID = process.env.PAYTR_MERCHANT_ID || '';
const PAYTR_MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY || '';
const PAYTR_MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT || '';

/**
 * Sağlayıcı Entegrasyon Durumu Kontrolü
 */
function getProviderStatus() {
  const isIyzicoConfigured = Boolean(IYZICO_API_KEY && IYZICO_SECRET_KEY);
  const isPaytrConfigured = Boolean(PAYTR_MERCHANT_ID && PAYTR_MERCHANT_KEY && PAYTR_MERCHANT_SALT);

  return {
    provider: isIyzicoConfigured ? 'iyzico' : (isPaytrConfigured ? 'paytr' : 'mock_sandbox'),
    isLive: false, // Daima test/sandbox güvencesi
    isConfigured: isIyzicoConfigured || isPaytrConfigured,
    setupStatus: (isIyzicoConfigured || isPaytrConfigured) ? 'READY_SANDBOX' : 'SETUP_PENDING',
    message: (isIyzicoConfigured || isPaytrConfigured)
      ? 'Ödeme altyapısı Sandbox test modunda hazırdır.'
      : 'Kurulum Bekliyor: Canlı/Sandbox sağlayıcı API anahtarları henüz tanımlanmamıştır. Sistem güvenli test modunda çalışmaktadır.'
  };
}

/**
 * Güvenli Checkout Başlatma
 * İstemciden gelen tutara ASLA güvenilmez; plan tablosundan sunucu tarafında hesaplanır.
 */
function initializeCheckout({ tenantId, planId, billingCycle = 'monthly', userEmail, userIp }) {
  const db = getDb();
  const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1;').get(planId);
  if (!plan) {
    throw new Error('Geçersiz veya aktif olmayan abonelik paketi seçildi.');
  }

  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?;').get(tenantId);
  if (!tenant) {
    throw new Error('Hukuk bürosu bulunamadı.');
  }

  const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const amount = cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  const taxAmount = Number((amount * 0.20).toFixed(2)); // %20 KDV
  const totalAmount = Number((amount + taxAmount).toFixed(2));

  const merchantOid = `ADN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const idempotencyKey = crypto.randomUUID();
  const receiptNumber = `RCP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // İşlemi 'pending' (ödeme bekliyor) olarak veritabanına kaydet
  db.prepare(`
    INSERT INTO payment_transactions 
    (id, tenant_id, provider, merchant_oid, amount, currency, status, payment_type, plan_id, billing_cycle, idempotency_key, receipt_number, created_at)
    VALUES (?, ?, ?, ?, ?, 'TRY', 'pending', 'subscription_new', ?, ?, ?, ?, datetime('now'));
  `).run(
    crypto.randomUUID(),
    tenantId,
    'iyzico_sandbox',
    merchantOid,
    totalAmount,
    planId,
    cycle,
    idempotencyKey,
    receiptNumber
  );

  const providerStatus = getProviderStatus();

  // Test modu veya sağlayıcı arayüz token'ı
  const checkoutToken = crypto.createHmac('sha256', IYZICO_SECRET_KEY || 'adn_sandbox_secret')
    .update(`${merchantOid}:${totalAmount}:${tenantId}`)
    .digest('hex');

  return {
    merchantOid,
    amount,
    taxAmount,
    totalAmount,
    currency: 'TRY',
    planName: plan.name,
    billingCycle: cycle,
    receiptNumber,
    provider: providerStatus.provider,
    setupStatus: providerStatus.setupStatus,
    checkoutUrl: `/billing/payment-gateway?token=${checkoutToken}&oid=${merchantOid}`,
    token: checkoutToken
  };
}

/**
 * iyzico İmzalı Webhook / Callback Doğrulama ve İşleme
 */
function handleIyzicoWebhook(payload, signatureHeader) {
  const db = getDb();
  const { merchantOid, status, paymentId, idempotencyKey } = payload;

  if (!merchantOid) {
    return { success: false, error: 'Eksik sipariş numarası.' };
  }

  // İşlem kaydını bul
  const transaction = db.prepare('SELECT * FROM payment_transactions WHERE merchant_oid = ?;').get(merchantOid);
  if (!transaction) {
    return { success: false, error: 'Sipariş işlemi sistemde bulunamadı.' };
  }

  // İdempotency Kontrolü: Bu işlem zaten tamamlanmış mı?
  if (transaction.status === 'success') {
    return { success: true, message: 'Bu ödeme bildirimi daha önce işlenmiştir (İdempotent koruma).' };
  }

  // İmza Doğrulama (HMAC-SHA256)
  if (IYZICO_SECRET_KEY && signatureHeader) {
    const expectedSig = crypto.createHmac('sha256', IYZICO_SECRET_KEY)
      .update(JSON.stringify(payload))
      .digest('hex');
    if (signatureHeader !== expectedSig) {
      return { success: false, error: 'Geçersiz webhook HMAC imzası.' };
    }
  }

  if (status === 'SUCCESS' || status === 'success') {
    // 1. Ödeme işlemini güncelle
    db.prepare(`
      UPDATE payment_transactions 
      SET status = 'success', verified_at = datetime('now'), raw_payload = ?
      WHERE id = ?;
    `).run(JSON.stringify(payload), transaction.id);

    // 2. Büronun aboneliğini aktifleştir
    const isYearly = transaction.billing_cycle === 'yearly';
    const periodInterval = isYearly ? '+1 year' : '+1 month';

    db.prepare(`
      UPDATE tenants 
      SET 
        status = 'active',
        plan_id = ?,
        billing_cycle = ?,
        current_period_starts_at = datetime('now'),
        current_period_ends_at = datetime('now', ?),
        cancel_at_period_end = 0,
        subscription_expires_at = datetime('now', ?)
      WHERE id = ?;
    `).run(
      transaction.plan_id,
      transaction.billing_cycle,
      periodInterval,
      periodInterval,
      transaction.tenant_id
    );

    // 3. Sürüm / Denetim geçmişi ekle
    db.prepare(`
      INSERT INTO subscription_history (id, tenant_id, to_plan_id, billing_cycle, action, effective_date, notes)
      VALUES (?, ?, ?, ?, 'upgraded', datetime('now'), ?);
    `).run(
      crypto.randomUUID(),
      transaction.tenant_id,
      transaction.plan_id,
      transaction.billing_cycle,
      `Ödeme başarıyla doğrulandı. Sipariş: ${merchantOid}, Tutar: ${transaction.amount} TL`
    );

    logAudit({
      tenantId: transaction.tenant_id,
      action: 'subscription_payment',
      entityType: 'billing',
      entityId: transaction.id,
      details: `Abonelik ödemesi doğrulandı: ${transaction.plan_id} (${transaction.billing_cycle}) - ${transaction.amount} TL`,
      ipAddress: 'iyzico-webhook'
    });

    return { success: true, message: 'Abonelik başarıyla aktifleştirildi.' };
  } else {
    // Başarısız veya iptal ödeme
    const newStatus = status === 'CANCELLED' ? 'cancelled' : 'failure';
    db.prepare(`
      UPDATE payment_transactions 
      SET status = ?, raw_payload = ?
      WHERE id = ?;
    `).run(newStatus, JSON.stringify(payload), transaction.id);

    return { success: false, status: newStatus, error: 'Ödeme sağlayıcısı işlemi onaylamadı.' };
  }
}

/**
 * PayTR İmzalı Webhook Doğrulama
 */
function handlePaytrWebhook(postParams) {
  const { merchant_oid, status, total_amount, hash } = postParams;
  const db = getDb();

  if (PAYTR_MERCHANT_KEY && PAYTR_MERCHANT_SALT) {
    const expectedHash = crypto.createHmac('sha256', PAYTR_MERCHANT_KEY)
      .update(`${merchant_oid}${PAYTR_MERCHANT_SALT}${status}${total_amount}`)
      .digest('base64');

    if (hash !== expectedHash) {
      return { success: false, error: 'PAYTR hash doğrulanamadı.' };
    }
  }

  return handleIyzicoWebhook({
    merchantOid: merchant_oid,
    status: status === 'success' ? 'SUCCESS' : 'FAILURE',
    raw: postParams
  });
}

module.exports = {
  getProviderStatus,
  initializeCheckout,
  handleIyzicoWebhook,
  handlePaytrWebhook
};
