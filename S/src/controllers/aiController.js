const { getDb } = require('../database/db');
const { logAudit } = require('../utils/audit');

/**
 * TBB Avukatlıkta Yapay Zekâ İlkeleri Uyumlu AI Motoru:
 * - Mesleki sır & KVKK koruması
 * - İnsan denetimi (Human in the loop)
 * - Kaynak gösterme zorunluluğu
 * - Uydurma bilgi (hallucination) yasağı
 */

function processAIRequest(req, res) {
  const { caseId, promptType, customQuery } = req.body;

  if (!caseId || !promptType) {
    return res.status(400).json({ error: 'Dosya seçimi ve işlem türü zorunludur.' });
  }

  const db = getDb();
  // Fetch case and authorized documents
  const caseItem = db.prepare(`
    SELECT c.*, cl.name AS client_name, cl.identity_no AS client_id_no
    FROM cases c
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = ? AND c.tenant_id = ?
  `).get(caseId, req.tenantId);

  if (!caseItem) {
    return res.status(404).json({ error: 'Dosya bulunamadı veya erişim yetkiniz yok.' });
  }

  const docs = db.prepare(`
    SELECT id, title, file_name, file_size
    FROM documents
    WHERE case_id = ? AND tenant_id = ? AND is_quarantined = 0
  `).all(caseId, req.tenantId);

  // Check if tenant has allowed external AI
  const isExternalAllowed = Boolean(req.tenant.aiExternalAllowed);

  let outputText = '';
  let citations = [];
  let disclaimer = 'Taslak — avukat kontrolü gerekli. Hukuki ve mesleki sorumluluk avukata aittir.';

  // Build grounded response based on actual case context
  if (promptType === 'summarize') {
    if (docs.length === 0) {
      outputText = `DOSYA ÖZETİ:\n` +
        `• Büro Dosya No: ${caseItem.internal_no} (Mahkeme: ${caseItem.court_name || 'Belirtilmedi'} - ${caseItem.official_no || 'Esas No Yok'})\n` +
        `• Müvekkil: ${caseItem.client_name}\n` +
        `• Karşı Taraf: ${caseItem.opponent_name || 'Belirtilmedi'}\n` +
        `• Dava Türü: ${caseItem.case_type.toUpperCase()} (Aşama: ${caseItem.stage})\n` +
        `• Talep Değeri: ${caseItem.claim_amount ? caseItem.claim_amount.toLocaleString('tr-TR') + ' TL' : 'Belirtilmedi'}\n` +
        `• Belge Durumu: Dosyada henüz yüklenmiş evrak bulunmamaktadır. Tensip zaptı veya dava dilekçesi yüklenmesi önerilir.`;
      citations.push({ source: 'Dosya Kayıt Kartı', detail: `${caseItem.internal_no} esas verisi` });
    } else {
      outputText = `DOSYA ÖZETİ:\n` +
        `• Büro Dosya No: ${caseItem.internal_no} (Mahkeme: ${caseItem.court_name || 'Belirtilmedi'} - ${caseItem.official_no || 'Esas No Yok'})\n` +
        `• Müvekkil: ${caseItem.client_name}\n` +
        `• Karşı Taraf: ${caseItem.opponent_name || 'Belirtilmedi'}\n` +
        `• Dava Türü: ${caseItem.case_type.toUpperCase()} (Aşama: ${caseItem.stage})\n` +
        `• Dosyada ${docs.length} adet doğrulanmış belge incelendi: ${docs.map(d => d.title).join(', ')}.`;

      docs.forEach((d, idx) => {
        citations.push({
          source: d.file_name,
          title: d.title,
          detail: `Belge Kaydı #${idx + 1}`
        });
      });
    }
  } else if (promptType === 'chronology') {
    const events = db.prepare(`SELECT * FROM events WHERE case_id = ? AND tenant_id = ? ORDER BY event_date ASC`).all(caseId, req.tenantId);

    if (events.length === 0) {
      outputText = `Bu dosyada kayıtlı duruşma, tebligat veya işlem tarihi bulunamadı.`;
      citations.push({ source: 'Veritabanı', detail: 'Kayıt bulunamadı' });
    } else {
      outputText = `OLAY VE YARGILAMA KRONOLOJİSİ:\n` +
        events.map((e, i) => `${i + 1}. [${e.event_date}] ${e.title} (${e.event_type}) - Kaynak: ${e.source}`).join('\n');

      events.forEach(e => {
        citations.push({
          source: `Etkinlik #${e.id}`,
          title: e.title,
          detail: `Tarih: ${e.event_date}`
        });
      });
    }
  } else if (promptType === 'missing_docs') {
    outputText = `EKSİK BELGE VE BİLGİ İNCELEMESİ:\n` +
      `1. Müvekkil vekâletnamesi ve baro yetki belgesi kontrol edilmelidir.\n` +
      `2. Karşı tarafa yapılan tebligat mazbatası dosyaya celbedilmelidir.\n` +
      `3. Delil avansı ve gider avansı makbuzları teyit edilmelidir.`;
    citations.push({ source: 'HMK m. 119, m. 120 Usul Standartları', detail: 'Dava şartları ve ilk itiraz kontrol listesi' });
  } else if (promptType === 'qa') {
    if (!customQuery || customQuery.trim().length === 0) {
      return res.status(400).json({ error: 'Lütfen dosyaya ilişkin bir soru giriniz.' });
    }

    const q = customQuery.toLowerCase();
    if (q.includes('müvekkil')) {
      outputText = `Dosya Müvekkili: ${caseItem.client_name}. (Dava Türü: ${caseItem.case_type})`;
      citations.push({ source: 'Dosya Kayıt Kartı', detail: `Müvekkil: ${caseItem.client_name}` });
    } else if (q.includes('mahkeme') || q.includes('esas')) {
      outputText = `Mahkeme: ${caseItem.court_name || 'Belirtilmedi'} - Esas No: ${caseItem.official_no || 'Belirtilmedi'}`;
      citations.push({ source: 'Tevzi / Dava Bilgileri', detail: caseItem.internal_no });
    } else if (q.includes('alacak') || q.includes('tutar') || q.includes('değer')) {
      outputText = `Dava / Talep Değeri: ${caseItem.claim_amount ? caseItem.claim_amount.toLocaleString('tr-TR') + ' TL' : 'Belirtilmedi'}`;
      citations.push({ source: 'Harca Esas Değer Kaydı', detail: `${caseItem.claim_amount} TL` });
    } else {
      outputText = `Sorduğunuz soruya ilişkin bilgi dosyadaki belgelerde ve kayıtlarda bulunamadı.\n(TBB Rehberi uyarınca sistem doğrulanmamış bilgi veya varsayımsal içtihat üretmemektedir.)`;
      citations.push({ source: 'Dosya İncelemesi', detail: 'Dosyada bulunamadı' });
    }
  }

  logAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'ai_query',
    entityType: 'ai',
    entityId: caseId,
    details: `AI Sorgusu icra edildi: ${promptType}`,
    ipAddress: req.socket.remoteAddress || ''
  });

  return res.json({
    promptType,
    outputText,
    citations,
    disclaimer,
    externalAITransfer: isExternalAllowed ? 'Açık (Büro Yetkilisi Onaylı)' : 'Kapalı (Veriler Yalnızca Yerel Olarak İşlenmektedir)',
    humanReviewRequired: true
  });
}

module.exports = {
  processAIRequest
};
