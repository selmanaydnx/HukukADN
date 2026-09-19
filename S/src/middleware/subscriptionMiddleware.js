const { getDb } = require('../database/db');

/**
 * Yalnızca Büro Sahibi ('owner') veya Finans ('finance') Yetkisi
 */
function requireBillingAuth(req, res, next) {
  const userRole = req.userRole || (req.tenant ? req.tenant.role : (req.session ? req.session.role : null));

  // Rol kontrolü: owner veya finance
  if (userRole !== 'owner' && userRole !== 'finance') {
    return res.status(403).json({
      error: 'Yetkisiz İşlem: Yalnızca hukuk bürosu kurucusu (owner) veya finans yetkilisi paket ve abonelik işlemlerini yönetebilir.'
    });
  }

  if (typeof next === 'function') {
    return next();
  }
}

/**
 * Sunucu Tarafı Kota ve Kaynak Limit Kontrolü
 * resourceType: 'cases' | 'members' | 'storage' | 'ai'
 */
function checkSubscriptionLimits(resourceType, extraData = {}) {
  return function (req, res, next) {
    const db = getDb();
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Çalışma alanı (tenant) doğrulanamadı.' });
    }

    // 1. Büro ve Plan Bilgilerini Çek
    const tenant = db.prepare(`
      SELECT t.*, COALESCE(t.plan_id, 'solo') as current_plan_id
      FROM tenants t 
      WHERE t.id = ?;
    `).get(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Büro kaydı bulunamadı.' });
    }

    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?;').get(tenant.current_plan_id);
    if (!plan) {
      return res.status(500).json({ error: 'Büronun geçerli bir abonelik planı bulunamadı.' });
    }

    // 2. Süre Dolumu Kontrolü (expired veya past_due ise yeni kayıt engellenir)
    if (tenant.status === 'expired') {
      return res.status(403).json({
        error: 'Abonelik süreniz sona ermiştir. Mevcut dava ve evraklarınıza erişebilir, verilerinizi dışa aktarabilirsiniz. Yeni kayıt eklemek için lütfen paketinizi yenileyiniz.'
      });
    }

    // 14 Günlük Deneme Süresi Kontrolü
    if (tenant.status === 'trialing' && tenant.trial_ends_at) {
      const trialEnd = new Date(tenant.trial_ends_at).getTime();
      if (Date.now() > trialEnd) {
        // Deneme bitmiş, durumu expired yap
        db.prepare("UPDATE tenants SET status = 'expired' WHERE id = ?;").run(tenantId);
        return res.status(403).json({
          error: '14 Günlük ücretsiz deneme süreniz dolmuştur. Verileriniz güvenle korunmaktadır. İşlemlerinize devam etmek için bir paket seçiniz.'
        });
      }
    }

    // 3. Kaynak Bazlı Limit Kontrolleri
    if (resourceType === 'cases') {
      if (plan.max_cases !== -1) {
        const activeCasesCount = db.prepare(`
          SELECT COUNT(*) as count FROM cases 
          WHERE tenant_id = ? AND status = 'active';
        `).get(tenantId).count;

        if (activeCasesCount >= plan.max_cases) {
          return res.status(403).json({
            error: `Paketinizin aktif dava/icra dosyası takip sınırına ulaştınız (${activeCasesCount} / ${plan.max_cases} dosya). Yeni dosya açabilmek için paketinizi yükseltebilir veya sonuçlanan dosyaları arşivleyebilirsiniz.`
          });
        }
      }
    }

    if (resourceType === 'members') {
      const currentMembersCount = db.prepare(`
        SELECT COUNT(*) as count FROM tenant_members 
        WHERE tenant_id = ?;
      `).get(tenantId).count;

      if (currentMembersCount >= plan.max_lawyers) {
        return res.status(403).json({
          error: `Paketinizin ekip üyesi kotasına ulaştınız (${currentMembersCount} / ${plan.max_lawyers} kullanıcı). Yeni bir avukat veya stajyer davet etmek için paketinizi yükseltiniz.`
        });
      }
    }

    if (resourceType === 'storage') {
      const newFileSize = Number(extraData.fileSize || req.body?.fileSize || 0);
      const usedBytes = db.prepare(`
        SELECT COALESCE(SUM(file_size), 0) as total_bytes 
        FROM documents 
        WHERE tenant_id = ?;
      `).get(tenantId).total_bytes;

      const maxBytes = plan.storage_gb * 1024 * 1024 * 1024;
      if (usedBytes + newFileSize > maxBytes) {
        const usedMb = (usedBytes / (1024 * 1024)).toFixed(1);
        return res.status(403).json({
          error: `Büronuzun belge depolama kapasitesi dolmuştur (${usedMb} MB / ${plan.storage_gb} GB). Mevcut evraklarınızı inceleyebilir ve indirebilirsiniz. Yeni evrak yüklemek için paketinizi yükseltiniz.`
        });
      }
    }

    if (resourceType === 'ai') {
      const monthlyAiCount = db.prepare(`
        SELECT COUNT(*) as count FROM audit_logs 
        WHERE tenant_id = ? AND action = 'ai_query' AND created_at >= datetime('now', 'start of month');
      `).get(tenantId).count;

      if (monthlyAiCount >= plan.ai_queries_monthly) {
        return res.status(403).json({
          error: `Bu aya ait TBB uyumlu yapay zekâ analiz kotanız dolmuştur (${monthlyAiCount} / ${plan.ai_queries_monthly} sorgu). Kotanız gelecek ay başında sıfırlanacaktır veya hemen paket yükseltebilirsiniz.`
        });
      }
    }

    if (typeof next === 'function') {
      return next();
    }
  };
}

module.exports = {
  requireBillingAuth,
  checkSubscriptionLimits
};
