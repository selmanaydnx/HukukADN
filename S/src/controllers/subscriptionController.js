const { getDb } = require('../database/db');
const { logAudit } = require('../utils/audit');
const paymentService = require('../services/paymentService');

/**
 * Açık Fiyat ve Paket Listesi (GET /api/billing/plans)
 */
function listPlans(req, res) {
  const db = getDb();
  try {
    const plans = db.prepare(`
      SELECT * FROM subscription_plans 
      WHERE is_active = 1 
      ORDER BY sort_order ASC;
    `).all();

    const formattedPlans = plans.map(p => {
      let features = [];
      try {
        features = typeof p.features === 'string' ? JSON.parse(p.features) : p.features;
      } catch (e) {
        features = [];
      }

      // Yıllık pakette aylık eşdeğer ve tasarruf oranı
      const monthlyEquivalent = Math.round(p.price_yearly / 12);
      const yearlySavings = (p.price_monthly * 12) - p.price_yearly;

      return {
        id: p.id,
        name: p.name,
        badge: p.badge,
        price_monthly: p.price_monthly,
        price_yearly: p.price_yearly,
        monthly_equivalent: monthlyEquivalent,
        yearly_savings: yearlySavings > 0 ? yearlySavings : 0,
        currency: 'TRY',
        currency_symbol: '₺',
        tax_note: '+ %20 KDV',
        max_lawyers: p.max_lawyers,
        max_cases: p.max_cases,
        storage_gb: p.storage_gb,
        ai_queries_monthly: p.ai_queries_monthly,
        features,
        is_demo_pricing: Boolean(p.is_demo_pricing),
        plan_version: p.plan_version
      };
    });

    return res.json({
      plans: formattedPlans,
      pricing_notice: 'Tüm fiyatlandırma ve paket limitleri Türkiye Barolar Birliği ve KVKK veri standartlarına tam uyumludur. Test ortamında demo fiyatlar listelenmektedir.',
      provider_status: paymentService.getProviderStatus()
    });
  } catch (err) {
    console.error('List Plans Error:', err);
    return res.status(500).json({ error: 'Paketler yüklenirken bir hata oluştu.' });
  }
}

/**
 * Büronun Mevcut Abonelik Durumu ve Canlı Kullanım Kotaları (GET /api/billing/my-subscription)
 */
function getMySubscription(req, res) {
  const db = getDb();
  const tenantId = req.tenantId;

  try {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?;').get(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Büro bulunamadı.' });
    }

    const planId = tenant.plan_id || 'solo';
    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?;').get(planId);

    // Canlı Kullanım Metrikleri Hesabı
    // 1. Ekip Üyeleri
    const memberCount = db.prepare('SELECT COUNT(*) as count FROM tenant_members WHERE tenant_id = ?;').get(tenantId).count;

    // 2. Aktif Davalar
    const activeCasesCount = db.prepare("SELECT COUNT(*) as count FROM cases WHERE tenant_id = ? AND status = 'active';").get(tenantId).count;

    // 3. Depolama (Bytes & MB & GB)
    const storageUsedBytes = db.prepare('SELECT COALESCE(SUM(file_size), 0) as total_bytes FROM documents WHERE tenant_id = ?;').get(tenantId).total_bytes;
    const storageUsedMb = Number((storageUsedBytes / (1024 * 1024)).toFixed(1));
    const storageLimitMb = (plan ? plan.storage_gb : 15) * 1024;
    const storagePercentage = Math.min(100, Math.round((storageUsedMb / storageLimitMb) * 100));

    // 4. Bu Ayki Başarılı AI Sorguları
    const aiQueriesUsed = db.prepare(`
      SELECT COUNT(*) as count FROM audit_logs 
      WHERE tenant_id = ? AND action = 'ai_query' AND created_at >= datetime('now', 'start of month');
    `).get(tenantId).count;

    // Kalan Gün Hesabı
    let daysLeft = null;
    let targetDate = null;

    if (tenant.status === 'trialing' && tenant.trial_ends_at) {
      targetDate = new Date(tenant.trial_ends_at);
      const diffMs = targetDate.getTime() - Date.now();
      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    } else if (tenant.current_period_ends_at) {
      targetDate = new Date(tenant.current_period_ends_at);
      const diffMs = targetDate.getTime() - Date.now();
      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return res.json({
      subscription: {
        status: tenant.status || 'trialing',
        plan_id: planId,
        plan_name: plan ? plan.name : 'Bireysel (Solo)',
        billing_cycle: tenant.billing_cycle || 'monthly',
        trial_ends_at: tenant.trial_ends_at,
        current_period_starts_at: tenant.current_period_starts_at,
        current_period_ends_at: tenant.current_period_ends_at,
        cancel_at_period_end: Boolean(tenant.cancel_at_period_end),
        has_used_trial: Boolean(tenant.has_used_trial),
        days_left: daysLeft
      },
      usage: {
        members: {
          current: memberCount,
          max: plan ? plan.max_lawyers : 1,
          percentage: plan ? Math.min(100, Math.round((memberCount / plan.max_lawyers) * 100)) : 100
        },
        cases: {
          current: activeCasesCount,
          max: plan ? plan.max_cases : 150,
          percentage: plan && plan.max_cases !== -1 ? Math.min(100, Math.round((activeCasesCount / plan.max_cases) * 100)) : 0
        },
        storage: {
          used_bytes: storageUsedBytes,
          used_mb: storageUsedMb,
          max_gb: plan ? plan.storage_gb : 15,
          max_mb: storageLimitMb,
          percentage: storagePercentage
        },
        ai: {
          used: aiQueriesUsed,
          max: plan ? plan.ai_queries_monthly : 150,
          percentage: plan ? Math.min(100, Math.round((aiQueriesUsed / plan.ai_queries_monthly) * 100)) : 0
        }
      },
      provider_status: paymentService.getProviderStatus()
    });
  } catch (err) {
    console.error('Get Subscription Error:', err);
    return res.status(500).json({ error: 'Abonelik durumu sorgulanırken hata oluştu.' });
  }
}

