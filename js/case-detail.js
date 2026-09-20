// ADN - 02 Dosya Detayı Controller

const CaseDetailModule = {
  currentCaseId: null,
  activeTab: 'genel-bilgi',

  init() {
    this.loadActiveCase();
  },

  loadActiveCase() {
    const cases = DataStore.getCases();

    if (cases.length === 0) {
      this.currentCaseId = null;
      this.renderEmptyState();
      return;
    }

    const targetCase = cases.find(c => c.id === this.currentCaseId) || cases[0];
    this.currentCaseId = targetCase.id;
    this.renderCase(targetCase);
  },

  renderEmptyState() {
    const container = document.getElementById('view-case-detail');
    if (!container) return;

    container.innerHTML = `
      <div class="breadcrumb-nav">
        <a href="#" onclick="App.navigateTo('cases-list')">Dosyalar</a>
        <span class="breadcrumb-sep">›</span>
        <span>Dosya Detayı</span>
      </div>

      <div class="card" style="text-align: center; padding: 60px 24px; max-width: 680px; margin: 40px auto;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: #eff6ff; color: var(--brand-blue); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">Kayıtlı Dava Dosyası Bulunmuyor</h3>
        <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 24px;">
          Sisteme henüz bir dosya eklemediniz. Aşağıdaki butona tıklayarak ilk dava dosyanızı hemen oluşturabilirsiniz.
        </p>
        <button class="btn-primary" onclick="document.getElementById('newCaseModal').style.display = 'flex'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Yeni Dava Dosyası Aç
        </button>
      </div>
    `;
  },

  renderCase(caseData) {
    const container = document.getElementById('view-case-detail');
    if (!container) return;

    container.innerHTML = `
      <div class="breadcrumb-nav">
        <a href="#" onclick="App.navigateTo('cases-list')">Dosyalar</a>
        <span class="breadcrumb-sep">›</span>
        <span style="color: var(--text-main); font-weight: 600;">${caseData.title || (caseData.client + ' / ' + caseData.opponent)}</span>
      </div>

      <div class="case-header-card">
        <div class="case-title-area">
          <div class="case-title-row">
            <h2>${caseData.title || (caseData.client + ' / ' + caseData.opponent)}</h2>
            <span class="case-status-badge">
              <span class="status-dot-active"></span>
              ${caseData.status || 'Aktif'}
            </span>
          </div>
          <div class="case-meta-row">
            <span style="font-weight: 700; color: #1e293b;">${caseData.caseNo || 'Esas No Yok'}</span>
            <span>•</span>
            <span>${caseData.type || 'Hukuk Davası'}</span>
            <span>•</span>
            <span>${caseData.court || ''}</span>
          </div>
        </div>

        <div class="case-header-actions">
          <button class="btn-outline" onclick="CaseDetailModule.openWhatsAppForCase('${caseData.id}')">
            💬 Müvekkile WhatsApp Gönder
          </button>
          <button class="btn-primary" onclick="CaseDetailModule.goToAIDraft('${caseData.id}')">
            + Evrak Oluştur
          </button>
        </div>
      </div>

      <div class="case-tabs-nav">
        <button class="case-tab-btn ${this.activeTab === 'genel-bilgi' ? 'active' : ''}" onclick="CaseDetailModule.switchTab('genel-bilgi', this)">Genel Bilgi</button>
        <button class="case-tab-btn ${this.activeTab === 'surec' ? 'active' : ''}" onclick="CaseDetailModule.switchTab('surec', this)">Süreç & Celseler</button>
        <button class="case-tab-btn ${this.activeTab === 'evraklar' ? 'active' : ''}" onclick="CaseDetailModule.switchTab('evraklar', this)">Evraklar & Belgeler</button>
        <button class="case-tab-btn ${this.activeTab === 'notlar' ? 'active' : ''}" onclick="CaseDetailModule.switchTab('notlar', this)">Notlar</button>
      </div>

      <!-- Tab Content: Genel Bilgi -->
      <div id="caseTabContent-genel-bilgi" class="case-tab-pane" style="${this.activeTab === 'genel-bilgi' ? 'display: block;' : 'display: none;'}">
        <div class="case-content-grid">
          
          <div class="card" style="padding: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="font-size: 1.05rem; font-weight: 700;">Dosya Bilgileri</h3>
              <a class="link-all" onclick="CaseDetailModule.editCaseInfo('${caseData.id}')">Düzenle</a>
            </div>

            <div class="info-field-group">
              <div class="info-field-row">
                <span class="info-field-label">Mahkeme</span>
                <span class="info-field-value">${caseData.court || '-'}</span>
              </div>
              <div class="info-field-row">
                <span class="info-field-label">Esas No</span>
                <span class="info-field-value">${caseData.caseNo || '-'}</span>
              </div>
              <div class="info-field-row">
                <span class="info-field-label">Dava Türü</span>
                <span class="info-field-value">${caseData.type || '-'}</span>
              </div>
              <div class="info-field-row">
                <span class="info-field-label">Müvekkil</span>
                <span class="info-field-value">${caseData.client || '-'}</span>
              </div>
              <div class="info-field-row">
                <span class="info-field-label">Karşı Taraf</span>
                <span class="info-field-value">${caseData.opponent || '-'}</span>
              </div>
              <div class="info-field-row">
                <span class="info-field-label">Açılış Tarihi</span>
                <span class="info-field-value">${caseData.filingDate || new Date().toLocaleDateString('tr-TR')}</span>
              </div>
              <div class="info-field-row">
                <span class="info-field-label">Durum</span>
                <span class="info-field-value" style="color: #059669;">${caseData.status || 'Aktif'}</span>
              </div>
            </div>

            <div class="case-note-box" style="margin-top: 16px;">
              <strong style="color: #0f172a; display: block; margin-bottom: 2px;">Dahili Not:</strong>
              <span>${caseData.internalNote || 'Bu dosya için henüz not eklenmedi.'}</span>
            </div>
          </div>

          <div class="card" style="padding: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
              <h3 style="font-size: 1.05rem; font-weight: 700;">Dosya Süreci</h3>
              <a class="link-all" onclick="CaseDetailModule.addStage()">+ Aşama Ekle</a>
            </div>
            <div class="timeline-stepper">
              ${this.renderTimelineHTML(caseData)}
            </div>
          </div>

          <div class="card case-documents-col" style="padding: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <h3 style="font-size: 1.05rem; font-weight: 700;">Belgeler & Ekler</h3>
              <button class="btn-outline" style="font-size: 0.75rem; padding: 4px 8px;" onclick="CaseDetailModule.triggerDocUpload()">+ Belge Yükle</button>
            </div>
            <div class="doc-list">
              ${this.renderDocumentsHTML(caseData)}
            </div>
            <input type="file" id="caseDocFileInput" style="display: none;" onchange="CaseDetailModule.handleDocUploaded(this)">
          </div>

        </div>
      </div>

      <!-- Tab Content: Süreç -->
      <div id="caseTabContent-surec" class="case-tab-pane" style="${this.activeTab === 'surec' ? 'display: block;' : 'display: none;'}">
        <div class="card" style="padding: 24px; max-width: 800px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 800;">Dava Süreci & Celse Takibi</h3>
              <p style="font-size: 0.8rem; color: #64748b;">Davanın açılışından itibaren tüm aşama ve duruşma kayıtları.</p>
            </div>
            <button class="btn-primary" onclick="CaseDetailModule.addStage()">+ Yeni Celse / Aşama Ekle</button>
          </div>
          <div class="timeline-stepper">
            ${this.renderTimelineHTML(caseData)}
          </div>
        </div>
      </div>

      <!-- Tab Content: Evraklar -->
      <div id="caseTabContent-evraklar" class="case-tab-pane" style="${this.activeTab === 'evraklar' ? 'display: block;' : 'display: none;'}">
        <div class="card" style="padding: 24px; max-width: 800px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 800;">Dosya Evrak Arşivi</h3>
              <p style="font-size: 0.8rem; color: #64748b;">Dilekçeler, tensip zaptı, tebligatlar ve bilirkişi raporları.</p>
            </div>
            <button class="btn-primary" onclick="CaseDetailModule.triggerDocUpload()">+ Dosyaya Belge Ekle</button>
          </div>
          <div class="doc-list">
            ${this.renderDocumentsHTML(caseData)}
          </div>
        </div>
      </div>

      <!-- Tab Content: Notlar -->
      <div id="caseTabContent-notlar" class="case-tab-pane" style="${this.activeTab === 'notlar' ? 'display: block;' : 'display: none;'}">
        <div class="card" style="padding: 24px; max-width: 800px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 800;">Ofis İçi Notlar & Hatırlatıcılar</h3>
              <p style="font-size: 0.8rem; color: #64748b;">Müvekkil görüşme notları ve strateji kayıtları.</p>
            </div>
            <button class="btn-primary" onclick="CaseDetailModule.addNote()">+ Yeni Not Ekle</button>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; font-size: 0.88rem; line-height: 1.5;">
            ${caseData.internalNote || 'Henüz not eklenmedi.'}
          </div>
        </div>
      </div>
    `;
  },

  renderTimelineHTML(caseData) {
    if (!caseData.timeline || caseData.timeline.length === 0) {
      return `
        <div style="text-align: center; padding: 24px; color: #94a3b8; font-size: 0.82rem;">
          Henüz süreç aşaması eklenmedi.<br>
          <button class="btn-outline" style="margin-top: 8px; font-size: 0.75rem;" onclick="CaseDetailModule.addStage()">+ İlk Aşamayı Ekle</button>
        </div>
      `;
    }

    return caseData.timeline.map(step => `
      <div class="timeline-step ${step.status || 'completed'}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header-row">
            <span class="timeline-date">${step.date}</span>
            <span class="timeline-title">${step.title}</span>
          </div>
          <p class="timeline-desc">${step.description || ''}</p>
        </div>
      </div>
    `).join('');
  },

  renderDocumentsHTML(caseData) {
    if (!caseData.documents || caseData.documents.length === 0) {
      return `
        <div style="text-align: center; padding: 24px; color: #94a3b8; font-size: 0.82rem;">
          Bu dosyada henüz kayıtlı belge yok.<br>
          <button class="btn-outline" style="margin-top: 8px; font-size: 0.75rem;" onclick="CaseDetailModule.triggerDocUpload()">+ Bilgisayardan Belge Seç</button>
        </div>
      `;
    }

    return caseData.documents.map(doc => `
      <div class="doc-item" onclick="App.showToast('${doc.name} belgesi görüntülendi.')">
        <div class="doc-left">
          <div class="doc-icon-badge ${doc.type === 'docx' ? 'icon-word' : 'icon-pdf'}">
            ${doc.type === 'docx' ? 'W' : 'PDF'}
          </div>
          <div class="doc-info-text">
            <span class="doc-title">${doc.name}</span>
            <span class="doc-meta">${doc.date} • ${doc.size || 'Belge'}</span>
          </div>
        </div>
        <button class="doc-action-btn" title="İndir" onclick="event.stopPropagation(); App.showToast('${doc.name} indirildi.')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
    `).join('');
  },

  triggerDocUpload() {
    const fileInput = document.getElementById('caseDocFileInput');
    if (fileInput) fileInput.click();
  },

  handleDocUploaded(input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const c = DataStore.getCases().find(item => item.id === this.currentCaseId);
      if (c) {
        if (!c.documents) c.documents = [];
        const isDocx = file.name.endsWith('.docx') || file.name.endsWith('.doc');
        const sizeStr = (file.size / 1024).toFixed(0) + ' KB';

        c.documents.push({
          id: 'doc-' + Date.now(),
          name: file.name,
          type: isDocx ? 'docx' : 'pdf',
          size: sizeStr,
          date: new Date().toLocaleDateString('tr-TR')
        });

        DataStore.save();
        this.renderCase(c);
        App.showToast(`'${file.name}' dosyaya başarıyla eklendi!`);
      }
    }
  },

  selectCase(caseId) {
    this.currentCaseId = caseId;
    const c = DataStore.getCases().find(item => item.id === caseId);
    if (c) {
      this.renderCase(c);
      App.navigateTo('case-detail');
    }
  },

  addStage() {
    const title = prompt('Yeni süreç aşaması başlığı (Örn: Dava Dilekçesi Sunuldu, Ön İnceleme Celsesi, Bilirkişi Raporu Tebliği):');
    if (!title || !title.trim()) return;

    const desc = prompt('Açıklama / Celse kararı:') || '';
    const c = DataStore.getCases().find(item => item.id === this.currentCaseId);
    if (c) {
      if (!c.timeline) c.timeline = [];
      c.timeline.push({
        id: 'tl-' + Date.now(),
        date: new Date().toLocaleDateString('tr-TR'),
        title: title.trim(),
        description: desc,
        status: 'completed'
      });
      DataStore.save();
      this.renderCase(c);
      App.showToast('Yeni aşama başarıyla kaydedildi.');
    }
  },

  addNote() {
    const note = prompt('Yeni ofis notu giriniz:');
    if (!note || !note.trim()) return;

    const c = DataStore.getCases().find(item => item.id === this.currentCaseId);
    if (c) {
      const dateStr = new Date().toLocaleDateString('tr-TR');
      c.internalNote = `${note.trim()} (${dateStr}) \n` + (c.internalNote || '');
      DataStore.save();
      this.renderCase(c);
      App.showToast('Not kaydedildi.');
    }
  },

  editCaseInfo(caseId) {
    const c = DataStore.getCases().find(item => item.id === caseId);
    if (!c) return;

    const newCourt = prompt('Mahkeme:', c.court || '') || c.court;
    const newCaseNo = prompt('Esas No:', c.caseNo || '') || c.caseNo;
    const newOpp = prompt('Karşı Taraf:', c.opponent || '') || c.opponent;

    c.court = newCourt;
    c.caseNo = newCaseNo;
    c.opponent = newOpp;
    c.title = `${c.client} / ${c.opponent}`;

    DataStore.save();
    this.renderCase(c);
    App.showToast('Dosya bilgileri güncellendi.');
  },

  openWhatsAppForCase(caseId) {
    const c = DataStore.getCases().find(item => item.id === caseId);
    if (!c) return;

    CRMModule.selectedClient = {
      name: c.client,
      phone: ''
    };

    CRMModule.openWhatsAppModal(c.client);
  },

  goToAIDraft(caseId) {
    const c = DataStore.getCases().find(item => item.id === caseId);
    if (c) {
      App.navigateTo('ai-assistant');
      const clientInput = document.getElementById('aiClientName');
      const oppInput = document.getElementById('aiOpponentName');
      const courtInput = document.getElementById('aiCourtName');
      const caseNoInput = document.getElementById('aiCaseNo');

      if (clientInput) clientInput.value = c.client || '';
      if (oppInput) oppInput.value = c.opponent || '';
      if (courtInput) courtInput.value = c.court || '';
      if (caseNoInput) caseNoInput.value = c.caseNo || '';

      App.showToast(`${c.title || c.client} bilgileri dilekçe formuna aktarıldı.`);
    }
  },

  switchTab(tabName, btn) {
    this.activeTab = tabName;
    document.querySelectorAll('.case-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    document.querySelectorAll('.case-tab-pane').forEach(pane => {
      pane.style.display = 'none';
    });

    const targetPane = document.getElementById(`caseTabContent-${tabName}`);
    if (targetPane) targetPane.style.display = 'block';
  }
};
