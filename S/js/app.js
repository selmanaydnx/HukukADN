// ADN - Core Application Controller

const App = {
  currentView: 'dashboard',

  init() {
    this.setupNavigation();
    this.setupSearch();
    this.setupNotifications();
    this.setupModals();
    this.setupKeyboardShortcuts();
    this.setupProfileEditor();

    // Initialize all modules
    DashboardModule.init();
    CaseDetailModule.init();
    AIAssistantModule.init();
    CalendarModule.init();
    CRMModule.init();
    FinanceModule.init();
    LegalCalculator.init();

    // Render cases table
    this.renderCasesListTable();

    // Set initial view
    this.navigateTo('dashboard');
  },

  navigateTo(viewId) {
    this.currentView = viewId;

    document.querySelectorAll('.view-section').forEach(section => {
      section.classList.remove('active-view');
    });

    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
      targetSection.classList.add('active-view');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Refresh views on demand
    if (viewId === 'case-detail') {
      CaseDetailModule.loadActiveCase();
    } else if (viewId === 'cases-list') {
      this.renderCasesListTable();
    } else if (viewId === 'dashboard') {
      DashboardModule.updateStats();
      DashboardModule.renderSchedule();
      DashboardModule.renderTasks();
      DashboardModule.renderUrgentAlert();
    } else if (viewId === 'clients') {
      CRMModule.renderClientsList();
    } else if (viewId === 'finance') {
      FinanceModule.renderFinanceOverview();
      FinanceModule.renderExpensesTable();
      FinanceModule.renderReceiptsTable();
    } else if (viewId === 'tools') {
      LegalCalculator.init();
    } else if (viewId === 'calendar') {
      CalendarModule.renderCalendarView();
      CalendarModule.renderDeadlines();
    }

    // Update sidebar nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.view === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update module pills active state
    document.querySelectorAll('.module-pill').forEach(pill => {
      if (pill.dataset.view === viewId) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo(item.dataset.view);
      });
    });

    document.querySelectorAll('.module-pill[data-view]').forEach(pill => {
      pill.addEventListener('click', () => {
        this.navigateTo(pill.dataset.view);
      });
    });
  },

  setupProfileEditor() {
    const profileEl = document.querySelector('.user-profile');
    if (!profileEl) return;

    const lawyer = DataStore.data.currentLawyer || {};
    const nameEl = document.getElementById('topbarLawyerName');
    const firmEl = document.getElementById('topbarLawyerFirm');
    const welcomeEl = document.getElementById('welcomeLawyerName');

    if (nameEl && lawyer.name) nameEl.textContent = lawyer.name;
    if (firmEl && lawyer.firm) firmEl.textContent = lawyer.firm;
    if (welcomeEl && lawyer.name) welcomeEl.textContent = `Hoş Geldiniz, ${lawyer.name}`;

    profileEl.addEventListener('click', () => {
      const newName = prompt('Avukat Adı ve Soyadı:', lawyer.name || 'Av. ');
      if (newName && newName.trim()) {
        const newFirm = prompt('Büro / Ofis Adı:', lawyer.firm || 'Hukuk Bürosu') || 'Hukuk Bürosu';
        DataStore.data.currentLawyer.name = newName.trim();
        DataStore.data.currentLawyer.firm = newFirm.trim();
        DataStore.save();

        if (nameEl) nameEl.textContent = newName.trim();
        if (firmEl) firmEl.textContent = newFirm.trim();
        if (welcomeEl) welcomeEl.textContent = `Hoş Geldiniz, ${newName.trim()}`;
        this.showToast('Profil bilgileriniz güncellendi.');
      }
    });
  },

  renderCasesListTable() {
    const tbody = document.getElementById('allCasesTableBody');
    if (!tbody) return;

    const cases = DataStore.getCases();

    if (cases.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 48px 16px; color: #94a3b8; font-size: 0.85rem;">
            <p style="font-weight: 600; color: #64748b; margin-bottom: 6px;">Henüz kayıtlı bir dava dosyası bulunmuyor.</p>
            <p style="font-size: 0.78rem; margin-bottom: 14px;">Müvekkilleriniz ve dosyalarınız için ilk kaydı oluşturun.</p>
            <button class="btn-primary" onclick="document.getElementById('newCaseModal').style.display = 'flex'">
              + Yeni Dava Kaydı
            </button>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = cases.map(c => `
      <tr style="border-bottom: 1px solid var(--border-light); cursor: pointer;" onclick="CaseDetailModule.selectCase('${c.id}')">
        <td style="padding: 14px; font-weight: 700; color: var(--brand-blue);">${c.caseNo || '-'}</td>
        <td style="padding: 14px; font-weight: 600;">${c.client || ''} / ${c.opponent || ''}</td>
        <td style="padding: 14px; color: var(--text-muted);">${c.court || '-'}</td>
        <td style="padding: 14px;">${c.type || 'Hukuk Davası'}</td>
        <td style="padding: 14px;"><span class="badge-tag badge-green">${c.status || 'Aktif'}</span></td>
        <td style="padding: 14px; color: #2563eb; font-weight: 600;">${c.nextDate || 'İşlem Belirlenmedi'}</td>
        <td style="padding: 14px; text-align: right;">
          <button class="btn-outline" style="padding: 4px 10px; font-size: 0.75rem;">Detay Gör</button>
        </td>
      </tr>
    `).join('');
  },

  setupSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (q.length > 1) {
        const found = DataStore.getCases().find(c => 
          (c.client && c.client.toLowerCase().includes(q)) ||
          (c.opponent && c.opponent.toLowerCase().includes(q)) ||
          (c.caseNo && c.caseNo.toLowerCase().includes(q))
        );

        if (found) {
          this.showToast(`Eşleşen dosya bulundu: ${found.client} (${found.caseNo || ''})`);
        }
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.toLowerCase().trim();
        if (q.includes('dilekçe') || q.includes('evrak')) {
          this.navigateTo('ai-assistant');
        } else if (q.includes('takvim') || q.includes('duruşma')) {
          this.navigateTo('calendar');
        } else if (q.includes('hesap') || q.includes('smm')) {
          this.navigateTo('tools');
        } else if (q.includes('müvekkil')) {
          this.navigateTo('clients');
        } else if (q.includes('finans') || q.includes('kasa') || q.includes('masraf')) {
          this.navigateTo('finance');
        } else {
          this.navigateTo('cases-list');
        }
      }
    });
  },

  setupNotifications() {
    const notifBtn = document.getElementById('topbarNotificationBtn');
    if (!notifBtn) return;

    notifBtn.addEventListener('click', () => {
      const deadlines = DataStore.getDeadlines();
      if (deadlines.length > 0) {
        this.showToast(`🔔 ${deadlines.length} adet takip edilen yasal süreniz var.`);
      } else {
        this.showToast('Yeni bildiriminiz bulunmuyor.');
      }
    });
  },

  openAddScheduleModal() {
    const time = prompt('Duruşma / Etkinlik saati (Örn: 10:30):', '10:30');
    if (!time) return;

    const title = prompt('Etkinlik konusu (Örn: Duruşma, Keşif, Müvekkil Görüşmesi):', 'Duruşma') || 'Duruşma';
    const court = prompt('Mahkeme / Yer bilgisi (Örn: İstanbul 5. İş Mahkemesi):') || '';
    const parties = prompt('Taraflar / Müvekkil:') || '';
    const caseNo = prompt('Esas No:') || '';

    DataStore.addScheduleItem({
      id: 'ev-' + Date.now(),
      time: time,
      type: title.toLowerCase().includes('duruşma') ? 'hearing' : 'meeting',
      typeLabel: title,
      court: court,
      parties: parties,
      caseNo: caseNo,
      badgeColor: title.toLowerCase().includes('duruşma') ? 'blue' : 'green'
    });

    DashboardModule.renderSchedule();
    DashboardModule.updateStats();
    this.showToast('Etkinlik bugünkü ajandaya kaydedildi.');
  },

  openAddDeadlineModal() {
    CalendarModule.promptNewDeadline();
  },

  setupModals() {
    const newCaseBtn = document.getElementById('btnQuickNewCase');
    const modalOverlay = document.getElementById('newCaseModal');
    const modalCloseBtn = document.getElementById('btnCloseNewCaseModal');
    const form = document.getElementById('newCaseForm');

    if (newCaseBtn && modalOverlay) {
      newCaseBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'flex';
      });
    }

    if (modalCloseBtn && modalOverlay) {
      modalCloseBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
      });
    }

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.style.display = 'none';
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const client = document.getElementById('newClientInput')?.value.trim();
        const opponent = document.getElementById('newOpponentInput')?.value.trim();
        const court = document.getElementById('newCourtInput')?.value.trim();
        const caseNo = document.getElementById('newCaseNoInput')?.value.trim();
        const caseType = document.getElementById('newCaseTypeInput')?.value;

        if (client && court) {
          const newCase = {
            id: 'case-' + Date.now(),
            title: `${client} / ${opponent || 'Davalı'}`,
            client: client,
            opponent: opponent || 'Davalı',
            court: court,
            caseNo: caseNo || '2026/1',
            type: caseType || 'Hukuk Davası',
            status: 'Aktif',
            filingDate: new Date().toLocaleDateString('tr-TR'),
            timeline: [
              {
                id: 'tl-' + Date.now(),
                date: new Date().toLocaleDateString('tr-TR'),
                title: 'Dava Açıldı',
                description: 'Dava sisteme kaydedildi.',
                status: 'completed'
              }
            ],
            documents: [],
            internalNote: 'Yeni açılan dosya.'
          };

          DataStore.addCase(newCase);
          form.reset();
          if (modalOverlay) modalOverlay.style.display = 'none';

          DashboardModule.updateStats();
          CaseDetailModule.currentCaseId = newCase.id;
          CaseDetailModule.loadActiveCase();
          this.renderCasesListTable();

          this.showToast(`Yeni dava dosyası (${newCase.caseNo}) başarıyla oluşturuldu!`);
        }
      });
    }
  },

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  },

  showToast(message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