/**
 * 14 Günlük Kartsız Ücretsiz Deneme Başlatma (POST /api/billing/start-trial)
 */
function startTrial(req, res) {
  const db = getDb();
  const tenantId = req.tenantId;

  try {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?;').get(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Büro bulunamadı.' });
    }

    if (tenant.has_used_trial) {
      return res.status(400).json({
        error: 'Hukuk büronuz daha önce 14 günlük ücretsiz deneme süresini kullanmıştır.'
      });
    }

    // 14 günlük süreyi hesapla
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE tenants 
      SET 
        status = 'trialing',
        plan_id = 'pro', -- Denemede Pro büro özellikleri sunulur
        trial_ends_at = ?,
        has_used_trial = 1,
        cancel_at_period_end = 0
      WHERE id = ?;
    `).run(trialEndsAt, tenantId);

    db.prepare(`
      INSERT INTO subscription_history (id, tenant_id, to_plan_id, billing_cycle, action, effective_date, notes)
      VALUES (?, ?, 'pro', 'monthly', 'trial_started', datetime('now'), '14 Günlük kartsız ücretsiz deneme başlatıldı.');
    `).run(require('node:crypto').randomUUID(), tenantId);

    logAudit({
      tenantId,
      userId: req.user ? req.user.id : null,
      action: 'start_trial',
      entityType: 'billing',
      entityId: tenantId,
      details: '14 Günlük kartsız deneme süresi başlatıldı.',
      ipAddress: req.socket.remoteAddress || ''
    });

    return res.json({
      message: '14 Günlük ücretsiz deneme süreniz başarıyla başlatıldı (Kredi kartı gerekmez). Tüm Pro özellikleri aktiftir.',
      trial_ends_at: trialEndsAt
    });
  } catch (err) {
    console.error('Start Trial Error:', err);
    return res.status(500).json({ error: 'Deneme başlatılırken hata oluştu.' });
  }
}

/**
 * Güvenli Checkout Başlatma (POST /api/billing/checkout)
 */
function checkout(req, res) {
  const { planId, billingCycle } = req.body || {};
  if (!planId) {
    return res.status(400).json({ error: 'Satın alınacak paket kimliği (planId) zorunludur.' });
  }

  try {
    const result = paymentService.initializeCheckout({
      tenantId: req.tenantId,
      planId,
      billingCycle: billingCycle || 'monthly',
      userEmail: req.user ? req.user.email : '',
      userIp: req.socket.remoteAddress || ''
    });

    return res.json({
      message: 'Ödeme oturumu güvenle oluşturuldu.',
      checkout: result
    });
  } catch (err) {
    console.error('Checkout Error:', err);
    return res.status(400).json({ error: err.message });
  }
}

/**
 * Sağlayıcı Webhook Bildirimi (POST /api/billing/webhook/iyzico)
 */
function handleIyzicoWebhook(req, res) {
  const signature = req.headers['x-iyzi-signature'] || '';
  const result = paymentService.handleIyzicoWebhook(req.body, signature);

  if (!result.success) {
    return res.status(400).json({ error: result.error || 'Ödeme işlenemedi.' });
  }

  return res.json({ status: 'success', message: result.message });
}

/**
 * Dönem Sonunda İptal Talebi (POST /api/billing/cancel)
 */
function cancelSubscription(req, res) {
  const db = getDb();
  const tenantId = req.tenantId;

  try {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?;').get(tenantId);
    if (!tenant) return res.status(404).json({ error: 'Büro bulunamadı.' });

    db.prepare(`
      UPDATE tenants 
      SET cancel_at_period_end = 1 
      WHERE id = ?;
    `).run(tenantId);

    const endDate = tenant.current_period_ends_at || tenant.trial_ends_at || 'dönem sonu';

    db.prepare(`
      INSERT INTO subscription_history (id, tenant_id, to_plan_id, billing_cycle, action, effective_date, notes)
      VALUES (?, ?, ?, ?, 'cancelled', datetime('now'), ?);
    `).run(
      require('node:crypto').randomUUID(),
      tenantId,
      tenant.plan_id || 'solo',
      tenant.billing_cycle || 'monthly',
      `Abonelik iptal talebi alındı. Haklar ${endDate} tarihine kadar sürecektir.`
    );

    logAudit({
      tenantId,
      userId: req.user ? req.user.id : null,
      action: 'cancel_subscription',
      entityType: 'billing',
      entityId: tenantId,
      details: 'Abonelik dönem sonunda iptal edilmek üzere işaretlendi.',
      ipAddress: req.socket.remoteAddress || ''
    });

    return res.json({
      message: `Aboneliğiniz iptal edildi. Gelecek dönem herhangi bir tahsilat yapılmayacaktır. Mevcut paket haklarınız ${new Date(endDate).toLocaleDateString('tr-TR')} tarihine kadar kesintisiz devam edecektir.`
    });
  } catch (err) {
    console.error('Cancel Subscription Error:', err);
    return res.status(500).json({ error: 'Abonelik iptali sırasında hata oluştu.' });
  }
}

/**
 * Paket Değiştirme (Yükseltme / Düşürme) (POST /api/billing/change-plan)
 */
function changePlan(req, res) {
  const { newPlanId, billingCycle } = req.body || {};
  if (!newPlanId) return res.status(400).json({ error: 'Yeni paket seçilmelidir.' });

  const db = getDb();
  const tenantId = req.tenantId;

  try {
    const targetPlan = db.prepare('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1;').get(newPlanId);
    if (!targetPlan) return res.status(404).json({ error: 'Hedef paket bulunamadı.' });

    // Düşürme Limit Aşımı Kontrolü (Downgrade Safety)
    const currentMembers = db.prepare('SELECT COUNT(*) as count FROM tenant_members WHERE tenant_id = ?;').get(tenantId).count;
    if (currentMembers > targetPlan.max_lawyers) {
      return res.status(400).json({
        error: `Paket düşürme engeli: Seçtiğiniz "${targetPlan.name}" paketi en fazla ${targetPlan.max_lawyers} kullanıcıyı desteklemektedir. Mevcut büronuzda ${currentMembers} aktif üye bulunmaktadır. Lütfen önce üye sayınızı düzenleyiniz.`
      });
    }

    // Doğrudan yükseltme checkout başlatılabilir veya plan değiştirilir
    return checkout(req, res);
  } catch (err) {
    console.error('Change Plan Error:', err);
    return res.status(500).json({ error: 'Paket değiştirme işlemi sırasında hata oluştu.' });
  }
}

/**
 * Büro İşlem ve Dekont Geçmişi (GET /api/billing/transactions)
 */
function listTransactions(req, res) {
  const db = getDb();
  const tenantId = req.tenantId;

  try {
    const transactions = db.prepare(`
      SELECT 
        id, merchant_oid, amount, currency, status, payment_type, 
        plan_id, billing_cycle, receipt_number, created_at, verified_at
      FROM payment_transactions
      WHERE tenant_id = ?
      ORDER BY created_at DESC;
    `).all(tenantId);

    return res.json({
      transactions,
      legal_notice: 'İşlem kayıtları elektronik tahsilat dekontu niteliğindedir. Mali e-fatura için büro fatura bilgilerinizle mali müşaviriniz veya entegratör üzerinden işlem yapılmalıdır.'
    });
  } catch (err) {
    console.error('List Transactions Error:', err);
    return res.status(500).json({ error: 'İşlemler alınırken hata oluştu.' });
  }
}

module.exports = {
  listPlans,
  getMySubscription,
  startTrial,
  checkout,
  handleIyzicoWebhook,
  cancelSubscription,
  changePlan,
  listTransactions
};
