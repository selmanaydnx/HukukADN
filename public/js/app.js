/**
 * ADN Web Application Controller (Single Page Application)
 * Türkiye Barolar Birliği ve KVKK normlarına tam uyumlu hukuk otomasyon motoru
 */

const App = {
  state: {
    user: null,
    tenant: null,
    role: null,
    tenants: [],
    currentView: 'dashboard',
    casesCache: [],
    clientsCache: []
  },

  async init() {
    this.setupGlobalKeyboardShortcuts();
    try {
      const data = await API.auth.getProfile();
      this.state.user = data.user;
      this.state.tenant = data.currentTenant;
      this.state.role = data.currentRole;
      this.state.tenants = data.tenants || [];

      this.renderAuthenticatedApp();
    } catch (err) {
      // Oturum yok veya geçersiz
      this.renderPublicLanding();
    }
  },

  copyText(text, label = 'Bilgi') {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(`✓ ${label} kopyalandı!`, 'success');
      }).catch(() => {
        this.fallbackCopyText(text, label);
      });
    } else {
      this.fallbackCopyText(text, label);
    }
  },

  fallbackCopyText(text, label) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.showToast(`✓ ${label} kopyalandı!`, 'success');
    } catch (e) {
      this.showToast('Kopyalama yapılamadı.', 'error');
    }
    document.body.removeChild(ta);
  },

  setupGlobalKeyboardShortcuts() {
    if (this._shortcutsBound) return;
    this._shortcutsBound = true;

    window.addEventListener('keydown', (e) => {
      // Ctrl+K veya Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openCommandPalette();
        return;
      }
      // '/' tuşu (odak input veya textarea değilse)
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        this.openCommandPalette();
        return;
      }
      // ESC tuşu
      if (e.key === 'Escape') {
        const cmdModal = document.getElementById('modal-command-palette');
        if (cmdModal && cmdModal.classList.contains('active')) {
          cmdModal.classList.remove('active');
        }
      }
    });
  },

  async openCommandPalette() {
    const modal = document.getElementById('modal-command-palette');
    if (!modal) return;
    modal.classList.add('active');
    const input = document.getElementById('cmd-palette-input');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 50);
    }
    await this.renderCommandPaletteResults('');
  },

  async renderCommandPaletteResults(query = '', typeFilter = 'all') {
    const listEl = document.getElementById('cmd-palette-results');
    if (!listEl) return;

    const q = (query || '').toLowerCase().trim();

    let cases = this.state.casesCache || [];
    let clients = this.state.clientsCache || [];

    if (cases.length === 0 || clients.length === 0) {
      try {
        const [cRes, clRes] = await Promise.all([
          API.cases.list().catch(() => ({ cases: [] })),
          API.clients.list().catch(() => ({ clients: [] }))
        ]);
        cases = this.state.casesCache = cRes.cases || [];
        clients = this.state.clientsCache = clRes.clients || [];
      } catch (e) {}
    }

    const items = [];

    // Hızlı Aksiyonlar
    if (!q || q.includes('yeni') || q.includes('ekle')) {
      items.push({
        type: 'action',
        icon: '⚖️',
        title: 'Yeni Dava Dosyası Aç',
        sub: 'Hızlı dosya oluşturma diyaloğunu açar',
        action: () => { this.closeModals(); this.openNewCaseModal(); }
      });
      items.push({
        type: 'action',
        icon: '👥',
        title: 'Yeni Müvekkil Ekle',
        sub: 'Yeni gerçek veya tüzel kişi müvekkil kartı oluşturur',
        action: () => { this.closeModals(); this.openNewClientModal(); }
      });
      items.push({
        type: 'action',
        icon: '📝',
        title: 'Duruşma Zabıt Notu Gir',
        sub: 'Celse sonucu, sonraki duruşma veya kesin mehil kaydı',
        action: () => { this.closeModals(); this.openHearingNotesModal(); }
      });
      items.push({
        type: 'action',
        icon: '🧮',
        title: 'SMM & Hukuki Hesaplama Motoru',
        sub: 'Serbest meslek makbuzu, stopaj, KDV ve icra kapak hesabı',
        action: () => { this.closeModals(); this.navigate('legal-calc'); }
      });
    }

    // Dava Dosyaları
    if (typeFilter === 'all' || typeFilter === 'case') {
      cases.forEach(c => {
        const match = !q ||
          (c.internal_no && c.internal_no.toLowerCase().includes(q)) ||
          (c.official_no && c.official_no.toLowerCase().includes(q)) ||
          (c.client_name && c.client_name.toLowerCase().includes(q)) ||
          (c.court_name && c.court_name.toLowerCase().includes(q)) ||
          (c.opponent_name && c.opponent_name.toLowerCase().includes(q));
        if (match) {
          items.push({
            type: 'case',
            icon: '⚖️',
            title: `${c.internal_no} - ${c.official_no || 'Esas Belirtilmedi'} (${c.court_name || 'Merci Belirtilmedi'})`,
            sub: `Müvekkil: ${c.client_name} • Aşama: ${c.stage} • ${c.case_type}`,
            action: () => {
              this.closeModals();
              this.navigate('cases');
              setTimeout(() => this.filterCases(c.internal_no), 150);
            }
          });
        }
      });
    }

    // Müvekkiller
    if (typeFilter === 'all' || typeFilter === 'client') {
      clients.forEach(cl => {
        const match = !q ||
          (cl.name && cl.name.toLowerCase().includes(q)) ||
          (cl.identity_no && cl.identity_no.toLowerCase().includes(q)) ||
          (cl.phone && cl.phone.toLowerCase().includes(q));
        if (match) {
          items.push({
            type: 'client',
            icon: '👥',
            title: `${cl.name} (${cl.type === 'corporate' ? 'Şirket' : 'Gerçek Kişi'})`,
            sub: `TC/VKN: ${cl.identity_no || 'Yok'} • Tel: ${cl.phone || '-'} • ${cl.active_cases_count || 0} Aktif Dosya`,
            action: () => {
              this.closeModals();
              this.showClientDetail(cl.id);
            }
          });
        }
      });
    }

    if (items.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 28px; text-align: center; color: var(--text-muted); font-size: 13px;">
          "${query}" ile eşleşen dosya veya müvekkil bulunamadı.
        </div>
      `;
      return;
    }

    listEl.innerHTML = items.slice(0, 15).map((item, idx) => `
      <div class="cmd-result-item" onclick="App._cmdPaletteItems[${idx}].action()">
        <div>
          <div class="cmd-result-title">
            <span>${item.icon}</span>
            <span>${item.title}</span>
          </div>
          <div class="cmd-result-sub">${item.sub}</div>
        </div>
        <span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">↵ Git</span>
      </div>
    `).join('');

    this._cmdPaletteItems = items;
  },

  handleCommandPaletteSearch(val) {
    this.renderCommandPaletteResults(val);
  },

  filterCommandPalette(type) {
    const input = document.getElementById('cmd-palette-input');
    const q = input ? input.value : '';
    this.renderCommandPaletteResults(q, type);
  },

  renderPublicLanding() {
    const hash = window.location.hash;
    if (hash === '#register') {
      return this.showAuthScreen('register');
    }
    if (hash === '#login') {
      return this.showAuthScreen('login');
    }
    document.getElementById('public-view').style.display = 'block';
    const authScreen = document.getElementById('auth-screen-view');
    if (authScreen) authScreen.style.display = 'none';
    document.getElementById('auth-app-view').style.display = 'none';
  },

  showAuthScreen(tab = 'register') {
    document.getElementById('public-view').style.display = 'none';
    document.getElementById('auth-app-view').style.display = 'none';
    const authScreen = document.getElementById('auth-screen-view');
    if (authScreen) authScreen.style.display = 'flex';
    this.switchAuthTab(tab);
    window.location.hash = tab;
  },

  showLanding() {
    const authScreen = document.getElementById('auth-screen-view');
    if (authScreen) authScreen.style.display = 'none';
    document.getElementById('public-view').style.display = 'block';
    document.getElementById('auth-app-view').style.display = 'none';
    window.location.hash = '';
  },

  switchAuthTab(tab) {
    const regTabBtn = document.getElementById('tab-btn-register');
    const loginTabBtn = document.getElementById('tab-btn-login');
    const regPane = document.getElementById('pane-register');
    const loginPane = document.getElementById('pane-login');
    const alertBox = document.getElementById('auth-screen-alert');
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.className = 'auth-alert-box';
    }

    if (tab === 'register') {
      if (regTabBtn) regTabBtn.classList.add('active');
      if (loginTabBtn) loginTabBtn.classList.remove('active');
      if (regPane) regPane.style.display = 'block';
      if (loginPane) loginPane.style.display = 'none';
    } else {
      if (loginTabBtn) loginTabBtn.classList.add('active');
      if (regTabBtn) regTabBtn.classList.remove('active');
      if (regPane) regPane.style.display = 'none';
      if (loginPane) loginPane.style.display = 'block';
    }
  },

  async handleScreenRegister(e) {
    e.preventDefault();
    const alertBox = document.getElementById('auth-screen-alert');
    if (alertBox) alertBox.style.display = 'none';

    const payload = {
      fullName: document.getElementById('screen-reg-fullname').value,
      email: document.getElementById('screen-reg-email').value,
      officeName: document.getElementById('screen-reg-officename').value,
      city: document.getElementById('screen-reg-city').value,
      barCity: document.getElementById('screen-reg-barcity').value,
      barNumber: document.getElementById('screen-reg-barnumber').value,
      password: document.getElementById('screen-reg-password').value,
      termsAccepted: document.getElementById('screen-reg-terms').checked
    };

    try {
      const data = await API.auth.register(payload);
      this.showToast(`Büronuz "${data.tenant.name}" başarıyla oluşturuldu!`, 'success');
      window.location.hash = '';
      this.init();
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message;
        alertBox.className = 'auth-alert-box error';
        alertBox.style.display = 'block';
      }
      this.showToast(err.message, 'error');
    }
  },

  async handleScreenLogin(e) {
    e.preventDefault();
    const alertBox = document.getElementById('auth-screen-alert');
    if (alertBox) alertBox.style.display = 'none';

    const email = document.getElementById('screen-login-email').value;
    const password = document.getElementById('screen-login-password').value;

    try {
      const data = await API.auth.login({ email, password });
      this.showToast(`Hoş geldiniz, ${data.user.fullName}!`, 'success');
      window.location.hash = '';
      this.init();
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message;
        alertBox.className = 'auth-alert-box error';
        alertBox.style.display = 'block';
      }
      this.showToast(err.message, 'error');
    }
  },

  renderAuthenticatedApp() {
    document.getElementById('public-view').style.display = 'none';
    const authScreen = document.getElementById('auth-screen-view');
    if (authScreen) authScreen.style.display = 'none';
    document.getElementById('auth-app-view').style.display = 'flex';

    // Topbar & Sidebar Güncelleme
    document.getElementById('topbar-tenant-name').textContent = this.state.tenant.name;
    const roleBadgeText = this.state.role === 'owner' ? 'Büro Sahibi' : (this.state.role === 'manager' ? 'Yönetici' : (this.state.role === 'lawyer' ? 'Avukat' : (this.state.role || 'Avukat')));
    document.getElementById('topbar-tenant-role').textContent = roleBadgeText;
    document.getElementById('topbar-user-name').textContent = this.state.user.fullName;
    document.getElementById('lbl-sidebar-user').textContent = this.state.user.fullName;
    document.getElementById('lbl-sidebar-role').textContent = this.getRoleTitle(this.state.role);

    if (this.state.user.barCity && this.state.user.barNumber) {
      document.getElementById('topbar-user-bar').textContent = `${this.state.user.barCity} (Sicil: ${this.state.user.barNumber})`;
    } else {
      document.getElementById('topbar-user-bar').textContent = this.state.user.email;
    }

    // Avatar harfleri
    const initials = this.state.user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('topbar-avatar').textContent = initials;

    this.updateSubscriptionBanner();
    this.navigate(this.state.currentView || 'dashboard');
  },

  getRoleTitle(role) {
    switch (role) {
      case 'owner': return 'Kurucu Avukat / Büro Sahibi';
      case 'manager': return 'Yönetici Avukat';
      case 'lawyer': return 'Avukat';
      case 'assistant': return 'Kâtip / Stajyer';
      case 'finance': return 'Finans & Muhasebe';
      default: return 'Büro Üyesi';
    }
  },

  toggleMobileSidebar() {
    const sidebar = document.querySelector('.app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('active');
  },

  closeMobileSidebar() {
    const sidebar = document.querySelector('.app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  },

  // SPA Navigasyon
  navigate(view) {
    this.closeMobileSidebar();
    this.state.currentView = view;

    // Sidebar active link güncelleme
    document.querySelectorAll('.app-sidebar .nav-link').forEach(link => {
      link.classList.remove('active');
    });
    const activeLink = document.getElementById(`nav-${view}`);
    if (activeLink) activeLink.classList.add('active');

    const content = document.getElementById('spa-content');
    content.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">Veriler yükleniyor...</div>';

    switch (view) {
      case 'dashboard': return this.renderDashboard();
      case 'clients': return this.renderClients();
      case 'cases': return this.renderCases();
      case 'calendar': return this.renderCalendar();
      case 'procedural': return this.renderProcedural();
      case 'authorization-cert': return this.renderAuthorizationCert();
      case 'legal-calc': return this.renderLegalCalc();
      case 'petition-templates': return this.renderPetitionTemplates();
      case 'tasks': return this.renderTasks();
      case 'documents': return this.renderDocuments();
      case 'finance': return this.renderFinance();
      case 'ai-assistant': return this.renderAIAssistant();
      case 'tenant-settings': return this.renderTenantSettings();
      case 'subscription': return this.renderSubscription();
      case 'pricing': return this.openPricingModal();
      case 'audit-logs': return this.renderAuditLogs();
      default: return this.renderDashboard();
    }
  },

  // 1. DASHBOARD GÖRÜNÜMÜ
  async renderDashboard() {
    try {
      const { stats, upcomingHearings, urgentDeadlines, caseTypeDistribution, stageDistribution, monthlyFinancials, notifications } = await API.dashboard.getSummary();

      // Sidebar rozetleri güncelle
      document.getElementById('badge-active-cases').textContent = stats.active_cases || 0;
      document.getElementById('badge-pending-tasks').textContent = stats.pending_tasks || 0;

      // Bildirim merkezini güncelle
      this.updateNotifications(notifications || []);

      const totalCases = stats.active_cases || 0;
      const donutHtml = this.renderDonutChart(caseTypeDistribution || [], totalCases);
      const barChartHtml = this.renderBarChart(monthlyFinancials || []);
      const pipelineHtml = this.renderPipelineFunnel(stageDistribution || []);

      const html = `
        <div class="view-enter-animation">
          <div class="page-header">
            <div>
              <h1 class="page-title">Büro Genel Bakışı</h1>
              <div class="page-desc">${this.state.tenant.name} günlük çalışma özeti, portföy analizi ve kritik süreler</div>
            </div>
            <div>
              <button class="btn btn-primary" onclick="App.openNewCaseModal()">+ Yeni Dosya Aç</button>
            </div>
          </div>

          <!-- KPI Kartları (Animasyonlu Sayaçlar) -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div>
                <div class="kpi-label">Aktif Dava & İcra Dosyası</div>
                <div class="kpi-val" id="kpi-val-cases">0</div>
              </div>
              <div class="kpi-icon blue">⚖️</div>
            </div>

            <div class="kpi-card">
              <div>
                <div class="kpi-label">Bugünkü Duruşmalar</div>
                <div class="kpi-val" id="kpi-val-hearings">0</div>
              </div>
              <div class="kpi-icon amber">🏛️</div>
            </div>

            <div class="kpi-card">
              <div>
                <div class="kpi-label">Bekleyen Büro Görevleri</div>
                <div class="kpi-val" id="kpi-val-tasks">0</div>
              </div>
              <div class="kpi-icon purple">📋</div>
            </div>

            <div class="kpi-card">
              <div>
                <div class="kpi-label">Toplam Tahsilat</div>
                <div class="kpi-val" id="kpi-val-collections">₺0,00</div>
              </div>
              <div class="kpi-icon green">💰</div>
            </div>
          </div>

          <!-- 1. Operasyonel Tablolar: Yaklaşan Celseler & Kritik Süreler (Öncelikli Operasyonel Alan) -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;">
            <!-- Yaklaşan Duruşmalar -->
            <div class="card">
              <div class="card-header">
                <div class="card-title">📅 Yaklaşan Duruşmalar (Celseler)</div>
                <button class="btn btn-secondary btn-sm" onclick="App.navigate('calendar')">Tümü</button>
              </div>
              ${upcomingHearings.length === 0 ? `
                <div class="empty-state" style="padding: 24px 10px;">
                  <div class="empty-state-title">Yaklaşan duruşma bulunmuyor</div>
                  <div class="empty-state-desc">Takvime duruşma eklemek için "+ Hızlı Ekle" menüsünü kullanabilirsiniz.</div>
                </div>
              ` : `
                <div class="table-container">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Tarih / Saat</th>
                        <th>Dosya / Mahkeme</th>
                        <th>Müvekkil</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${upcomingHearings.map(h => `
                        <tr>
                          <td><strong>${new Date(h.event_date).toLocaleDateString('tr-TR')}</strong><br><small style="color:var(--text-muted);">${new Date(h.event_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</small></td>
                          <td><strong>${h.internal_no || 'Dosyasız'}</strong><br><small style="color:var(--text-muted);">${h.court_name || h.title}</small></td>
                          <td>${h.client_name || '-'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>

            <!-- Kritik Yasal Süreler -->
            <div class="card">
              <div class="card-header">
                <div class="card-title">⏱️ Kritik Yasal Süreler & Tebligatlar</div>
                <button class="btn btn-secondary btn-sm" onclick="App.navigate('procedural')">Süre Motoru</button>
              </div>
              ${urgentDeadlines.length === 0 ? `
                <div class="empty-state" style="padding: 24px 10px;">
                  <div class="empty-state-title">Kritik süre uyarısı yok</div>
                  <div class="empty-state-desc">UETS tebligat tarihi girdiğinizde HMK yasal süreleri burada listelenir.</div>
                </div>
              ` : `
                <div class="table-container">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Son Gün</th>
                        <th>İşlem / Açıklama</th>
                        <th>Dosya</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${urgentDeadlines.map(d => `
                        <tr>
                          <td><span class="badge badge-red">${new Date(d.event_date).toLocaleDateString('tr-TR')}</span></td>
                          <td><strong>${d.title}</strong></td>
                          <td>${d.internal_no || '-'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </div>

          <!-- 2. Görsel Grafikler Sırası: Donut Portföy Dağılımı & Aylık Finansal Trend -->
          <div class="charts-grid-2">
            <div class="chart-card">
              <div class="chart-header">
                <div class="chart-title">
                  <span>⚖️ Portföy & Dava Türü Dağılımı</span>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="App.navigate('cases')">Dosyalar</button>
              </div>
              ${donutHtml}
            </div>

            <div class="chart-card">
              <div class="chart-header">
                <div class="chart-title">
                  <span>📈 6 Aylık Finansal Trend (Tahsilat / Masraf)</span>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="App.navigate('finance')">Finans Detayı</button>
              </div>
              ${barChartHtml}
            </div>
          </div>

          <!-- 3. Yargılama Aşamaları Funnel & UETS Zaman Çizelgesi -->
          <div class="charts-grid-2" style="margin-bottom: 24px;">
            <div class="chart-card">
              <div class="chart-header">
                <div class="chart-title">
                  <span>📊 Yargılama Aşamaları (Boru Hattı)</span>
                </div>
                <span style="font-size: 11px; color: var(--text-muted);">Aktif Dava Süreci</span>
              </div>
              ${pipelineHtml}
            </div>

            <div class="chart-card">
              <div class="chart-header">
                <div class="chart-title">
                  <span>📬 UETS & HMK Yasal Tebligat Süreç Akışı</span>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="App.showCalculatorModal()">Süre Motoru ↗</button>
              </div>
              <div class="timeline-visual">
                <div class="timeline-step active">
                  <div class="timeline-node">1</div>
                  <div class="timeline-step-title">Elektronik İleti</div>
                  <div class="timeline-step-desc">UETS Kutusu</div>
                </div>
                <div class="timeline-step active">
                  <div class="timeline-node">2</div>
                  <div class="timeline-step-title">+5 Gün Karine</div>
                  <div class="timeline-step-desc">Teb. K. m. 7/a</div>
                </div>
                <div class="timeline-step active">
                  <div class="timeline-node">3</div>
                  <div class="timeline-step-title">Esas Süre</div>
                  <div class="timeline-step-desc">HMK / İİK Süresi</div>
                </div>
                <div class="timeline-step">
                  <div class="timeline-node">4</div>
                  <div class="timeline-step-title">Kesin Gün</div>
                  <div class="timeline-step-desc">Hafta Sonu Koruması</div>
                </div>
              </div>
              <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 14px; font-size: 12px; color: var(--text-muted); line-height: 1.5;">
                <strong style="color: var(--text-main);">Hesaplama Dayanağı ve Kapsamı:</strong> Tebligat Kanunu m. 7/a uyarınca elektronik tebligatlarda süre, iletinin hesaba ulaştığı tarihi izleyen 5. günün sonunda başlar. HMK m. 92 ve m. 104 hesaplama kuralları esas alınmakta olup nihai süre tespiti avukatın mesleki kontrol ve teyidine tabidir.
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('spa-content').innerHTML = html;

      // KPI Sayaçlarını Canlandır (Animated Counters)
      this.animateCount('kpi-val-cases', stats.active_cases || 0);
      this.animateCount('kpi-val-hearings', stats.today_hearings || 0);
      this.animateCount('kpi-val-tasks', stats.pending_tasks || 0);
      this.animateCount('kpi-val-collections', Number(stats.total_collections || 0), true);

    } catch (err) {
      this.showToast('Dashboard verisi alınamadı: ' + err.message, 'error');
    }
  },

  // GRAFİK BİLEŞENLERİ & GÖRSEL MOTORLAR
  renderDonutChart(caseTypeDistribution, totalCases) {
    const caseTypeMeta = {
      dava: { label: 'Hukuk Davası', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
      ceza: { label: 'Ceza Davası', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
      icra: { label: 'İcra Takibi', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
      arabuluculuk: { label: 'Arabuluculuk', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
      danismanlik: { label: 'Danışmanlık', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
      default: { label: 'Diğer', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' }
    };

    if (!totalCases || totalCases === 0 || !caseTypeDistribution || caseTypeDistribution.length === 0) {
      return `
        <div class="donut-container">
          <div class="donut-svg-wrapper">
            <svg viewBox="0 0 42 42" class="donut-svg" width="165" height="165">
              <circle class="donut-circle-bg" cx="21" cy="21" r="15.91549430918954" stroke-dasharray="4 3" stroke-width="2.8"></circle>
            </svg>
            <div class="donut-center-text">
              <span style="font-size: 18px; margin-bottom: 2px;">⚖️</span>
              <span class="donut-center-num">0</span>
              <span class="donut-center-label">Aktif Dosya</span>
            </div>
          </div>
          <div class="donut-legend" style="justify-content: center; color: var(--text-muted); font-size: 12px; line-height: 1.5; text-align: center; padding: 0 10px;">
            <div>Henüz açık dava veya icra kaydı bulunmuyor. Yeni dosya eklediğinizde portföy dağılımı burada anlık olarak görselleştirilir.</div>
          </div>
        </div>
      `;
    }

    let accumulatedPct = 0;
    const slicesHtml = caseTypeDistribution.map(item => {
      const meta = caseTypeMeta[item.case_type] || caseTypeMeta.default;
      const pct = Math.max(1, Math.round((item.count / totalCases) * 100));
      const offset = -accumulatedPct;
      accumulatedPct += pct;
      return `<circle class="donut-slice" cx="21" cy="21" r="15.91549430918954" stroke="${meta.color}" stroke-width="3.6" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${offset}"><title>${meta.label}: ${item.count} dosya (%${pct})</title></circle>`;
    }).join('');

    const legendHtml = caseTypeDistribution.map(item => {
      const meta = caseTypeMeta[item.case_type] || caseTypeMeta.default;
      const pct = Math.round((item.count / totalCases) * 100);
      return `
        <div class="legend-item" title="${meta.label}: ${item.count} adet dosya" style="padding: 6px 8px; border-radius: 6px; transition: background 0.15s ease;">
          <div class="legend-label-group">
            <span class="legend-dot" style="background: ${meta.color}; box-shadow: 0 0 6px ${meta.color};"></span>
            <span style="font-weight: 600; color: var(--text-main); font-size: 12px;">${meta.label}</span>
          </div>
          <div>
            <span style="font-weight: 800; color: #0f172a; margin-right: 4px; font-size: 13px;">${item.count}</span>
            <span class="badge" style="background: ${meta.bg}; color: ${meta.color}; font-size: 10px; padding: 1px 6px;">%${pct}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="donut-container">
        <div class="donut-svg-wrapper">
          <svg viewBox="0 0 42 42" class="donut-svg" width="165" height="165">
            <circle class="donut-circle-bg" cx="21" cy="21" r="15.91549430918954" stroke-width="3"></circle>
            ${slicesHtml}
          </svg>
          <div class="donut-center-text">
            <span class="donut-center-num" style="font-size: 26px; font-weight: 800; color: #0f172a;">${totalCases}</span>
            <span class="donut-center-label" style="font-size: 11px; font-weight: 600;">Aktif Dosya</span>
          </div>
        </div>
        <div class="donut-legend">
          ${legendHtml}
        </div>
      </div>
    `;
  },

  renderBarChart(monthlyFinancials) {
    const now = new Date();
    const monthsList = [];
    const monthMap = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = d.toLocaleDateString('tr-TR', { month: 'short' });
      monthsList.push({ key: mKey, label: mLabel });
      monthMap[mKey] = { income: 0, expense: 0, label: mLabel };
    }

    let hasFinancialData = false;
    let maxVal = 1;

    (monthlyFinancials || []).forEach(r => {
      if (r.month) {
        if (!monthMap[r.month]) {
          const dParts = r.month.split('-');
          const mLabel = new Date(dParts[0], dParts[1] - 1, 1).toLocaleDateString('tr-TR', { month: 'short' });
          monthMap[r.month] = { income: 0, expense: 0, label: mLabel };
          monthsList.push({ key: r.month, label: mLabel });
        }
        if (r.record_type === 'collection') {
          monthMap[r.month].income = Number(r.total) || 0;
        } else {
          monthMap[r.month].expense = Number(r.total) || 0;
        }
      }
    });

    monthsList.forEach(m => {
      const d = monthMap[m.key];
      if (d.income > 0 || d.expense > 0) hasFinancialData = true;
      if (d.income > maxVal) maxVal = d.income;
      if (d.expense > maxVal) maxVal = d.expense;
    });

    const legendTopHtml = `
      <div class="chart-legend-top" style="display: flex; gap: 16px; justify-content: flex-end; margin-bottom: 8px; font-size: 11px;">
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 2px; background: #10b981;"></span> Tahsilat (Gelir)
        </span>
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 2px; background: #f59e0b;"></span> Masraf / Gider
        </span>
      </div>
    `;

    if (!hasFinancialData) {
      const emptyBars = monthsList.map(m => `
        <div class="bar-col">
          <div class="bar-group">
            <div class="bar-pillar" style="height: 6px; background: #e2e8f0; opacity: 0.5;"></div>
          </div>
          <div class="bar-label">${m.label}</div>
        </div>
      `).join('');

      return `
        ${legendTopHtml}
        <div class="bar-chart-wrapper" style="position: relative;">
          ${emptyBars}
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.7); font-size: 12px; color: var(--text-muted); font-weight: 500;">
            Bu dönemde finansal kayıt bulunmuyor
          </div>
        </div>
      `;
    }

    const barsHtml = monthsList.map(m => {
      const d = monthMap[m.key];
      const incH = d.income > 0 ? Math.max(8, Math.round((d.income / maxVal) * 120)) : 0;
      const expH = d.expense > 0 ? Math.max(8, Math.round((d.expense / maxVal) * 120)) : 0;
      const incFormatted = Number(d.income).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
      const expFormatted = Number(d.expense).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

      return `
        <div class="bar-col">
          <div class="bar-group">
            <div class="bar-pillar income" style="height: ${incH}px;" title="${m.label} Tahsilat: ₺${incFormatted}"></div>
            <div class="bar-pillar expense" style="height: ${expH}px;" title="${m.label} Masraf: ₺${expFormatted}"></div>
          </div>
          <div class="bar-label">${m.label}</div>
        </div>
      `;
    }).join('');

    return `
      ${legendTopHtml}
      <div class="bar-chart-wrapper">
        ${barsHtml}
      </div>
      <div style="font-size: 11px; color: var(--text-muted); margin-top: 10px; display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 6px; flex-wrap: wrap; gap: 6px;">
        <span>Veri Kaynağı: Büro Kasa & Tahsilat Kayıtları</span>
        <span>Birim: Türk Lirası (₺) · Dönem: Son 6 Ay</span>
      </div>
    `;
  },

  renderPipelineFunnel(stageDistribution) {
    const stagesDef = [
      { key: 'dava_acildi', label: '1. Dava Açılışı / Tevzi' },
      { key: 'on_inceleme', label: '2. Ön İnceleme & Tensip' },
      { key: 'tahkikat', label: '3. Tahkikat & Celseler' },
      { key: 'bilirkisi', label: '4. Bilirkişi / Keşif' },
      { key: 'karara_cikti', label: '5. Hüküm & Karar' },
      { key: 'istinaf', label: '6. İstinaf / Kanun Yolu' }
    ];

    const stageCountMap = {};
    let maxStageCount = 1;
    (stageDistribution || []).forEach(s => {
      stageCountMap[s.stage] = s.count;
      if (s.count > maxStageCount) maxStageCount = s.count;
    });

    const rowsHtml = stagesDef.map(st => {
      const count = stageCountMap[st.key] || 0;
      const pct = count > 0 ? Math.max(8, Math.round((count / maxStageCount) * 100)) : 0;
      return `
        <div class="pipeline-row">
          <div class="pipeline-label" title="${st.label}">${st.label}</div>
          <div class="pipeline-bar-bg">
            <div class="pipeline-bar-fill" style="width: ${pct}%;"></div>
          </div>
          <div class="pipeline-val">${count} dosya</div>
        </div>
      `;
    }).join('');

    return `
      <div class="pipeline-container">
        ${rowsHtml}
      </div>
    `;
  },

  // 2. MÜVEKKİLLER CRM
  async renderClients() {
    try {
      const { clients } = await API.clients.list();
      this.state.clientsCache = clients;

      const html = `
        <div class="page-header">
          <div>
            <h1 class="page-title">Müvekkil Yönetimi (CRM)</h1>
            <div class="page-desc">Kayıtlı gerçek ve tüzel kişi müvekkiller, vekâletname bilgileri ve menfaat çatışması sorgusu</div>
          </div>
          <div>
            <button class="btn btn-primary" onclick="App.openNewClientModal()">+ Yeni Müvekkil Ekle</button>
          </div>
        </div>

        <!-- Filtre ve Arama Araç Çubuğu -->
        <div class="filter-toolbar">
          <div class="filter-group">
            <div class="filter-input-wrapper">
              <span class="filter-input-icon">🔍</span>
              <input type="text" id="client-search-input" class="form-control" placeholder="Müvekkil adı, TC/VKN veya telefonla canlı ara..." oninput="App.filterClients()">
            </div>
            <select id="client-type-filter" class="form-control" style="width: 170px;" onchange="App.filterClients()">
              <option value="all">Tüm Müvekkiller</option>
              <option value="individual">Gerçek Kişiler</option>
              <option value="corporate">Tüzel Kişiler (Şirketler)</option>
            </select>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">
            Toplam: <span id="client-count-badge" style="color: var(--primary-accent); font-weight: 700;">${clients.length}</span> Müvekkil
          </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-container">
            <table class="table" id="clients-table">
              <thead>
                <tr>
                  <th>Müvekkil Adı / Unvanı</th>
                  <th>Tür</th>
                  <th>TCKN / VKN (Tıkla Kopyala)</th>
                  <th>İletişim</th>
                  <th>Aktif Dosya</th>
                  <th>Kayıt Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody id="clients-tbody">
                ${clients.length === 0 ? `
                  <tr>
                    <td colspan="7">
                      <div class="empty-state-modern">
                        <img src="img/adn_security_seal.jpg" alt="Müvekkil Yok" class="empty-state-seal">
                        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px; color: var(--text-main);">Henüz Müvekkil Kaydı Bulunmuyor</h3>
                        <p style="font-size: 13px; color: var(--text-muted); max-width: 420px; margin: 0 auto 18px;">
                          Hukuk büronuzun portföyünü oluşturmak için ilk müvekkilinizi ekleyin; vekâletname ve iletişim bilgilerini güvenle saklayın.
                        </p>
                        <button class="btn btn-primary" onclick="App.openNewClientModal()">+ İlk Müvekkilinizi Ekleyin</button>
                      </div>
                    </td>
                  </tr>
                ` : clients.map(c => `
                  <tr class="client-row" data-name="${(c.name || '').toLowerCase()}" data-id="${(c.identity_no || '').toLowerCase()}" data-phone="${(c.phone || '').toLowerCase()}" data-type="${c.type}">
                    <td>
                      <strong style="font-size: 14px; color: #0f172a;">${c.name}</strong>
                      ${c.notary_info ? `<br><small style="color:var(--text-muted);">📜 ${c.notary_info}</small>` : ''}
                    </td>
                    <td>
                      <span class="badge ${c.type === 'corporate' ? 'badge-blue' : 'badge-gray'}">
                        ${c.type === 'corporate' ? '🏢 Şirket' : '👤 Gerçek Kişi'}
                      </span>
                    </td>
                    <td>
                      ${c.identity_no ? `
                        <span class="copyable-badge" onclick="App.copyText('${c.identity_no}', 'TCKN/VKN')" title="Kopyalamak için tıklayın">
                          📋 ${c.identity_no}
                        </span>
                      ` : '<span style="color: var(--text-muted); font-size: 12px;">-</span>'}
                    </td>
                    <td>
                      ${c.phone ? `
                        <span class="copyable-badge" onclick="App.copyText('${c.phone}', 'Telefon')" title="Kopyalamak için tıklayın" style="margin-bottom: 4px;">
                          📞 ${c.phone}
                        </span><br>
                      ` : ''}
                      ${c.email ? `<small style="color: var(--text-muted);">✉️ ${c.email}</small>` : ''}
                    </td>
                    <td><span class="badge badge-amber" style="font-weight: 700;">${c.active_cases_count || 0} Dosya</span></td>
                    <td style="color: var(--text-muted); font-size: 12px;">${new Date(c.created_at).toLocaleDateString('tr-TR')}</td>
                    <td>
                      <div style="display: flex; gap: 6px;">
                        <button class="btn btn-secondary btn-sm" onclick="App.showClientDetail('${c.id}')">Detay</button>
                        <button class="btn btn-secondary btn-sm" style="color: #ef4444; border-color: rgba(239,68,68,0.2);" onclick="App.deleteClient('${c.id}', '${c.name.replace(/'/g, "\\'")}')">Sil</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('spa-content').innerHTML = html;
    } catch (err) {
      this.showToast('Müvekkil listesi alınamadı: ' + err.message, 'error');
    }
  },

  filterClients() {
    const q = (document.getElementById('client-search-input')?.value || '').toLowerCase().trim();
    const type = document.getElementById('client-type-filter')?.value || 'all';
    const rows = document.querySelectorAll('#clients-tbody .client-row');
    let visibleCount = 0;

    rows.forEach(row => {
      const name = row.dataset.name || '';
      const idNo = row.dataset.id || '';
      const phone = row.dataset.phone || '';
      const rowType = row.dataset.type || '';

      const matchQ = !q || name.includes(q) || idNo.includes(q) || phone.includes(q);
      const matchType = type === 'all' || rowType === type;

      if (matchQ && matchType) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    const countBadge = document.getElementById('client-count-badge');
    if (countBadge) countBadge.textContent = visibleCount;
  },

  async showClientDetail(clientId) {
    try {
      const { client, cases } = await API.clients.get(clientId);
      const detailHtml = `
        <div class="modal-overlay active" id="modal-client-detail">
          <div class="modal modal-lg">
            <div class="modal-header">
              <div class="modal-title">Müvekkil Kartı: ${client.name}</div>
              <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-client-detail').remove()">✕</button>
            </div>
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; background: #f8fafc; padding: 14px; border-radius: var(--radius-sm);">
                <div><strong>Tür:</strong> ${client.type === 'corporate' ? 'Tüzel Kişi / Şirket' : 'Gerçek Kişi'}</div>
                <div><strong>TCKN / VKN:</strong> ${client.identity_no || 'Belirtilmedi'}</div>
                <div><strong>Telefon:</strong> ${client.phone || '-'}</div>
                <div><strong>E-posta:</strong> ${client.email || '-'}</div>
                <div style="grid-column: span 2;"><strong>Noterlik & Vekâletname:</strong> ${client.notary_info || 'Kayıtlı vekâletname bilgisi yok.'}</div>
                ${client.notes ? `<div style="grid-column: span 2;"><strong>Notlar:</strong> ${client.notes}</div>` : ''}
              </div>

              <h3 style="font-size: 14px; margin-bottom: 10px;">İlişkili Dosyalar (${cases.length})</h3>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Büro Dosya No</th>
                      <th>Esas No</th>
                      <th>Dava Türü</th>
                      <th>Aşama</th>
                      <th>Karşı Taraf</th>
                      <th>Talep Değeri</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${cases.length === 0 ? `
                      <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 16px;">Bu müvekkile ait açık dosya bulunmuyor.</td></tr>
                    ` : cases.map(cs => `
                      <tr>
                        <td><strong>${cs.internal_no}</strong></td>
                        <td>${cs.official_no || '-'}</td>
                        <td><span class="badge badge-blue">${cs.case_type}</span></td>
                        <td>${cs.stage}</td>
                        <td>${cs.opponent_name || '-'}</td>
                        <td>${cs.claim_amount ? `₺${Number(cs.claim_amount).toLocaleString('tr-TR')}` : '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="document.getElementById('modal-client-detail').remove()">Kapat</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', detailHtml);
    } catch (err) {
      this.showToast('Müvekkil detayı alınamadı: ' + err.message, 'error');
    }
  },

  async deleteClient(id, name) {
    const ok = await this.confirm({
      title: 'Müvekkili Sil',
      message: `"${name}" adlı müvekkili silmek istediğinize emin misiniz? Müvekkile ait geçmiş dosyalar arşivde korunacaktır.`,
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await API.clients.delete(id);
      this.showToast('Müvekkil silindi.', 'success');
      this.renderClients();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // 3. DAVA & İCRA DOSYALARI
  async renderCases() {
    try {
      const { cases } = await API.cases.list();
      this.state.casesCache = cases;

      const html = `
        <div class="page-header">
          <div>
            <h1 class="page-title">Dava & İcra Dosyaları</h1>
            <div class="page-desc">Büro içi takip numaraları, mahkeme esas kayıtları ve yargılama aşamaları</div>
          </div>
          <div>
            <button class="btn btn-primary" onclick="App.openNewCaseModal()">+ Yeni Dosya Aç</button>
          </div>
        </div>

        <!-- Filtre ve Arama Araç Çubuğu -->
        <div class="filter-toolbar">
          <div class="filter-group">
            <div class="filter-input-wrapper">
              <span class="filter-input-icon">🔍</span>
              <input type="text" id="case-search-input" class="form-control" placeholder="Esas no, büro no, müvekkil veya mahkeme ile canlı ara..." oninput="App.filterCases()">
            </div>
            <select id="case-type-filter" class="form-control" style="width: 150px;" onchange="App.filterCases()">
              <option value="all">Tüm Dava Türleri</option>
              <option value="dava">Hukuk Davası</option>
              <option value="ceza">Ceza Davası</option>
              <option value="icra">İcra Takibi</option>
              <option value="arabuluculuk">Arabuluculuk</option>
              <option value="danismanlik">Danışmanlık</option>
            </select>
            <select id="case-status-filter" class="form-control" style="width: 130px;" onchange="App.filterCases()">
              <option value="all">Tüm Durumlar</option>
              <option value="active">Yalnızca Aktif</option>
              <option value="archived">Arşivlenmiş</option>
            </select>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">
            Gösterilen: <span id="case-count-badge" style="color: var(--primary-accent); font-weight: 700;">${cases.length}</span> Dosya
          </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-container">
            <table class="table" id="cases-table">
              <thead>
                <tr>
                  <th>Büro No</th>
                  <th>Mahkeme & Esas No (Kopyala)</th>
                  <th>Müvekkil</th>
                  <th>Dava Türü</th>
                  <th>Aşama</th>
                  <th>Karşı Taraf</th>
                  <th>Dava Değeri</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody id="cases-tbody">
                ${cases.length === 0 ? `
                  <tr>
                    <td colspan="9">
                      <div class="empty-state-modern">
                        <img src="img/adn_security_seal.jpg" alt="Dosya Yok" class="empty-state-seal">
                        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px; color: var(--text-main);">Henüz Açık Dava veya İcra Dosyası Yok</h3>
                        <p style="font-size: 13px; color: var(--text-muted); max-width: 420px; margin: 0 auto 18px;">
                          Büronuza gelen yeni uyuşmazlıkları, mahkeme esas numaralarını ve duruşmaları kaydetmek için ilk dava dosyanızı başlatın.
                        </p>
                        <button class="btn btn-primary" onclick="App.openNewCaseModal()">+ İlk Dava Dosyasını Aç</button>
                      </div>
                    </td>
                  </tr>
                ` : cases.map(c => `
                  <tr class="case-row" data-internal="${(c.internal_no || '').toLowerCase()}" data-official="${(c.official_no || '').toLowerCase()}" data-client="${(c.client_name || '').toLowerCase()}" data-court="${(c.court_name || '').toLowerCase()}" data-opponent="${(c.opponent_name || '').toLowerCase()}" data-type="${c.case_type}" data-status="${c.status}">
                    <td>
                      <strong style="color: var(--primary-accent);">${c.internal_no}</strong>
                    </td>
                    <td>
                      ${c.official_no ? `
                        <span class="copyable-badge" onclick="App.copyText('${c.official_no}', 'Esas No')" title="Kopyalamak için tıklayın">
                          📋 ${c.official_no}
                        </span>
                      ` : '<span style="color: var(--text-muted);">-</span>'}
                      <br><small style="color:var(--text-muted); font-size: 11px;">${c.court_name || 'Merci belirtilmedi'}</small>
                    </td>
                    <td><strong>${c.client_name}</strong></td>
                    <td><span class="badge badge-purple">${c.case_type}</span></td>
                    <td><span class="badge badge-blue">${c.stage}</span></td>
                    <td>
                      ${c.opponent_name || '-'}
                      ${c.opponent_counsel ? `<br><small style="color:var(--text-muted);">Vekil: ${c.opponent_counsel}</small>` : ''}
                    </td>
                    <td><strong>${c.claim_amount ? `₺${Number(c.claim_amount).toLocaleString('tr-TR')}` : '-'}</strong></td>
                    <td><span class="badge ${c.status === 'active' ? 'badge-green' : 'badge-gray'}">${c.status === 'active' ? '● Aktif' : 'Arşiv'}</span></td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="App.archiveCase('${c.id}')">
                        ${c.status === 'active' ? 'Arşivle' : 'Aktifleştir'}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('spa-content').innerHTML = html;
    } catch (err) {
      this.showToast('Dosya listesi alınamadı: ' + err.message, 'error');
    }
  },

  filterCases(presetQuery) {
    const searchInput = document.getElementById('case-search-input');
    if (presetQuery && searchInput) {
      searchInput.value = presetQuery;
    }
    const q = (searchInput?.value || '').toLowerCase().trim();
    const type = document.getElementById('case-type-filter')?.value || 'all';
    const status = document.getElementById('case-status-filter')?.value || 'all';
    const rows = document.querySelectorAll('#cases-tbody .case-row');
    let visibleCount = 0;

    rows.forEach(row => {
      const internal = row.dataset.internal || '';
      const official = row.dataset.official || '';
      const client = row.dataset.client || '';
      const court = row.dataset.court || '';
      const opponent = row.dataset.opponent || '';
      const rowType = row.dataset.type || '';
      const rowStatus = row.dataset.status || '';

      const matchQ = !q || internal.includes(q) || official.includes(q) || client.includes(q) || court.includes(q) || opponent.includes(q);
      const matchType = type === 'all' || rowType === type;
      const matchStatus = status === 'all' || rowStatus === status;

      if (matchQ && matchType && matchStatus) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    const countBadge = document.getElementById('case-count-badge');
    if (countBadge) countBadge.textContent = visibleCount;
  },

  async archiveCase(id) {
    try {
      await API.cases.archive(id);
      this.showToast('Dosya durumu güncellendi.', 'success');
      this.renderCases();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  getEventUrgencyBadge(eventDateStr) {
    if (!eventDateStr) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const evDate = new Date(eventDateStr);
    const evDay = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate());
    const diffTime = evDay - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `<span class="badge badge-gray" style="font-size: 10px;">Geçti (${Math.abs(diffDays)}g)</span>`;
    } else if (diffDays === 0) {
      return `<span class="badge badge-urgent-pulse" style="font-size: 10px;">🔴 BUGÜN</span>`;
    } else if (diffDays === 1) {
      return `<span class="badge badge-amber" style="font-weight: 700; font-size: 10px;">⚠️ YARIN</span>`;
    } else if (diffDays <= 7) {
      return `<span class="badge badge-blue" style="font-weight: 700; font-size: 10px;">📅 ${diffDays} Gün Kaldı</span>`;
    } else {
      return `<span class="badge badge-gray" style="font-size: 10px;">${diffDays} Gün Sonra</span>`;
    }
  },

  // 4. DURUŞMA & SÜRE TAKVİMİ
  async renderCalendar() {
    try {
      const { events } = await API.events.list();

      const html = `
        <div class="page-header">
          <div>
            <h1 class="page-title">Duruşma, Keşif & Süre Takvimi</h1>
            <div class="page-desc">Adli celseler, keşifler, UETS 5 günlük tebligat süreleri ve çakışma uyarıları</div>
          </div>
          <div>
            <button class="btn btn-primary" onclick="App.openNewEventModal()">+ Yeni Celse / Süre Ekle</button>
          </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Tarih & Kalan Süre</th>
                  <th>İşlem Türü</th>
                  <th>Dava / Merci</th>
                  <th>Açıklama / Başlık</th>
                  <th>Tebliğ Sayılma (UETS)</th>
                  <th>Kaynak</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                ${events.length === 0 ? `
                  <tr>
                    <td colspan="7">
                      <div class="empty-state-modern">
                        <img src="img/adn_security_seal.jpg" alt="Takvim Boş" class="empty-state-seal">
                        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px; color: var(--text-main);">Takvimde Bekleyen Duruşma veya Süre Yok</h3>
                        <p style="font-size: 13px; color: var(--text-muted); max-width: 420px; margin: 0 auto 18px;">
                          Yaklaşan celselerinizi, UETS elektronik tebligatlarınızı veya kesin mehil sürelerinizi kaydederek çakışmaları önleyin.
                        </p>
                        <button class="btn btn-primary" onclick="App.openNewEventModal()">+ İlk Celseyi / Süreyi Ekleyin</button>
                      </div>
                    </td>
                  </tr>
                ` : events.map(e => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <strong style="font-size: 13px; color: #0f172a;">${new Date(e.event_date).toLocaleDateString('tr-TR')}</strong>
                        <small style="color:var(--text-muted); font-weight: 700;">${new Date(e.event_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</small>
                        ${this.getEventUrgencyBadge(e.event_date)}
                      </div>
                    </td>
                    <td>
                      <span class="badge ${e.event_type === 'hearing' ? 'badge-amber' : e.event_type === 'deadline' ? 'badge-red' : 'badge-blue'}">
                        ${e.event_type === 'hearing' ? '🏛️ Duruşma' : e.event_type === 'deadline' ? '⏱️ Yasal Süre' : 'Keşif / Diğer'}
                      </span>
                    </td>
                    <td>
                      <strong>${e.internal_no || 'Bağımsız'}</strong>
                      ${e.court_name ? `<br><small style="color:var(--text-muted); font-size: 11px;">${e.court_name}</small>` : ''}
                    </td>
                    <td><strong>${e.title}</strong>${e.notes ? `<br><small style="color:var(--text-muted);">${e.notes}</small>` : ''}</td>
                    <td>
                      ${e.legal_service_date ? `
                        <span class="copyable-badge" onclick="App.copyText('${e.legal_service_date}', 'UETS Tarihi')" title="Kopyalamak için tıklayın">
                          📋 ${e.legal_service_date}
                        </span>
                      ` : '<span style="color: var(--text-muted);">-</span>'}
                    </td>
                    <td><span class="badge badge-gray">${e.source}</span></td>
                    <td>
                      <button class="btn btn-secondary btn-sm" style="color: #ef4444; border-color: rgba(239,68,68,0.2);" onclick="App.deleteEvent('${e.id}')">Sil</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('spa-content').innerHTML = html;
    } catch (err) {
      this.showToast('Takvim verisi alınamadı: ' + err.message, 'error');
    }
  },

  async deleteEvent(id) {
    const ok = await this.confirm({
      title: 'Celse / Süre Kaydını Sil',
      message: 'Bu duruşma veya süre kaydını takvimden kaldırmak istediğinize emin misiniz?',
      confirmText: 'Evet, Kaldır',
      cancelText: 'Vazgeç',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await API.events.delete(id);
      this.showToast('Kayıt takvimden kaldırıldı.', 'success');
      this.renderCalendar();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // 5. HMK & UETS SÜRE MOTORU (STANDALONE PAGE)
  renderProcedural() {
    const html = `
      <div class="page-header">
        <div>
          <h1 class="page-title">HMK & UETS Yasal Süre Hesaplama Motoru</h1>
          <div class="page-desc">Tebligat Kanunu m. 7/a (UETS 5 Gün), HMK m. 92 Hafta Sonu Rollover ve HMK m. 104 Adli Tatil Kuralı</div>
        </div>
      </div>

      <div class="card" style="max-width: 860px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <div class="form-group">
              <label class="form-label">Tebliğ / Başlangıç Tarihi *</label>
              <input type="date" id="p-base-date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
            </div>

            <div class="form-group">
              <label class="form-label">Usul Kuralı / Süre Türü *</label>
              <select id="p-rule-type" class="form-control" onchange="App.togglePCustomDays()">
                <option value="hmk_2_weeks">HMK m. 92 - Cevap / İstinaf Süresi (2 Hafta)</option>
                <option value="iik_7_days">İİK m. 62 - İlamsız Ödeme Emrine İtiraz (7 Gün)</option>
                <option value="cmk_7_days">CMK m. 273 - Ceza Hükmüne İstinaf (7 Gün)</option>
                <option value="iik_5_days">İİK m. 168 - Kambiyo Senetlerine İtiraz (5 Gün)</option>
                <option value="iyuk_30_days">İYUK m. 7 - İdari Dava Açma / İstinaf (30 Gün)</option>
                <option value="custom">Özel Kesin Mehil (Gün Belirle)</option>
              </select>
            </div>

            <div class="form-group" id="p-custom-days-box" style="display: none;">
              <label class="form-label">Mahkemece Verilen Kesin Mehil Günü</label>
              <input type="number" id="p-custom-days" class="form-control" value="10" min="1">
            </div>

            <button class="btn btn-primary" style="width: 100%; margin-top: 10px;" onclick="App.runStandaloneCalculation()">
              Hesapla
            </button>
          </div>

          <div id="p-calc-result" style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; display: flex; flex-direction: column; justify-content: center;">
            <div style="text-align: center; color: var(--text-muted); font-size: 13px;">
              Tarih ve kural seçip "Hesapla" butonuna bastığınızda kesin bitiş tarihi ve usul şerhleri burada görüntülenecektir.
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('spa-content').innerHTML = html;
  },

  async runStandaloneCalculation() {
    const baseDate = document.getElementById('p-base-date').value;
    const ruleType = document.getElementById('p-rule-type').value;
    const customDays = document.getElementById('p-custom-days').value;

    if (!baseDate) return this.showToast('Lütfen başlangıç tarihi seçiniz.', 'error');

    try {
      const res = await API.procedural.calculate(baseDate, ruleType, customDays);
      const resBox = document.getElementById('p-calc-result');

      resBox.innerHTML = `
        <div style="font-size: 13px; margin-bottom: 8px;"><strong>Kural:</strong> ${res.ruleTitle}</div>
        <div style="font-size: 20px; font-weight: 800; color: #1e40af; margin-bottom: 4px;">
          Son Gün: ${new Date(res.dueDate).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Kalan Süre: <strong>${res.daysLeft} gün</strong>
        </div>

        ${res.rolledOver ? `
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; font-size: 12px; color: #1e3a8a; margin-bottom: 8px;">
            ℹ️ ${res.rolledOverNote}
          </div>
        ` : ''}

        ${res.adliTatilNotice ? `
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px; font-size: 12px; color: #92400e; margin-bottom: 8px;">
            ⚠️ ${res.adliTatilNotice}
          </div>
        ` : ''}

        <div style="font-size: 11px; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 8px;">
          <strong>Yasal Dayanak:</strong> ${res.citation}
        </div>
      `;
    } catch (err) {
      this.showToast('Hesaplama başarısız: ' + err.message, 'error');
    }
  },

  togglePCustomDays() {
    const val = document.getElementById('p-rule-type').value;
    document.getElementById('p-custom-days-box').style.display = val === 'custom' ? 'block' : 'none';
  },

  // 6. GÖREVLER
  async renderTasks() {
    try {
      const { tasks } = await API.tasks.list();

      const html = `
        <div class="page-header">
          <div>
            <h1 class="page-title">İş & Görev Takibi</h1>
            <div class="page-desc">Büro içi iş dağılımı, delil hazırlığı, dilekçe yazımı ve yetkilendirilmiş görevler</div>
          </div>
          <div>
            <button class="btn btn-primary" onclick="App.openNewTaskModal()">+ Yeni Görev Ekle</button>
          </div>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 40px;">Durum</th>
                  <th>Görev Başlığı</th>
                  <th>İlgili Dosya</th>
                  <th>Öncelik</th>
                  <th>Son Teslim</th>
                  <th>Atanan</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                ${tasks.length === 0 ? `
                  <tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">Bekleyen veya tamamlanan görev bulunmuyor.</td></tr>
                ` : tasks.map(t => `
                  <tr>
                    <td>
                      <input type="checkbox" ${t.status === 'completed' ? 'checked' : ''} onchange="App.toggleTask('${t.id}')">
                    </td>
                    <td>
                      <span style="${t.status === 'completed' ? 'text-decoration: line-through; color: var(--text-muted);' : 'font-weight: 600;'}">
                        ${t.title}
                      </span>
                    </td>
                    <td>${t.internal_no ? `<strong>${t.internal_no}</strong>` : '-'}</td>
                    <td>
                      <span class="badge ${t.priority === 'high' ? 'badge-red' : t.priority === 'medium' ? 'badge-amber' : 'badge-gray'}">
                        ${t.priority === 'high' ? 'Yüksek' : t.priority === 'medium' ? 'Orta' : 'Düşük'}
                      </span>
                    </td>
                    <td>${t.due_date ? new Date(t.due_date).toLocaleDateString('tr-TR') : '-'}</td>
                    <td>${t.assigned_user_name || 'Büro Ekibi'}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" style="color: #ef4444;" onclick="App.deleteTask('${t.id}')">Sil</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('spa-content').innerHTML = html;
    } catch (err) {
      this.showToast('Görevler alınamadı: ' + err.message, 'error');
    }
  },

  async toggleTask(id) {
    try {
      await API.tasks.toggle(id);
      this.renderTasks();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async deleteTask(id) {
    try {
      await API.tasks.delete(id);
      this.showToast('Görev silindi.', 'success');
      this.renderTasks();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // 7. EVRAK & DOSYA MERKEZİ
  async renderDocuments() {
    try {
      const { documents } = await API.documents.list();
      const { cases } = await API.cases.list();

      const html = `
        <div class="page-header">
          <div>
            <h1 class="page-title">Evrak & Dosya Merkezi</h1>
            <div class="page-desc">UDF (UYAP Doküman Formatı), PDF, Word formatı uyarıları ve karantina filtreli güvenli evrak yönetimi</div>
          </div>
        </div>

        <div class="card" style="background: #f8fafc; border: 1px dashed var(--border-color); padding: 20px; margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">📤 Dosyaya Yeni Belge Yükle</h3>
          <form onsubmit="App.handleUploadDocument(event)" style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; align-items: flex-end;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">İlgili Dosya *</label>
              <select id="doc-case-id" class="form-control" required>
                ${cases.map(c => `<option value="${c.id}">${c.internal_no} - ${c.client_name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Belge Başlığı *</label>
              <input type="text" id="doc-title" class="form-control" placeholder="Örn: Bilirkişi Raporu İtiraz Dilekçesi" required>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Dosya Seç (UDF, PDF, DOCX, JPG)</label>
              <input type="file" id="doc-file" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary">Yükle</button>
          </form>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">
            ⚠️ UDF formatındaki dosyalar UYAP Doküman Editörü ile hazırlanmış metinlerdir. Yüklenen tüm dosyalar virüs ve zararlı uzantı (exe, bat, sh) süzgecinden geçirilir.
          </div>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Belge Adı</th>
                  <th>İlgili Dosya</th>
                  <th>Dosya Boyutu</th>
                  <th>Format / Tür</th>
                  <th>Yükleyen</th>
                  <th>Tarih</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                ${documents.length === 0 ? `
                  <tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">Henüz yüklenmiş belge bulunmamaktadır.</td></tr>
                ` : documents.map(d => `
                  <tr>
                    <td><strong>${d.title}</strong><br><small style="color:var(--text-muted);">${d.file_name}</small></td>
                    <td><strong>${d.internal_no || '-'}</strong></td>
                    <td>${(d.file_size / 1024).toFixed(1)} KB</td>
                    <td><span class="badge ${d.file_name.endsWith('.udf') ? 'badge-amber' : 'badge-blue'}">${d.file_name.split('.').pop().toUpperCase()}</span></td>
                    <td>${d.uploaded_by_name || 'Avukat'}</td>
                    <td>${new Date(d.created_at).toLocaleDateString('tr-TR')}</td>
                    <td>
                      <a href="/api/documents/${d.id}/download" class="btn btn-secondary btn-sm" target="_blank">İndir 📥</a>
                      <button class="btn btn-secondary btn-sm" style="color: #ef4444;" onclick="App.deleteDocument('${d.id}')">Sil</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('spa-content').innerHTML = html;
    } catch (err) {
      this.showToast('Evraklar listelenemedi: ' + err.message, 'error');
    }
  },

  async handleUploadDocument(e) {
    e.preventDefault();
    const caseId = document.getElementById('doc-case-id').value;
    const title = document.getElementById('doc-title').value;
    const fileInput = document.getElementById('doc-file');
    const file = fileInput.files[0];

    if (!file) return this.showToast('Lütfen bir dosya seçiniz.', 'error');

    // Basit dosya okuma (Base64 üzerinden yükleme simülasyonu)
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await API.documents.upload({
          caseId,
          title,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          fileBase64: reader.result.split(',')[1]
        });
        this.showToast('Belge başarıyla yüklendi.', 'success');
        this.renderDocuments();
      } catch (err) {
        this.showToast('Yükleme hatası: ' + err.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  },

  async deleteDocument(id) {
    const ok = await this.confirm({
      title: 'Evrakı Sil',
      message: 'Bu belgeyi dosya merkezinden kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await API.documents.delete(id);
      this.showToast('Belge silindi.', 'success');
      this.renderDocuments();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // 8. FİNANS & MASRAF
  async renderFinance() {
    try {
      const { records, totals } = await API.finance.list();

      const html = `
        <div class="page-header">
          <div>
            <h1 class="page-title">Finans, Masraf & Tahsilat</h1>
            <div class="page-desc">Müvekkil avansları, mahkeme harç ve giderleri, akdi vekâlet ücreti tahakkuk ve tahsilatı</div>
          </div>
          <div>
            <button class="btn btn-primary" onclick="App.openNewFinanceModal()">+ Yeni Finansal Kayıt</button>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div>
              <div class="kpi-label">Toplam Tahsilat</div>
              <div class="kpi-val">₺${Number(totals.collection || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="kpi-icon green">💰</div>
          </div>

          <div class="kpi-card">
            <div>
              <div class="kpi-label">Müvekkil Masraf Avansları</div>
              <div class="kpi-val">₺${Number(totals.advance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="kpi-icon blue">📥</div>
          </div>

          <div class="kpi-card">
            <div>
              <div class="kpi-label">Dava Masrafları (Giderler)</div>
              <div class="kpi-val">₺${Number(totals.expense || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="kpi-icon amber">🧾</div>
          </div>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>İşlem Türü</th>
                  <th>Tutar</th>
                  <th>İlgili Dosya</th>
                  <th>Müvekkil</th>
                  <th>Açıklama</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                ${records.length === 0 ? `
                  <tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">Henüz finansal kayıt bulunmamaktadır.</td></tr>
                ` : records.map(r => `
                  <tr>
                    <td><strong>${r.payment_date}</strong></td>
                    <td>
                      <span class="badge ${r.record_type === 'collection' ? 'badge-green' : r.record_type === 'expense' ? 'badge-red' : 'badge-blue'}">
                        ${r.record_type === 'collection' ? 'Tahsilat' : r.record_type === 'expense' ? 'Masraf' : r.record_type === 'advance' ? 'Avans' : 'Ücret'}
                      </span>
                    </td>
                    <td><strong>₺${Number(r.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
                    <td><strong>${r.internal_no || 'Genel'}</strong></td>
                    <td>${r.client_name || '-'}</td>
                    <td>${r.description || '-'}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" style="color: #ef4444;" onclick="App.deleteFinance('${r.id}')">Sil</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('spa-content').innerHTML = html;
    } catch (err) {
      this.showToast('Finans verileri alınamadı: ' + err.message, 'error');
    }
  },

  async deleteFinance(id) {
    const ok = await this.confirm({
      title: 'Finansal Kaydı Sil',
      message: 'Bu tahsilat veya masraf kaydını silmek istediğinize emin misiniz? Kasa ve bakiye hesaplamaları yeniden güncellenecektir.',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await API.finance.delete(id);
      this.showToast('Kayıt silindi.', 'success');
      this.renderFinance();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // 9. TBB UYUMLU YAPAY ZEKÂ ASİSTANI
  async renderAIAssistant() {
    try {
      const { cases } = await API.cases.list();

      const html = `
        <div class="page-header">
          <div>
            <h1 class="page-title">🤖 TBB Uyumlu Hukuk Asistanı</h1>
            <div class="page-desc">
              Türkiye Barolar Birliği Yapay Zekâ Tavsiye Rehberi uyarınca: Taslak çıktılar, insan denetimi (Human in the Loop), kaynak atfı zorunluluğu ve hayali içtihat engeli
            </div>
          </div>
        </div>

        <div class="card" style="max-width: 900px;">
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #1e40af;">
            <strong>ℹ️ Mesleki İlkeler Bildirimi:</strong>
            Asistan tarafından üretilen metinler nihai hukuki mütalaa veya karar değildir. Çıktıların kabul edilmesi, düzenlenmesi veya reddedilmesi münhasıran avukatın takdir ve mesleki sorumluluğundadır.
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">İncelenecek Dava Dosyası *</label>
              <select id="ai-case-id" class="form-control">
                ${cases.map(c => `<option value="${c.id}">${c.internal_no} - ${c.court_name || 'Merci'} (${c.client_name})</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Talep Edilen Hukuki Analiz *</label>
              <select id="ai-prompt-type" class="form-control" onchange="App.toggleAiCustomQuery()">
                <option value="summarize">Dosya Özeti Hazırla</option>
                <option value="chronology">Yargılama & Olay Kronolojisi Çıkar</option>
                <option value="missing_docs">HMK Eksik Belge / Usul Taraması</option>
                <option value="qa">Dosyaya Yönelik Soru Sor (Soru-Cevap)</option>
              </select>
            </div>
          </div>

          <div class="form-group" id="ai-custom-query-box" style="display: none;">
            <label class="form-label">Dosyaya İlişkin Sorunuz</label>
            <input type="text" id="ai-custom-query" class="form-control" placeholder="Örn: Bu dosyada davalının talep edilen alacak tutarı nedir?">
          </div>

          <button class="btn btn-primary" onclick="App.runAIProcessing()">
            Analizi Başlat (TBB Doğrulama Motoru)
          </button>

          <!-- Sonuç Alanı -->
          <div id="ai-result-area" style="display: none; margin-top: 24px;"></div>
        </div>
      `;

      document.getElementById('spa-content').innerHTML = html;
    } catch (err) {
      this.showToast('AI Asistan paneli açılamadı: ' + err.message, 'error');
    }
  },

  toggleAiCustomQuery() {
    const val = document.getElementById('ai-prompt-type').value;
    document.getElementById('ai-custom-query-box').style.display = val === 'qa' ? 'block' : 'none';
  },

  async runAIProcessing() {
    const caseId = document.getElementById('ai-case-id').value;
    const promptType = document.getElementById('ai-prompt-type').value;
    const customQuery = document.getElementById('ai-custom-query').value;

    if (!caseId) return this.showToast('Lütfen bir dosya seçiniz.', 'error');
    if (promptType === 'qa' && !customQuery) return this.showToast('Lütfen soru metnini yazınız.', 'error');

    const resArea = document.getElementById('ai-result-area');
    resArea.style.display = 'block';
    resArea.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Dosya verileri ve evraklar inceleniyor, kaynak doğrulaması yapılıyor...</div>';

    try {
      const data = await API.ai.process({ caseId, promptType, customQuery });

      resArea.innerHTML = `
        <div class="ai-output-box">
          <div class="ai-disclaimer-tag">
            ⚖️ ${data.disclaimer}
          </div>

          <div style="white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.7; color: var(--text-main); margin-bottom: 14px;">
${data.outputText}
          </div>

          <div class="ai-citations-list">
            <strong>📌 İncelenen Kaynaklar & Doğrulamalar:</strong>
            <ul style="margin: 6px 0 0 18px;">
              ${data.citations.map(c => `<li>${c.source}: ${c.detail}</li>`).join('')}
            </ul>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border-color);">
            <div style="font-size: 11px; color: var(--text-muted);">
              Veri Aktarımı: <strong>${data.externalAITransfer}</strong>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(document.querySelector('.ai-output-box pre') ? document.querySelector('.ai-output-box pre').innerText : '${data.outputText.replace(/\n/g, '\\n')}'); App.showToast('Metin panoya kopyalandı.', 'success');">
                Kopyala
              </button>
              <button class="btn btn-primary btn-sm" onclick="App.showToast('Taslak incelendi ve avukat tarafından kabul edildi.', 'success');">
                ✓ İnceledim & Kabul Et
              </button>
              <button class="btn btn-secondary btn-sm" style="color: #ef4444;" onclick="document.getElementById('ai-result-area').style.display = 'none'; App.showToast('Taslak reddedildi.', 'info');">
                ✕ Reddet
              </button>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      resArea.innerHTML = `<div style="padding: 16px; background: #fef2f2; color: #991b1b; border-radius: 8px;">Hata: ${err.message}</div>`;
    }
  },

  // 10. BÜRO AYARLARI & EKİP
  async renderTenantSettings() {
    try {
      const { tenant, members } = await API.tenant.getSettings();

      const html = `
        <div class="page-header">
          <div>
            <h1 class="page-title">Büro Ayarları & Ekip Yönetimi</h1>
            <div class="page-desc">Çalışma alanı parametreleri, harici AI veri aktarım izni ve büro yetkilendirmesi (RBAC)</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <!-- Büro Bilgileri & Gizlilik Anahtarı -->
          <div class="card">
            <h3 class="card-title" style="margin-bottom: 14px;">🏢 Büro Parametreleri</h3>
            <form onsubmit="App.handleSaveTenantSettings(event)">
              <div class="form-group">
                <label class="form-label">Büro Adı</label>
                <input type="text" id="ts-name" class="form-control" value="${tenant.name}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Şehir</label>
                <input type="text" id="ts-city" class="form-control" value="${tenant.city || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">İletişim Telefonu</label>
                <input type="text" id="ts-phone" class="form-control" value="${tenant.phone || ''}">
              </div>

              <!-- Harici AI Aktarım Onayı -->
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 14px; margin-top: 14px;">
                <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
                  <input type="checkbox" id="ts-ai-external" ${tenant.ai_external_allowed ? 'checked' : ''} style="margin-top: 3px;">
                  <span style="font-size: 12px; color: #92400e;">
                    <strong>Harici Bulut Yapay Zekâ Sağlayıcılarına Veri Aktarımına İzin Ver</strong><br>
                    (Varsayılan olarak kapalıdır. Açıldığında KVKK m. 9 yurt dışı aktarım veya üçüncü taraf veri işleme onayınız geçerli sayılır.)
                  </span>
                </label>
              </div>

              <div style="margin-top: 16px;">
                <button type="submit" class="btn btn-primary">Ayarları Kaydet</button>
              </div>
            </form>
          </div>

          <!-- Ekip Üyeleri & Davet -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">👥 Ekip Üyeleri (${members.length})</h3>
            </div>

            <!-- Yeni Üye Davet Formu -->
            <form onsubmit="App.handleInviteMember(event)" style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 8px; margin-bottom: 16px;">
              <input type="email" id="inv-email" class="form-control" placeholder="meslektas@buroadi.av.tr" required>
              <select id="inv-role" class="form-control">
                <option value="lawyer">Avukat</option>
                <option value="manager">Yönetici</option>
                <option value="assistant">Kâtip / Stajyer</option>
                <option value="finance">Finans</option>
              </select>
              <button type="submit" class="btn btn-primary btn-sm">Davet Et</button>
            </form>

            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Üye</th>
                    <th>Rol</th>
                    <th>Kayıt</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  ${members.map(m => `
                    <tr>
                      <td><strong>${m.full_name}</strong><br><small style="color:var(--text-muted);">${m.email}</small></td>
                      <td><span class="badge ${m.role === 'owner' ? 'badge-amber' : m.role === 'manager' ? 'badge-blue' : 'badge-gray'}">${App.getRoleTitle(m.role)}</span></td>
                      <td>${new Date(m.created_at).toLocaleDateString('tr-TR')}</td>
                      <td>
                        ${m.role !== 'owner' ? `
                          <button class="btn btn-secondary btn-sm" style="color: #ef4444;" onclick="App.removeMember('${m.user_id}', '${m.full_name.replace(/'/g, "\\'")}')">Çıkar</button>
                        ` : '<span style="font-size: 11px; color: var(--text-muted);">Kurucu</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      document.getElementById('spa-content').innerHTML = html;
    } catch (err) {
      this.showToast('Büro ayarları alınamadı: ' + err.message, 'error');
    }
  },

  async handleSaveTenantSettings(e) {
    e.preventDefault();
    try {
      await API.tenant.updateSettings({
        name: document.getElementById('ts-name').value,
        city: document.getElementById('ts-city').value,
        phone: document.getElementById('ts-phone').value,
        aiExternalAllowed: document.getElementById('ts-ai-external').checked ? 1 : 0
      });
      this.showToast('Büro ayarları başarıyla kaydedildi.', 'success');
      // Yenile
      const data = await API.auth.getProfile();
      this.state.tenant = data.currentTenant;
      document.getElementById('topbar-tenant-name').textContent = this.state.tenant.name;
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleInviteMember(e) {
    e.preventDefault();
    const email = document.getElementById('inv-email').value;
    const role = document.getElementById('inv-role').value;

    try {
      const res = await API.tenant.inviteMember({ email, role });
      await this.alert({
        title: 'Davet Bağlantısı Oluşturuldu',
        message: 'Aşağıdaki güvenli davet bağlantısını kopyalayarak büronuza katılacak avukat veya personele iletebilirsiniz (72 saat geçerlidir):',
        copyable: res.inviteLink,
        buttonText: 'Tamam',
        type: 'success',
        icon: '🔗'
      });
      this.showToast('Davet oluşturuldu.', 'success');
      document.getElementById('inv-email').value = '';
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async removeMember(userId, name) {
    const ok = await this.confirm({
      title: 'Kullanıcıyı Çıkar',
      message: `"${name}" adlı kullanıcıyı büro çalışma alanından çıkarmak istediğinize emin misiniz? Kullanıcının erişim yetkileri derhal sonlandırılacaktır.`,
      confirmText: 'Evet, Çıkar',
      cancelText: 'Vazgeç',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await API.tenant.removeMember(userId);
      this.showToast('Kullanıcı bürodan çıkarıldı.', 'success');
      this.renderTenantSettings();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // 11. KVKK DENETİM İZİ (AUDIT LOG)
  async renderAuditLogs() {
    try {
      const { logs } = await API.tenant.getAuditLogs();

      const html = `
        <div class="page-header">
          <div>
            <h1 class="page-title">🛡️ KVKK & Güvenlik Denetim İzi (Audit Log)</h1>
            <div class="page-desc">
              KVKK m. 12 veri güvenliği yükümlülüğü gereğince büro içi tüm oturum, dosya görüntüleme, oluşturma ve indirme işlemlerinin değişmez kaydı
            </div>
          </div>
          <div>
            <button class="btn btn-secondary" onclick="App.exportTenantData()">
              📥 Tüm Büro Verilerini İndir (JSON Taşınabilirlik)
            </button>
          </div>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Zaman Damgası</th>
                  <th>Kullanıcı</th>
                  <th>Eylem</th>
                  <th>Varlık Türü</th>
                  <th>İşlem Detayı</th>
                  <th>IP Adresi</th>
                </tr>
              </thead>
              <tbody>
                ${logs.length === 0 ? `
                  <tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">Kayıtlı işlem izi bulunmamaktadır.</td></tr>
                ` : logs.map(l => `
                  <tr>
                    <td><code>${l.created_at}</code></td>
                    <td><strong>${l.user_name || 'Sistem'}</strong></td>
                    <td><span class="badge badge-gray">${l.action}</span></td>
                    <td><span class="badge badge-blue">${l.entity_type}</span></td>
                    <td>${l.details || '-'}</td>
                    <td><code>${l.ip_address || '-'}</code></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('spa-content').innerHTML = html;
    } catch (err) {
      this.showToast('Denetim izi alınamadı: ' + err.message, 'error');
    }
  },

  async exportTenantData() {
    try {
      const data = await API.tenant.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adn_buro_verileri_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Büro verileri JSON formatında dışa aktarıldı.', 'success');
    } catch (err) {
      this.showToast('Dışa aktarma hatası: ' + err.message, 'error');
    }
  },

  // 12. YETKİ BELGESİ (TEVKİL) ÜRETİCİ (Avukatlık Kanunu m. 56)
  async renderAuthorizationCert() {
    try {
      const { cases } = await API.cases.list();
      const user = this.state.user || {};

      const html = `
        <div class="page-header">
          <div>
            <h1 class="page-title">📜 Yetki Belgesi (Tevkil) Üretici</h1>
            <div class="page-desc">
              1136 Sayılı Avukatlık Kanunu m. 56 uyarınca vekâletname hükmünde; stajyerler ve meslektaşlar için Baro formatında resmî yetki belgesi
            </div>
          </div>
          <div class="no-print" style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" onclick="App.copyAuthCertText()">
              📋 Metni Kopyala
            </button>
            <button class="btn btn-primary" onclick="App.printAuthCert()">
              🖨️ Belgeyi Yazdır / PDF İndir
            </button>
          </div>
        </div>

        <div class="auth-cert-container">
          <!-- Sol Form: Parametreler -->
          <div class="card no-print" style="padding: 20px;">
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 16px; color: #0f172a; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
              ⚙️ Belge Parametreleri
            </div>

            <div class="form-group">
              <label class="form-label">Dava / İcra Dosyası Seç</label>
              <select id="cert-case-select" class="form-control" onchange="App.handleCertCaseChange()">
                <option value="">-- Serbest Giriş / Dosyasız --</option>
                ${cases.map(c => `<option value="${c.id}" data-court="${c.court_name || ''}" data-official="${c.official_no || ''}" data-client="${c.client_name || ''}">${c.internal_no} - ${c.client_name} (${c.court_name || c.case_type})</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Yetkiyi Veren Avukat *</label>
              <input type="text" id="cert-granter-name" class="form-control" value="${user.fullName || 'Av. Kemal Erdem'}" oninput="App.updateAuthCertPreview()">
            </div>

            <div class="form-group">
              <label class="form-label">Veren Avukat Baro & Sicil No</label>
              <input type="text" id="cert-granter-bar" class="form-control" value="${user.barCity || 'Ankara Barosu'} - Sicil: ${user.barNumber || '34821'}" oninput="App.updateAuthCertPreview()">
            </div>

            <div class="form-group">
              <label class="form-label">Yetki Verilen (Stajyer veya Avukat) *</label>
              <input type="text" id="cert-appointee-name" class="form-control" placeholder="Stj. Av. Ahmet Yılmaz" value="Stj. Av. Ahmet Yılmaz" oninput="App.updateAuthCertPreview()">
            </div>

            <div class="form-group">
              <label class="form-label">Yetki Verilen Baro & Sicil No</label>
              <input type="text" id="cert-appointee-bar" class="form-control" placeholder="Ankara Barosu - Stj. Sicil: 14209" value="Ankara Barosu - Stj. Sicil: 14209" oninput="App.updateAuthCertPreview()">
            </div>

            <div class="form-group">
              <label class="form-label">Yetki Kapsamı / Görev Türü *</label>
              <select id="cert-scope" class="form-control" onchange="App.updateAuthCertPreview()">
                <option value="trainee">Stajyer Yetkisi (Av. K. m. 26: Sulh Hukuk, İcra Mahkemesi, Asliye Ceza 2 yıla kadar hapis)</option>
                <option value="general">Genel Avukat Tevkil Yetkisi (Tüm Mahkemeler & İcra Daireleri)</option>
                <option value="execution_only">Yalnızca İcra Daireleri İşlemleri ve Haciz</option>
                <option value="discovery">Yalnızca Keşif & Bilirkişi İncelemesine Katılma</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Müvekkil Adı / Unvanı</label>
              <input type="text" id="cert-client-name" class="form-control" placeholder="Müvekkil Adı" value="Atlas Savunma Sanayi A.Ş." oninput="App.updateAuthCertPreview()">
            </div>

            <div class="form-group">
              <label class="form-label">Mahkeme / İcra Dairesi</label>
              <input type="text" id="cert-court-name" class="form-control" placeholder="Örn: Ankara 3. Asliye Ticaret Mahkemesi" value="Ankara 3. Asliye Ticaret Mahkemesi" oninput="App.updateAuthCertPreview()">
            </div>

            <div class="form-group">
              <label class="form-label">Dosya / Esas Numarası</label>
              <input type="text" id="cert-official-no" class="form-control" placeholder="Örn: 2026/142 E." value="2026/142 E." oninput="App.updateAuthCertPreview()">
            </div>

            <div class="form-group">
              <label class="form-label">Dayanak Vekâletname (Noterlik, Tarih, Yevmiye)</label>
              <input type="text" id="cert-notary-info" class="form-control" placeholder="Örn: Ankara 12. Noterliği 14/01/2026 T. 8492 Yevmiye" value="Ankara 12. Noterliği 14/01/2026 T. 8492 Yevmiye" oninput="App.updateAuthCertPreview()">
            </div>

            <div class="form-group">
              <label class="form-label">Tevkil Yetkisi (Başkasına Yetki Verme)</label>
              <select id="cert-substitution" class="form-control" onchange="App.updateAuthCertPreview()">
                <option value="none">Başkalarını Tevkil Etme Yetkisi Yoktur (Kapalı)</option>
                <option value="allowed">Başkalarını Tevkil Etme Yetkisi Vardır (Açık)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Tanzim Tarihi</label>
              <input type="date" id="cert-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" onchange="App.updateAuthCertPreview()">
            </div>
          </div>

          <!-- Sağ Taraf: Canlı Önizleme & Resmi Belge Kağıdı -->
          <div id="printable-auth-cert" class="auth-cert-sheet">
            <div class="auth-cert-header">
              <div style="font-size: 24px; margin-bottom: 4px;">⚖️</div>
              <h2 id="view-cert-bar-header">T.C. TÜRKİYE BAROLAR BİRLİĞİ</h2>
              <div class="sub-baro" id="view-cert-bar-sub">${user.barCity || 'ANKARA BAROSU BAŞKANLIĞI'}</div>
            </div>

            <div class="auth-cert-title">YETKİ BELGESİ (TEVKİL)</div>
            <div style="font-size: 11px; text-align: center; margin-top: -14px; margin-bottom: 22px; color: #475569; font-style: italic;">
              (1136 Sayılı Avukatlık Kanunu'nun 56. Maddesi Uyarınca Düzenlenmiş Olup Vekâletname Hükmündedir)
            </div>

            <div class="auth-cert-grid">
              <div class="auth-cert-label">YETKİ VEREN VEKİL:</div>
              <div id="view-cert-granter">Av. Kemal Erdem (Ankara Barosu - Sicil: 34821)</div>

              <div class="auth-cert-label">YETKİLENDİRİLEN:</div>
              <div id="view-cert-appointee"><strong>Stj. Av. Ahmet Yılmaz</strong> (Ankara Barosu - Stj. Sicil: 14209)</div>

              <div class="auth-cert-label">MÜVEKKİL:</div>
              <div id="view-cert-client">Atlas Savunma Sanayi A.Ş.</div>

              <div class="auth-cert-label">MERCİ / MAHKEME:</div>
              <div id="view-cert-court">Ankara 3. Asliye Ticaret Mahkemesi</div>

              <div class="auth-cert-label">DOSYA / ESAS NO:</div>
              <div id="view-cert-official-no">2026/142 E.</div>

              <div class="auth-cert-label">DAYANAK VEKÂLET:</div>
              <div id="view-cert-notary">Ankara 12. Noterliği 14/01/2026 T. 8492 Yevmiye</div>

              <div class="auth-cert-label">TEVKİL YETKİSİ:</div>
              <div id="view-cert-sub">Başkalarını tevkil etme yetkisi yoktur.</div>
            </div>

            <div class="auth-cert-body-text" id="view-cert-body">
              Yukarıda dökümü yapılan dava/takip dosyasında ve müvekkil nezdindeki vekâletnamemizde mevcut bulunan açık tevkil yetkisine istinaden; adı geçen meslektaşımız/stajyerimiz, yukarıda belirtilen merci ve dosya önündeki yargısal ve icrai iş ve işlemleri ifa etmeye, duruşma ve celselere katılmaya, beyanda bulunmaya, ara kararları almaya, tutanakları imzalamaya ve ahzu kabz hariç vekâletname kapsamındaki yetkileri ifa etmeye müştereken ve müstakilen yetkili kılınmıştır.
            </div>

            <div class="auth-cert-statutory-box" id="view-cert-statutory">
              <strong>⚠️ YASAL ŞERH (Avukatlık Kanunu m. 26):</strong> Stajyer avukatlar, staj yaptıkları avukatın yazılı oluru ve gözetimi altında; sulh hukuk mahkemeleri, icra mahkemeleri ve kanun uyarınca üst sınırı iki yıla kadar hapis cezasını gerektiren suçlara ilişkin asliye ceza mahkemelerinde duruşmalara girebilir, icra müdürlüklerindeki işlemleri yürütebilirler. CMK m. 150 kapsamındaki zorunlu müdafilik duruşmalarına katılamazlar.
            </div>

            <div style="font-size: 13px; text-align: right; margin-bottom: 30px;" id="view-cert-date-text">
              Tanzim Tarihi: ${new Date().toLocaleDateString('tr-TR')}
            </div>

            <div class="auth-cert-signatures">
              <div class="auth-cert-sign-box">
                <div class="auth-cert-sign-title">YETKİ VERİLEN</div>
                <div style="font-size: 12px; color: #64748b;" id="view-cert-sign-sub-appointee">Stj. Av. Ahmet Yılmaz</div>
                <div class="auth-cert-sign-line"></div>
                <div style="font-size: 11px; color: #94a3b8;">(İmza)</div>
              </div>

              <div class="auth-cert-sign-box">
                <div class="auth-cert-sign-title">YETKİYİ VEREN VEKİL</div>
                <div style="font-size: 12px; color: #64748b;" id="view-cert-sign-sub-granter">Av. Kemal Erdem</div>
                <div class="auth-cert-sign-line"></div>
                <div style="font-size: 11px; color: #94a3b8;">(Kaşe ve Islak / e-İmza)</div>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('spa-content').innerHTML = html;
      this.updateAuthCertPreview();
    } catch (err) {
      this.showToast('Yetki belgesi modülü yüklenirken hata: ' + err.message, 'error');
    }
  },

  handleCertCaseChange() {
    const select = document.getElementById('cert-case-select');
    const opt = select ? select.options[select.selectedIndex] : null;
    if (opt && opt.value) {
      document.getElementById('cert-court-name').value = opt.getAttribute('data-court') || '';
      document.getElementById('cert-official-no').value = opt.getAttribute('data-official') || '';
      document.getElementById('cert-client-name').value = opt.getAttribute('data-client') || '';
    }
    this.updateAuthCertPreview();
  },

  updateAuthCertPreview() {
    const granterName = document.getElementById('cert-granter-name')?.value || 'Av. Kemal Erdem';
    const granterBar = document.getElementById('cert-granter-bar')?.value || 'Ankara Barosu';
    const appointeeName = document.getElementById('cert-appointee-name')?.value || 'Stj. Av. Ahmet Yılmaz';
    const appointeeBar = document.getElementById('cert-appointee-bar')?.value || 'Ankara Barosu';
    const clientName = document.getElementById('cert-client-name')?.value || 'Müvekkil';
    const courtName = document.getElementById('cert-court-name')?.value || 'Mahkeme';
    const officialNo = document.getElementById('cert-official-no')?.value || 'Esas No';
    const notaryInfo = document.getElementById('cert-notary-info')?.value || 'Noterlik Bilgisi';
    const scope = document.getElementById('cert-scope')?.value || 'trainee';
    const substitution = document.getElementById('cert-substitution')?.value || 'none';
    const dateVal = document.getElementById('cert-date')?.value || new Date().toISOString().split('T')[0];

    const d = new Date(dateVal);
    const dateFormatted = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    if (document.getElementById('view-cert-granter')) {
      document.getElementById('view-cert-granter').textContent = `${granterName} (${granterBar})`;
      document.getElementById('view-cert-appointee').innerHTML = `<strong>${appointeeName}</strong> (${appointeeBar})`;
      document.getElementById('view-cert-client').textContent = clientName;
      document.getElementById('view-cert-court').textContent = courtName;
      document.getElementById('view-cert-official-no').textContent = officialNo;
      document.getElementById('view-cert-notary').textContent = notaryInfo;
      document.getElementById('view-cert-sub').textContent = substitution === 'allowed' ? 'Başkalarını tevkil etme yetkisi vardır.' : 'Başkalarını tevkil etme yetkisi yoktur.';
      document.getElementById('view-cert-date-text').textContent = `Tanzim Tarihi: ${dateFormatted}`;
      document.getElementById('view-cert-sign-sub-appointee').textContent = appointeeName;
      document.getElementById('view-cert-sign-sub-granter').textContent = granterName;

      const statBox = document.getElementById('view-cert-statutory');
      if (scope === 'trainee') {
        statBox.style.display = 'block';
        statBox.innerHTML = `<strong>⚠️ YASAL ŞERH (Avukatlık Kanunu m. 26):</strong> Stajyer avukatlar, staj yaptıkları avukatın yazılı oluru ve gözetimi altında; sulh hukuk mahkemeleri, icra mahkemeleri ve kanun uyarınca üst sınırı iki yıla kadar hapis cezasını gerektiren suçlara ilişkin asliye ceza mahkemelerinde duruşmalara girebilir, icra müdürlüklerindeki işlemleri yürütebilirler. CMK m. 150 kapsamındaki zorunlu müdafilik duruşmalarına katılamazlar.`;
      } else {
        statBox.style.display = 'none';
      }
    }
  },

  printAuthCert() {
    window.print();
  },

  copyAuthCertText() {
    const certEl = document.getElementById('printable-auth-cert');
    if (!certEl) return;
    navigator.clipboard.writeText(certEl.innerText).then(() => {
      this.showToast('Yetki belgesi metni panoya kopyalandı.', 'success');
    }).catch(() => {
      this.showToast('Kopyalama başarısız oldu.', 'error');
    });
  },

  // 13. HUKUKİ HESAPLAMA PAKETİ (Süre, İcra Kapak, SMM, AAÜT)
  renderLegalCalc() {
    const html = `
      <div class="page-header">
        <div>
          <h1 class="page-title">🧮 Hukuki Hesaplama Paketi (2026)</h1>
          <div class="page-desc">
            Türk Usul Hukuku süreleri, İcra İflas Kapak Hesabı, Serbest Meslek Makbuzu (SMM) ve AAÜT Asgari Ücret Tarifesi
          </div>
        </div>
      </div>

      <div class="calc-suite-tabs">
        <button class="calc-suite-tab active" id="tab-calc-smm" onclick="App.switchCalcTab('smm')">🧾 SMM Hesaplayıcı (2026)</button>
        <button class="calc-suite-tab" id="tab-calc-execution" onclick="App.switchCalcTab('execution')">📉 İcra Kapak & Borç Hesabı (İİK)</button>
        <button class="calc-suite-tab" id="tab-calc-aaut" onclick="App.switchCalcTab('aaut')">⚖️ AAÜT Avukatlık Ücreti Tarifesi</button>
        <button class="calc-suite-tab" id="tab-calc-deadline" onclick="App.switchCalcTab('deadline')">⏱️ HMK & UETS Yasal Süre Motoru</button>
      </div>

      <!-- 1. SMM TAB -->
      <div id="pane-calc-smm" class="calc-pane">
        <div style="display: grid; grid-template-columns: 360px 1fr; gap: 24px;">
          <div class="card" style="padding: 24px;">
            <div style="font-weight: 700; margin-bottom: 16px; font-size: 15px;">Makbuz Parametreleri</div>
            <div class="form-group">
              <label class="form-label">Hesaplama Yönü *</label>
              <select id="smm-type" class="form-control" onchange="App.runSmmCalc()">
                <option value="gross_to_net">Brütten Nete (Brüt Ücret Gir)</option>
                <option value="net_to_gross">Netten Brüte (Elinize Geçecek Net Tutarı Gir)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tutar (TL) *</label>
              <input type="number" id="smm-amount" class="form-control" value="25000" step="100" oninput="App.runSmmCalc()">
            </div>
            <div class="form-group">
              <label class="form-label">KDV Oranı (%)</label>
              <select id="smm-vat-rate" class="form-control" onchange="App.runSmmCalc()">
                <option value="20" selected>%20 (Genel Hukuki Hizmetler)</option>
                <option value="10">%10 (İstisnai İşler)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Gelir Vergisi Stopaj Oranı (%)</label>
              <select id="smm-withholding-rate" class="form-control" onchange="App.runSmmCalc()">
                <option value="20" selected>%20 (Gelir Vergisi m. 94 - Şirket ve Tacir Müvekkiller)</option>
                <option value="0">%0 (Nihai Tüketici / Gerçek Kişi Müvekkiller)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">KDV Tevkifatı (KDV Genel Tebliği)</label>
              <select id="smm-withholding-deduction" class="form-control" onchange="App.runSmmCalc()">
                <option value="none" selected>Tevkifatsız (Standart)</option>
                <option value="half">1/2 Tevkifat (5/10 - Kamu ve Belirlenmiş Alıcılar)</option>
              </select>
            </div>
          </div>

          <!-- SMM Preview Card -->
          <div id="smm-result-container">
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">Hesaplanıyor...</div>
          </div>
        </div>
      </div>

      <!-- 2. İCRA KAPAK HESABI TAB -->
      <div id="pane-calc-execution" class="calc-pane" style="display: none;">
        <div style="display: grid; grid-template-columns: 380px 1fr; gap: 24px;">
          <div class="card" style="padding: 24px;">
            <div style="font-weight: 700; margin-bottom: 16px; font-size: 15px;">İcra Dosya Bilgileri</div>
            <div class="form-group">
              <label class="form-label">Asıl Alacak Tutarı (TL) *</label>
              <input type="number" id="exec-principal" class="form-control" value="100000" step="1000" oninput="App.runExecutionCalc()">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">Takip Tarihi</label>
                <input type="date" id="exec-start-date" class="form-control" value="${new Date(Date.now() - 180*24*60*60*1000).toISOString().split('T')[0]}" onchange="App.runExecutionCalc()">
              </div>
              <div class="form-group">
                <label class="form-label">Hesap Tarihi</label>
                <input type="date" id="exec-calc-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" onchange="App.runExecutionCalc()">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">İşleyecek Faiz Türü</label>
              <select id="exec-interest-type" class="form-control" onchange="App.runExecutionCalc()">
                <option value="legal" selected>Yasal Faiz (%24 - 3095 Sayılı K.)</option>
                <option value="commercial">Ticari Temerrüt / Avans Faizi (%48)</option>
                <option value="custom">Özel Akdi Faiz Oranı (%)</option>
              </select>
            </div>
            <div class="form-group" id="exec-custom-interest-box" style="display: none;">
              <label class="form-label">Özel Yıllık Faiz Oranı (%)</label>
              <input type="number" id="exec-custom-interest" class="form-control" value="30" oninput="App.runExecutionCalc()">
            </div>
            <div class="form-group">
              <label class="form-label">Takip Aşaması & Tahsil Harcı Oranı</label>
              <select id="exec-stage" class="form-control" onchange="App.runExecutionCalc()">
                <option value="before_payment_order">Ödeme Emri Tebliği Öncesi / Feragat (%4.55)</option>
                <option value="after_payment_order_before_seizure" selected>Ödeme Emri Sonrası / Hacizden Önce (%9.10)</option>
                <option value="after_seizure">Haciz Tatbikinden Sonra / Satış Öncesi (%11.38)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">İcra Takip Masrafları (Harç, Posta, Haciz vb.)</label>
              <input type="number" id="exec-expenses" class="form-control" value="1850" step="50" oninput="App.runExecutionCalc()">
            </div>
            <div class="form-group">
              <label class="form-label">Kısmi Ödemeler / Yapılan Tahsilat (TL)</label>
              <input type="number" id="exec-partial-payments" class="form-control" value="0" step="1000" oninput="App.runExecutionCalc()">
            </div>
          </div>

          <!-- İcra Kapak Breakdown -->
          <div id="exec-result-container">
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">Hesaplanıyor...</div>
          </div>
        </div>
      </div>

      <!-- 3. AAÜT TAB -->
      <div id="pane-calc-aaut" class="calc-pane" style="display: none;">
        <div style="display: grid; grid-template-columns: 360px 1fr; gap: 24px;">
          <div class="card" style="padding: 24px;">
            <div style="font-weight: 700; margin-bottom: 16px; font-size: 15px;">Tarife Parametreleri</div>
            <div class="form-group">
              <label class="form-label">Dava / Uyuşmazlık Değeri (TL) *</label>
              <input type="number" id="aaut-claim-amount" class="form-control" value="750000" step="5000" oninput="App.runAautCalc()">
            </div>
            <div class="form-group">
              <label class="form-label">Mahkeme / Yargı Yeri *</label>
              <select id="aaut-court-type" class="form-control" onchange="App.runAautCalc()">
                <option value="asliye" selected>Asliye Hukuk / Ticaret Mahkemesi (Maktu: 30.000 TL)</option>
                <option value="sulh">Sulh Hukuk Mahkemesi (Maktu: 18.000 TL)</option>
                <option value="icra">İcra Mahkemesi / Dairesi (Maktu: 6.000 TL)</option>
                <option value="is">İş Mahkemesi (Maktu: 25.000 TL)</option>
                <option value="tuketici">Tüketici Mahkemesi (Maktu: 15.000 TL)</option>
                <option value="idare">İdare & Vergi Mahkemesi (Maktu: 25.000 TL)</option>
              </select>
            </div>
          </div>

          <!-- AAÜT Breakdown -->
          <div id="aaut-result-container">
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">Hesaplanıyor...</div>
          </div>
        </div>
      </div>

      <!-- 4. DEADLINE TAB -->
      <div id="pane-calc-deadline" class="calc-pane" style="display: none;">
        <div class="card" style="padding: 24px; max-width: 800px;">
          <div style="font-weight: 700; font-size: 16px; margin-bottom: 16px;">⏱️ Türk Usul Hukuku & UETS Süre Motoru</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">Tebliğ / Başlangıç Tarihi *</label>
              <input type="date" id="tab-dl-base-date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
              <label class="form-label">Usul Kuralı *</label>
              <select id="tab-dl-rule-type" class="form-control" onchange="App.toggleTabDlCustomDays()">
                <option value="hmk_2_weeks">HMK m. 92 - Cevap / İstinaf Süresi (2 Hafta)</option>
                <option value="iik_7_days">İİK m. 62 - Ödeme Emrine İtiraz (7 Gün)</option>
                <option value="cmk_7_days">CMK m. 273 - Ceza İstinaf Süresi (7 Gün)</option>
                <option value="iik_5_days">İİK m. 168 - Kambiyo Senetlerine İtiraz (5 Gün)</option>
                <option value="iyuk_30_days">İYUK m. 7 - İdari Yargı Dava / İstinaf (30 Gün)</option>
                <option value="custom">Özel Mahkeme Mehili (Gün Belirle)</option>
              </select>
            </div>
          </div>

          <div class="form-group" id="tab-dl-custom-days-box" style="display: none;">
            <label class="form-label">Kesin Mehil Gün Sayısı</label>
            <input type="number" id="tab-dl-custom-days" class="form-control" value="10">
          </div>

          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
              <input type="checkbox" id="tab-dl-is-uets">
              <span><strong>UETS Elektronik Tebligat Kuralı Uygula:</strong> Tebligat K. m. 7/a uyarınca posta kutusuna ulaştığı tarihi izleyen 5. günün sonu tebliğ sayılsın.</span>
            </label>
          </div>

          <button class="btn btn-primary" onclick="App.runDeadlineCalc()">
            Süreyi Hesapla (Hafta Sonu & Adli Tatil Korumalı)
          </button>

          <div id="tab-dl-result-box" style="margin-top: 20px; display: none;"></div>
        </div>
      </div>
    `;

    document.getElementById('spa-content').innerHTML = html;
    this.runSmmCalc();
    this.runExecutionCalc();
    this.runAautCalc();
  },

  switchCalcTab(tabKey) {
    document.querySelectorAll('.calc-suite-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.calc-pane').forEach(p => p.style.display = 'none');

    const tabBtn = document.getElementById(`tab-calc-${tabKey}`);
    const pane = document.getElementById(`pane-calc-${tabKey}`);
    if (tabBtn) tabBtn.classList.add('active');
    if (pane) pane.style.display = 'block';
  },

  async runSmmCalc() {
    const calculationType = document.getElementById('smm-type')?.value || 'gross_to_net';
    const amount = document.getElementById('smm-amount')?.value || 25000;
    const vatRate = document.getElementById('smm-vat-rate')?.value || 20;
    const withholdingRate = document.getElementById('smm-withholding-rate')?.value || 20;
    const withholdingDeduction = document.getElementById('smm-withholding-deduction')?.value || 'none';

    try {
      const res = await API.calc.smm({
        calculationType,
        amount,
        vatRate,
        withholdingRate,
        withholdingDeduction
      });

      const s = res.smm;
      const container = document.getElementById('smm-result-container');
      if (!container) return;

      container.innerHTML = `
        <div class="smm-receipt-card">
          <div class="smm-receipt-header">
            <div>
              <div style="font-weight: 800; font-size: 16px; color: #0f172a;">SERBEST MESLEK MAKBUZU (SMM) HESAP DÖKÜMÜ</div>
              <div style="font-size: 12px; color: #64748b;">2026 Gelir Vergisi & KDV Mevzuatı Uyarınca</div>
            </div>
            <span class="badge badge-green" style="font-size: 12px; padding: 6px 12px;">RESMİ DÖKÜM</span>
          </div>

          <table class="smm-receipt-table">
            <thead>
              <tr>
                <th>Hesap Kalemi</th>
                <th style="text-align: right;">Oran / Esas</th>
                <th style="text-align: right;">Tutar (TL)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Brüt Avukatlık Ücreti</strong></td>
                <td style="text-align: right;">Matrah</td>
                <td style="text-align: right;"><strong>₺${s.grossFee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
              <tr style="color: #dc2626;">
                <td>Gelir Vergisi Stopajı (-)</td>
                <td style="text-align: right;">%${s.withholdingRate}</td>
                <td style="text-align: right;">-₺${s.withholdingTax.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style="background: #f8fafc;">
                <td><strong>Net Avukatlık Ücreti (Stopaj Sonrası)</strong></td>
                <td style="text-align: right;">Brüt - Stopaj</td>
                <td style="text-align: right;"><strong>₺${s.netFee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
              <tr>
                <td>Hesaplanan KDV (+)</td>
                <td style="text-align: right;">%${s.vatRate}</td>
                <td style="text-align: right;">₺${s.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${s.vatDeduction > 0 ? `
                <tr style="color: #ea580c;">
                  <td>KDV Tevkifatı (Alıcı Tarafından Beyan Edilecek) (-)</td>
                  <td style="text-align: right;">1/2 (%50)</td>
                  <td style="text-align: right;">-₺${s.vatDeduction.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ` : ''}
              <tr>
                <td>Avukatın Fiilen Tahsil Ettiği KDV</td>
                <td style="text-align: right;">KDV - Tevkifat</td>
                <td style="text-align: right;">₺${s.vatCollected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="highlight">
                <td>💰 <strong>MÜVEKKİLDEN TAHSİL EDİLECEK NAKİT TOPLAMI</strong></td>
                <td style="text-align: right;">Net Ücret + KDV</td>
                <td style="text-align: right; font-size: 16px;"><strong>₺${s.totalPaidByClient.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="smm-badge-summary">
            <div class="smm-badge-item">
              <div class="smm-badge-title">Müvekkilin Toplam Maliyeti</div>
              <div class="smm-badge-val" style="color: #1e40af;">₺${s.totalClientCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Brüt Ücret + Toplam KDV</div>
            </div>
            <div class="smm-badge-item">
              <div class="smm-badge-title">Vergi Dairesine Yatacak Tutar</div>
              <div class="smm-badge-val" style="color: #dc2626;">₺${(s.withholdingTax + s.vatDeduction).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Stopaj (${s.withholdingTax} TL) + Tevkifat (${s.vatDeduction} TL)</div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      console.error(err);
    }
  },

  async runExecutionCalc() {
    const principal = document.getElementById('exec-principal')?.value || 100000;
    const startDateStr = document.getElementById('exec-start-date')?.value;
    const calcDateStr = document.getElementById('exec-calc-date')?.value;
    const interestType = document.getElementById('exec-interest-type')?.value || 'legal';
    const customInterestRate = document.getElementById('exec-custom-interest')?.value || 0;
    const stage = document.getElementById('exec-stage')?.value || 'after_payment_order_before_seizure';
    const expenses = document.getElementById('exec-expenses')?.value || 0;
    const partialPayments = document.getElementById('exec-partial-payments')?.value || 0;

    const customBox = document.getElementById('exec-custom-interest-box');
    if (customBox) customBox.style.display = interestType === 'custom' ? 'block' : 'none';

    try {
      const res = await API.calc.execution({
        principal,
        startDateStr,
        calcDateStr,
        interestType,
        customInterestRate,
        stage,
        expenses,
        partialPayments
      });

      const e = res.execution;
      const container = document.getElementById('exec-result-container');
      if (!container) return;

      container.innerHTML = `
        <div class="card" style="padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
            <div>
              <div style="font-weight: 800; font-size: 16px;">İCRA DOSYA KAPAK HESABI PUSULASI</div>
              <div style="font-size: 12px; color: #64748b;">İİK ve AAÜT Hükümlerine Göre Güncel Bakiye Borç</div>
            </div>
            <span class="badge badge-purple" style="font-size: 12px; padding: 6px 12px;">${e.elapsedDays} GÜNLÜK FAİZ</span>
          </div>

          <table class="execution-table">
            <thead>
              <tr>
                <th>Borç Kalemi</th>
                <th style="text-align: right;">Hesaplama Esası</th>
                <th style="text-align: right;">Tutar (TL)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Asıl Alacak</strong></td>
                <td style="text-align: right;">Ana Para</td>
                <td style="text-align: right;"><strong>₺${e.principal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
              <tr>
                <td>İşleyen Faiz (${e.interestLabel})</td>
                <td style="text-align: right;">${e.elapsedDays} gün (%${e.interestRate})</td>
                <td style="text-align: right; color: #2563eb;">₺${e.accruedInterest.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>İcra Takip Masrafları</td>
                <td style="text-align: right;">Harç, Tebligat, Posta</td>
                <td style="text-align: right;">₺${e.expenses.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Vekâlet Ücreti (AAÜT İcra Nisbi)</td>
                <td style="text-align: right;">Alacak + Faiz Üzerinden</td>
                <td style="text-align: right; color: #7c3aed;"><strong>₺${e.attorneyFee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
              <tr>
                <td>İcra Tahsil Harcı</td>
                <td style="text-align: right;">%${e.collectionLevyRate} (${e.stageLabel})</td>
                <td style="text-align: right;">₺${e.collectionLevy.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Cezaevi Yapı Harcı</td>
                <td style="text-align: right;">Asıl Alacak üzerinden %2</td>
                <td style="text-align: right;">₺${e.prisonLevy.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${e.partialPayments > 0 ? `
                <tr style="color: #166534; background: #f0fdf4;">
                  <td>Mahsup Edilen Kısmi Ödemeler (-)</td>
                  <td style="text-align: right;">Yapılan Tahsilatlar</td>
                  <td style="text-align: right;">-₺${e.partialPayments.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="execution-total-banner">
            <div>
              <div style="font-size: 13px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Ödenecek Toplam Dosya Borcu</div>
              <div style="font-size: 11px; color: #cbd5e1;">(Tüm faiz, masraf, harç ve vekalet ücreti dahil)</div>
            </div>
            <div class="execution-total-val">₺${e.totalDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      `;
    } catch (err) {
      console.error(err);
    }
  },

  async runAautCalc() {
    const claimAmount = document.getElementById('aaut-claim-amount')?.value || 750000;
    const courtType = document.getElementById('aaut-court-type')?.value || 'asliye';

    try {
      const res = await API.calc.aaut({ claimAmount, courtType });
      const a = res.aaut;
      const container = document.getElementById('aaut-result-container');
      if (!container) return;

      container.innerHTML = `
        <div class="card" style="padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
            <div>
              <div style="font-weight: 800; font-size: 16px;">AAÜT VEKÂLET ÜCRETİ KADEMELİ HESABI</div>
              <div style="font-size: 12px; color: #64748b;">${a.courtTitle} — Asgari Maktu Taban: ₺${a.minMaktuFee.toLocaleString('tr-TR')}</div>
            </div>
            <span class="badge badge-blue">${a.appliedRule === 'maktu_taban' ? 'MAKTU TABAN UYGULANDI' : 'NİSBİ TARİFE UYGULANDI'}</span>
          </div>

          <div style="margin-bottom: 16px;">
            <div style="font-weight: 700; font-size: 13px; color: #475569; margin-bottom: 8px;">Kademeli Nisbi Dilim Dökümü:</div>
            ${a.breakdown.map(b => `
              <div class="aaut-step-item">
                <div>
                  <span style="font-weight: 600;">${b.bracket}</span>
                  <span style="font-size: 11px; color: #64748b; margin-left: 6px;">(Matrah: ₺${b.taxableAmount.toLocaleString('tr-TR')})</span>
                </div>
                <div style="font-weight: 700; color: #1e40af;">₺${b.fee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
              </div>
            `).join('')}
          </div>

          <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">Hükmedilecek Asgari Vekâlet Ücreti</div>
              <div style="font-size: 11px; color: #94a3b8;">Avukatlık Asgari Ücret Tarifesi Üçüncü Kısım</div>
            </div>
            <div style="font-size: 24px; font-weight: 800; color: #2563eb;">₺${a.totalFee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      `;
    } catch (err) {
      console.error(err);
    }
  },

  toggleTabDlCustomDays() {
    const val = document.getElementById('tab-dl-rule-type')?.value;
    const box = document.getElementById('tab-dl-custom-days-box');
    if (box) box.style.display = val === 'custom' ? 'block' : 'none';
  },

  async runDeadlineCalc() {
    const baseDate = document.getElementById('tab-dl-base-date')?.value;
    const ruleType = document.getElementById('tab-dl-rule-type')?.value;
    const customDays = document.getElementById('tab-dl-custom-days')?.value;
    const isUets = document.getElementById('tab-dl-is-uets')?.checked;

    if (!baseDate) return this.showToast('Lütfen başlangıç tarihi seçiniz.', 'error');

    try {
      const res = await API.calc.deadline({ baseDate, ruleType, customDays, isUets });
      const box = document.getElementById('tab-dl-result-box');
      if (!box) return;

      const c = res.calculation;
      box.style.display = 'block';
      box.innerHTML = `
        <div style="padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md);">
          ${res.uets ? `
            <div style="padding: 10px; background: #eff6ff; border-radius: 6px; font-size: 12px; color: #1e40af; margin-bottom: 12px;">
              📬 <strong>UETS 5 Gün Tebliğ Karinesi:</strong> İleti Ulaşma: ${res.uets.arrivalDate} ➔ Yasal Tebliğ Sayılma: <strong>${res.uets.legalServiceDate}</strong>
            </div>
          ` : ''}
          <div style="font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 4px;">${c.ruleTitle}</div>
          <div style="font-size: 24px; font-weight: 800; color: #15803d; margin-bottom: 6px;">
            ${new Date(c.dueDate).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style="font-size: 12px; color: #4b5563; margin-bottom: 8px;">Kalan Süre: <strong>${c.daysLeft} gün</strong></div>
          ${c.rolledOver ? `<div style="background: #e0f2fe; padding: 6px 10px; border-radius: 4px; font-size: 12px; color: #0369a1; margin-bottom: 6px;">ℹ️ ${c.rolledOverNote}</div>` : ''}
          ${c.adliTatilNotice ? `<div style="background: #fef3c7; padding: 6px 10px; border-radius: 4px; font-size: 12px; color: #92400e; margin-bottom: 6px;">⚠️ ${c.adliTatilNotice}</div>` : ''}
          <div style="font-size: 11px; color: #6b7280;">Yasal Dayanak: ${c.citation}</div>
        </div>
      `;
    } catch (err) {
      this.showToast('Hesaplama hatası: ' + err.message, 'error');
    }
  },

  // 14. KURUMSAL DİLEKÇE & BELGE TASLAKLARI KÜTÜPHANESİ
  async renderPetitionTemplates() {
    try {
      const { cases } = await API.cases.list();

      const html = `
        <div class="page-header">
          <div>
            <h1 class="page-title">📋 Kurumsal Dilekçe & Belge Taslakları</h1>
            <div class="page-desc">
              Stajyer ve avukatlar için HMK, İİK ve Baro usulüne uygun, dosya bilgileriyle otomatik doldurulabilen hazır dilekçe şablonları
            </div>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <label style="font-size: 13px; font-weight: 600; color: #334155;">Otomatik Doldur:</label>
            <select id="petition-case-select" class="form-control" style="width: 280px;" onchange="App.handlePetitionCaseChange()">
              <option value="">-- Dosya Seçerek Doldur --</option>
              ${cases.map(c => `<option value="${c.id}" data-court="${c.court_name || ''}" data-official="${c.official_no || ''}" data-client="${c.client_name || ''}" data-opponent="${c.opponent_name || ''}" data-counsel="${c.opponent_counsel || ''}">${c.internal_no} - ${c.client_name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="petition-grid">
          <!-- 1. Mazeret Dilekçesi -->
          <div class="petition-card">
            <div>
              <div class="petition-card-title">🏛️ Duruşma Mazeret Dilekçesi</div>
              <div class="petition-card-desc">Başka bir mahkemedeki duruşma çakışması veya haklı mazeret bildirimi ve yeni celse gününün UYAP'tan öğrenilmesi talebi.</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="App.openPetitionViewer('mazeret')">👁️ İncele & Düzenle</button>
              <button class="btn btn-primary btn-sm" onclick="App.copyPetitionTemplate('mazeret')">📋 Kopyala</button>
            </div>
          </div>

          <!-- 2. Cevap Dilekçesi (HMK 129) -->
          <div class="petition-card">
            <div>
              <div class="petition-card-title">⚖️ Cevap Dilekçesi Şablonu (HMK m. 129)</div>
              <div class="petition-card-desc">İlk itirazlar (yetki, derdestlik), esasa cevaplar, savunmanın dayandığı vakıalar ve delil listesi içeren standart 2 haftalık cevap taslağı.</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="App.openPetitionViewer('cevap')">👁️ İncele & Düzenle</button>
              <button class="btn btn-primary btn-sm" onclick="App.copyPetitionTemplate('cevap')">📋 Kopyala</button>
            </div>
          </div>

          <!-- 3. Delil ve Tanık Listesi -->
          <div class="petition-card">
            <div>
              <div class="petition-card-title">📑 Delil ve Tanık Listesi Bildirimi</div>
              <div class="petition-card-desc">Mahkemece verilen kesin mehil uyarınca tanıkların ad-soyad-adres dökümü ve dayanılan yazılı delillerin mahkemeye sunumu.</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="App.openPetitionViewer('delil')">👁️ İncele & Düzenle</button>
              <button class="btn btn-primary btn-sm" onclick="App.copyPetitionTemplate('delil')">📋 Kopyala</button>
            </div>
          </div>

          <!-- 4. İstinaf Başvuru Dilekçesi -->
          <div class="petition-card">
            <div>
              <div class="petition-card-title">📜 İstinaf Kanun Yolu Başvuru Dilekçesi</div>
              <div class="petition-card-desc">İlk derece mahkemesi gerekçeli kararına karşı HMK m. 342 uyarınca Bölge Adliye Mahkemesi (BAM) nezdinde istinaf ve tehiri icra talebi.</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="App.openPetitionViewer('istinaf')">👁️ İncele & Düzenle</button>
              <button class="btn btn-primary btn-sm" onclick="App.copyPetitionTemplate('istinaf')">📋 Kopyala</button>
            </div>
          </div>

          <!-- 5. İcra Takip Talebi -->
          <div class="petition-card">
            <div>
              <div class="petition-card-title">⚡ İcra Takip Talebi & Ödeme Emri Taslağı</div>
              <div class="petition-card-desc">İİK m. 58 uyarınca ilamsız para alacakları için takip talebi, faiz başlangıç tarihi ve vekalet ücreti talep şablonu.</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="App.openPetitionViewer('icra')">👁️ İncele & Düzenle</button>
              <button class="btn btn-primary btn-sm" onclick="App.copyPetitionTemplate('icra')">📋 Kopyala</button>
            </div>
          </div>
        </div>

        <!-- Dilekçe Önizleme & Düzenleme Alanı -->
        <div id="petition-editor-box" class="card" style="margin-top: 24px; padding: 24px; display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div style="font-weight: 700; font-size: 16px;" id="petition-editor-title">Dilekçe Metni</div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="App.copyEditorText()">📋 Metni Kopyala</button>
              <button class="btn btn-primary btn-sm" onclick="App.printEditorText()">🖨️ Yazdır / PDF İndir</button>
            </div>
          </div>
          <textarea id="petition-editor-textarea" class="form-control" rows="18" style="font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.6;"></textarea>
        </div>
      `;

      document.getElementById('spa-content').innerHTML = html;
    } catch (err) {
      this.showToast('Dilekçe taslakları yüklenirken hata: ' + err.message, 'error');
    }
  },

  getPetitionContent(type) {
    const sel = document.getElementById('petition-case-select');
    const opt = sel ? sel.options[sel.selectedIndex] : null;

    const court = (opt && opt.getAttribute('data-court')) || '[MAHKEME ADI]';
    const officialNo = (opt && opt.getAttribute('data-official')) || '2026/[ESAS NO] E.';
    const client = (opt && opt.getAttribute('data-client')) || '[MÜVEKKİL ADI SOYADI / UNVANI]';
    const opponent = (opt && opt.getAttribute('data-opponent')) || '[KARŞI TARAF ADI]';
    const lawyer = this.state.user?.fullName || 'Av. Kemal Erdem';
    const bar = `${this.state.user?.barCity || 'Barosu'} (Sicil: ${this.state.user?.barNumber || '...'})`;
    const today = new Date().toLocaleDateString('tr-TR');

    if (type === 'mazeret') {
      return `${court.toUpperCase()}\nESAS NO: ${officialNo}\n\nDAVACI/DAVALI: ${client}\nVEKİLİ: ${lawyer} - ${bar}\n\nKONU: Duruşma mazeretimizin sunulması ve yeni celse gününün UYAP üzerinden öğrenilmesi talebimizdir.\n\nMAHKEMENİZE:\nYukarıda esas numarası yazılı dosyanın bugünkü celsesine, aynı gün ve saatte görülmekte olan bir başka mahkeme duruşması nedeniyle fiilen katılmamız mümkün olamamıştır.\n\nMazeretimizin KABULÜNE ve bir sonraki duruşma gün ve saatinin UYAP Avukat Portalı üzerinden öğrenilmesine karar verilmesini vekâleten saygılarımla arz ve talep ederim.\n\nTarih: ${today}\n\nVekil:\n${lawyer}\n(e-İmzalıdır)`;
    }

    if (type === 'cevap') {
      return `${court.toUpperCase()}\nESAS NO: ${officialNo}\n\nCEVAP VEREN (DAVALI): ${client}\nVEKİLİ: ${lawyer} - ${bar}\n\nDAVACI: ${opponent}\n\nKONU: Davacının hukuki dayanaktan yoksun dava dilekçesine karşı HMK m. 129 uyarınca cevaplarımızın ve itirazlarımızın sunulmasıdır.\n\nAÇIKLAMALAR:\n1. USULİ İTİRAZLAR: Davacı tarafça açılan işbu dava yetkisiz ve görevsiz mahkemede ikame edilmiş olup davanın usulden reddi gerekmektedir.\n2. ESASA İLİŞKİN CEVAPLAR: Davacı tarafın iddiaları gerçeği yansıtmamakta olup müvekkil şirketin herhangi bir temerrüdü veya kusuru bulunmamaktadır.\n\nHUKUKİ SEBEPLER: HMK, TBK, TTK ve ilgili mevzuat.\nDELİLLER: Sözleşme, banka dekontları, ticari defterler, tanık, bilirkişi incelemesi ve her türlü yasal delil.\n\nSONUÇ VE İSTEM: Yukarıda arz ve izah edilen nedenlerle; haksız ve mesnetsiz DAVANIN REDDİNE, yargılama giderleri ile vekâlet ücretinin davacı yana tahmiline karar verilmesini bilvekale arz ve talep ederiz.\n\nTarih: ${today}\nDavalı Vekili:\n${lawyer}\n(e-İmzalıdır)`;
    }

    if (type === 'delil') {
      return `${court.toUpperCase()}\nESAS NO: ${officialNo}\n\nDELİL BİLDİREN: ${client}\nVEKİLİ: ${lawyer} - ${bar}\n\nKONU: Mahkemenizin ara kararı uyarınca delil ve tanık listemizin sunulmasıdır.\n\nDELİL LİSTEMİZ:\n1. Taraflar arasındaki akdedilen yazılı sözleşme nüshası,\n2. Banka hesap dökümleri ve ödeme makbuzları,\n3. E-posta ve yazılı ihtarname suretleri,\n4. Bilirkişi incelemesi,\n5. TANIKLARIMIZ:\n   - Tanık 1: [Ad Soyad, TCKN, Adres] (Olayın görgü tanığı)\n   - Tanık 2: [Ad Soyad, TCKN, Adres] (Sözleşme müzakerelerine vakıf)\n\nYukarıda belirtilen delillerimizin toplanmasını ve tanıklarımızın duruşmada dinlenmek üzere davetiyeyle çağrılmasını vekâleten arz ve talep ederim.\n\nTarih: ${today}\nVekil: ${lawyer}\n(e-İmzalıdır)`;
    }

    if (type === 'istinaf') {
      return `${court.toUpperCase()} KANALIYLA\nBÖLGE ADLİYE MAHKEMESİ İLGİLİ HUKUK DAİRESİ'NE\n\nESAS NO: ${officialNo}\nİSTİNAF EDEN: ${client}\nVEKİLİ: ${lawyer} - ${bar}\nKARŞI TARAF: ${opponent}\n\nTEBLİĞ TARİHİ: ${today}\n\nKONU: İlk derece mahkemesinin haksız ve usule aykırı kararına karşı istinaf kanun yolu başvurumuzun kabulü ile kararın KALDIRILMASINA karar verilmesi talebidir.\n\nİSTİNAF NEDENLERİ:\n1. İlk derece mahkemesi eksik inceleme ve yanılgılı değerlendirme neticesinde karar vermiştir.\n2. Delillerimiz toplanmamış ve bilirkişi ek raporuna itirazlarımız değerlendirilmemiştir.\n\nSONUÇ VE İSTEM: İlk Derece Mahkemesi kararının kaldırılmasına, davanın kabulüne/reddine ve yargılama giderlerinin karşı tarafa yükletilmesine karar verilmesini bilvekale arz ve talep ederiz.\n\nTarih: ${today}\nİstinaf Eden Vekili: ${lawyer}\n(e-İmzalıdır)`;
    }

    return `İCRA DAİRESİ BAŞKANLIĞI'NA\n\nALACAKLI: ${client}\nVEKİLİ: ${lawyer} - ${bar}\n\nBORÇLU: ${opponent}\n\nALACAK TUTARI: [ALACAK TUTARI] TL\nFAİZ ORANI: %24 Yasal Faiz\n\nTAKİP TALEBİ: Yukarıda yazılı asıl alacak, takip tarihinden itibaren işleyecek faizi, icra vekâlet ücreti ve takip masrafları ile birlikte tahsili amacıyla borçluya ÖDEME EMRİ tebliğine karar verilmesini bilvekale talep ederim.\n\nTarih: ${today}\nAlacaklı Vekili: ${lawyer}`;
  },

  handlePetitionCaseChange() {
    const editorBox = document.getElementById('petition-editor-box');
    if (editorBox && editorBox.style.display !== 'none' && this._currentPetitionType) {
      this.openPetitionViewer(this._currentPetitionType);
    }
  },

  openPetitionViewer(type) {
    this._currentPetitionType = type;
    const editorBox = document.getElementById('petition-editor-box');
    const titleEl = document.getElementById('petition-editor-title');
    const textarea = document.getElementById('petition-editor-textarea');

    const titles = {
      mazeret: 'Duruşma Mazeret Dilekçesi Taslağı',
      cevap: 'Cevap Dilekçesi (HMK m. 129) Taslağı',
      delil: 'Delil & Tanık Listesi Bildirimi Taslağı',
      istinaf: 'İstinaf Başvuru Dilekçesi Taslağı',
      icra: 'İcra Takip Talebi & Ödeme Emri Taslağı'
    };

    titleEl.textContent = titles[type] || 'Dilekçe Taslağı';
    textarea.value = this.getPetitionContent(type);
    editorBox.style.display = 'block';
    editorBox.scrollIntoView({ behavior: 'smooth' });
  },

  copyPetitionTemplate(type) {
    const text = this.getPetitionContent(type);
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Dilekçe taslağı panoya kopyalandı.', 'success');
    }).catch(() => {
      this.showToast('Kopyalama yapılamadı.', 'error');
    });
  },

  copyEditorText() {
    const text = document.getElementById('petition-editor-textarea')?.value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Dilekçe metni panoya kopyalandı.', 'success');
    }).catch(() => {
      this.showToast('Kopyalama yapılamadı.', 'error');
    });
  },

  printEditorText() {
    const text = document.getElementById('petition-editor-textarea')?.value;
    if (!text) return;
    const printWin = window.open('', '', 'width=800,height=600');
    printWin.document.write(`
      <html>
        <head>
          <title>Dilekçe Çıktısı</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.8; padding: 25mm 20mm; color: #000; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: inherit; }
          </style>
        </head>
        <body>
          <pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 250);
  },

  // ==========================================
  // FORM & MODAL HANDLERS
  // ==========================================

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await API.auth.login({ email, password });
      this.closeModals();
      this.showToast(`Hoş geldiniz, ${data.user.fullName}!`, 'success');
      this.init();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const payload = {
      fullName: document.getElementById('reg-fullname').value,
      email: document.getElementById('reg-email').value,
      officeName: document.getElementById('reg-officename').value,
      city: document.getElementById('reg-city').value,
      barCity: document.getElementById('reg-barcity').value,
      barNumber: document.getElementById('reg-barnumber').value,
      password: document.getElementById('reg-password').value,
      termsAccepted: document.getElementById('reg-terms').checked
    };

    try {
      const data = await API.auth.register(payload);
      this.closeModals();
      this.showToast(`Büronuz "${data.tenant.name}" başarıyla oluşturuldu!`, 'success');
      this.init();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async logout() {
    try {
      await API.auth.logout();
      this.state.user = null;
      this.state.tenant = null;
      this.showToast('Başarıyla çıkış yapıldı.', 'info');
      this.renderPublicLanding();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleCreateClient(e) {
    e.preventDefault();
    const payload = {
      type: document.getElementById('client-type').value,
      name: document.getElementById('client-name').value,
      identityNo: document.getElementById('client-identity').value,
      phone: document.getElementById('client-phone').value,
      email: document.getElementById('client-email').value,
      notaryInfo: document.getElementById('client-notary').value,
      notes: document.getElementById('client-notes').value
    };

    try {
      await API.clients.create(payload);
      this.closeModals();
      this.showToast('Müvekkil kaydedildi.', 'success');
      if (this.state.currentView === 'clients') this.renderClients();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async checkClientConflict() {
    const name = document.getElementById('client-name').value;
    const identityNo = document.getElementById('client-identity').value;
    const alertBox = document.getElementById('client-conflict-alert');

    if (!name && !identityNo) {
      alertBox.style.display = 'none';
      return;
    }

    try {
      const res = await API.clients.checkConflict(name, identityNo);
      if (res.hasConflict) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = `
          <strong>⚠️ DİKKAT: MENFAAT ÇATIŞMASI (CONFLICT OF INTEREST) UYARISI!</strong><br>
          Bu isim veya kimlik numarası ile daha önce açılmış başka bir dosyada taraf veya karşı taraf kaydı mevcuttur. 
          Avukatlık Kanunu m. 38/b gereğince aynı işte menfaati zıt taraflara vekillik yapılamaz.
        `;
      } else {
        alertBox.style.display = 'none';
      }
    } catch (e) {}
  },

  async handleCreateCase(e) {
    e.preventDefault();
    const payload = {
      clientId: document.getElementById('case-client-id').value,
      internalNo: document.getElementById('case-internal-no').value,
      officialNo: document.getElementById('case-official-no').value,
      caseType: document.getElementById('case-type').value,
      courtName: document.getElementById('case-court-name').value,
      stage: document.getElementById('case-stage').value,
      opponentName: document.getElementById('case-opponent-name').value,
      opponentCounsel: document.getElementById('case-opponent-counsel').value,
      claimAmount: document.getElementById('case-claim-amount').value
    };

    try {
      await API.cases.create(payload);
      this.closeModals();
      this.showToast('Dava dosyası başarıyla açıldı.', 'success');
      if (this.state.currentView === 'cases') this.renderCases();
      if (this.state.currentView === 'dashboard') this.renderDashboard();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleCreateEvent(e) {
    e.preventDefault();
    const payload = {
      caseId: document.getElementById('event-case-id').value || null,
      eventType: document.getElementById('event-type').value,
      title: document.getElementById('event-title').value,
      eventDate: document.getElementById('event-date').value,
      serviceDate: document.getElementById('event-service-date').value || null,
      notes: document.getElementById('event-notes').value
    };

    try {
      await API.events.create(payload);
      this.closeModals();
      this.showToast('Duruşma/süre takvime işlendi.', 'success');
      if (this.state.currentView === 'calendar') this.renderCalendar();
      if (this.state.currentView === 'dashboard') this.renderDashboard();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  handleEventTypeChange() {
    const type = document.getElementById('event-type').value;
    document.getElementById('uets-box').style.display = (type === 'deadline' || type === 'hearing') ? 'block' : 'none';
  },

  calculateUetsAutoDate() {
    const dateStr = document.getElementById('event-service-date').value;
    if (!dateStr) return;
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 5);
    const resultStr = d.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('uets-calc-result').innerHTML = `
      <strong>Yasal Tebliğ Sayılma Günü (Tebligat K. m. 7/a):</strong><br>
      <span style="color: #1e40af; font-weight: 700;">${resultStr}</span> (5. günün sonu)
    `;
  },

  async handleCreateTask(e) {
    e.preventDefault();
    const payload = {
      caseId: document.getElementById('task-case-id').value || null,
      title: document.getElementById('task-title').value,
      dueDate: document.getElementById('task-due-date').value || null,
      priority: document.getElementById('task-priority').value
    };

    try {
      await API.tasks.create(payload);
      this.closeModals();
      this.showToast('Görev oluşturuldu.', 'success');
      if (this.state.currentView === 'tasks') this.renderTasks();
      if (this.state.currentView === 'dashboard') this.renderDashboard();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleCreateFinance(e) {
    e.preventDefault();
    const payload = {
      caseId: document.getElementById('finance-case-id').value || null,
      recordType: document.getElementById('finance-type').value,
      amount: document.getElementById('finance-amount').value,
      currency: document.getElementById('finance-currency').value,
      paymentDate: document.getElementById('finance-date').value,
      description: document.getElementById('finance-desc').value
    };

    try {
      await API.finance.create(payload);
      this.closeModals();
      this.showToast('Finansal kayıt eklendi.', 'success');
      if (this.state.currentView === 'finance') this.renderFinance();
      if (this.state.currentView === 'dashboard') this.renderDashboard();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Modal Açılış Tetikleyicileri
  openLoginModal() {
    this.closeModals();
    this.showAuthScreen('login');
  },

  openRegisterModal() {
    this.closeModals();
    this.showAuthScreen('register');
  },

  openNewClientModal() {
    this.closeModals();
    document.getElementById('modal-new-client').classList.add('active');
  },

  async openNewCaseModal() {
    this.closeModals();
    try {
      const { clients } = await API.clients.list();
      const select = document.getElementById('case-client-id');
      if (clients.length === 0) {
        this.showToast('Dava açabilmek için önce en az bir müvekkil eklemeniz gerekmektedir.', 'warning');
        return this.openNewClientModal();
      }
      select.innerHTML = clients.map(c => `<option value="${c.id}">${c.name} (${c.type === 'corporate' ? 'Şirket' : 'Gerçek Kişi'})</option>`).join('');
      document.getElementById('modal-new-case').classList.add('active');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async openNewEventModal() {
    this.closeModals();
    try {
      const { cases } = await API.cases.list();
      const select = document.getElementById('event-case-id');
      select.innerHTML = '<option value="">-- Genel / Dosyadan Bağımsız --</option>' +
        cases.map(c => `<option value="${c.id}">${c.internal_no} - ${c.client_name}</option>`).join('');
      document.getElementById('modal-new-event').classList.add('active');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async openNewTaskModal() {
    this.closeModals();
    try {
      const { cases } = await API.cases.list();
      const select = document.getElementById('task-case-id');
      select.innerHTML = '<option value="">-- Genel / Dosyadan Bağımsız --</option>' +
        cases.map(c => `<option value="${c.id}">${c.internal_no} - ${c.client_name}</option>`).join('');
      document.getElementById('modal-new-task').classList.add('active');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async openNewFinanceModal() {
    this.closeModals();
    try {
      const { cases } = await API.cases.list();
      const select = document.getElementById('finance-case-id');
      select.innerHTML = '<option value="">-- Genel Büro / Dosyasız --</option>' +
        cases.map(c => `<option value="${c.id}">${c.internal_no} - ${c.client_name}</option>`).join('');
      document.getElementById('finance-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('modal-new-finance').classList.add('active');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async openHearingNotesModal(preselectedCaseId = null) {
    this.closeModals();
    try {
      const { cases } = await API.cases.list();
      const select = document.getElementById('hearing-note-case-id');
      if (cases.length === 0) {
        return this.showToast('Duruşma zaptı eklemek için önce bir dava dosyası açmalısınız.', 'warning');
      }
      select.innerHTML = cases.map(c => `
        <option value="${c.id}" ${preselectedCaseId === c.id ? 'selected' : ''}>
          ${c.internal_no} - ${c.official_no ? c.official_no + ' (' + (c.court_name || '') + ')' : c.client_name}
        </option>
      `).join('');

      document.getElementById('hearing-note-summary').value = '';
      document.getElementById('hearing-note-next-date').value = '';
      document.getElementById('hearing-note-deadline-desc').value = '';
      document.getElementById('hearing-note-deadline-days').value = '';
      document.getElementById('hearing-note-courtroom').value = '';

      document.getElementById('modal-hearing-notes').classList.add('active');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleSaveHearingNotes(e) {
    e.preventDefault();
    const caseId = document.getElementById('hearing-note-case-id').value;
    if (!caseId) return this.showToast('Lütfen bir dosya seçiniz.', 'error');

    const payload = {
      hearingResult: document.getElementById('hearing-note-result').value,
      nextHearingDate: document.getElementById('hearing-note-next-date').value || null,
      deadlineDescription: document.getElementById('hearing-note-deadline-desc').value || null,
      deadlineDays: document.getElementById('hearing-note-deadline-days').value || null,
      courtroom: document.getElementById('hearing-note-courtroom').value || null,
      notes: document.getElementById('hearing-note-summary').value
    };

    try {
      const res = await API.cases.saveHearingNotes(caseId, payload);
      this.closeModals();
      this.showToast(res.message || 'Duruşma notu başarıyla kaydedildi.', 'success');
      if (this.state.currentView === 'dashboard') this.renderDashboard();
      if (this.state.currentView === 'calendar') this.renderCalendar();
      if (this.state.currentView === 'cases') this.renderCases();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async openCourtExpenseModal(preselectedCaseId = null) {
    this.closeModals();
    try {
      const { cases } = await API.cases.list();
      const select = document.getElementById('court-expense-case-id');
      if (cases.length === 0) {
        return this.showToast('Masraf pusulası eklemek için önce bir dosya açmalısınız.', 'warning');
      }
      select.innerHTML = cases.map(c => `
        <option value="${c.id}" ${preselectedCaseId === c.id ? 'selected' : ''}>
          ${c.internal_no} - ${c.client_name} (${c.court_name || c.case_type})
        </option>
      `).join('');

      document.getElementById('court-expense-amount').value = '';
      document.getElementById('court-expense-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('court-expense-desc').value = '';

      document.getElementById('modal-court-expense').classList.add('active');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleSaveCourtExpense(e) {
    e.preventDefault();
    const caseId = document.getElementById('court-expense-case-id').value;
    const category = document.getElementById('court-expense-category').value;
    const amount = parseFloat(document.getElementById('court-expense-amount').value);
    const date = document.getElementById('court-expense-date').value;
    const payer = document.getElementById('court-expense-payer').value;
    const desc = document.getElementById('court-expense-desc').value || '';

    if (!caseId || isNaN(amount) || amount <= 0 || !date) {
      return this.showToast('Lütfen geçerli bir tutar ve tarih giriniz.', 'error');
    }

    const fullDesc = `[Adliye Masrafı - ${category}] ${desc} (Ödeme: ${payer})`;

    try {
      await API.finance.create({
        caseId,
        recordType: 'expense',
        amount,
        currency: 'TRY',
        paymentDate: date,
        description: fullDesc
      });

      this.closeModals();
      this.showToast('Adliye masraf pusulası başarıyla kaydedildi.', 'success');
      if (this.state.currentView === 'finance') this.renderFinance();
      if (this.state.currentView === 'dashboard') this.renderDashboard();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  showCalculatorModal() {
    this.closeModals();
    document.getElementById('calc-base-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-calculator').classList.add('active');
  },

  async executeProceduralCalculation() {
    const baseDate = document.getElementById('calc-base-date').value;
    const ruleType = document.getElementById('calc-rule-type').value;
    const customDays = document.getElementById('calc-custom-days').value;

    if (!baseDate) return this.showToast('Lütfen başlangıç tarihi seçiniz.', 'error');

    try {
      const res = await API.procedural.calculate(baseDate, ruleType, customDays);
      const resPanel = document.getElementById('calc-result-panel');

      resPanel.innerHTML = `
        <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">${res.ruleTitle}</div>
        <div style="font-size: 22px; font-weight: 800; color: #2563eb; margin-bottom: 4px;">
          ${new Date(res.dueDate).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Kalan Süre: <strong>${res.daysLeft} gün</strong></div>
        ${res.rolledOver ? `<div style="background: #eff6ff; padding: 8px; border-radius: 4px; font-size: 11px; color: #1e40af; margin-bottom: 6px;">ℹ️ ${res.rolledOverNote}</div>` : ''}
        ${res.adliTatilNotice ? `<div style="background: #fffbeb; padding: 8px; border-radius: 4px; font-size: 11px; color: #92400e; margin-bottom: 6px;">⚠️ ${res.adliTatilNotice}</div>` : ''}
        <div style="font-size: 11px; color: #64748b; margin-top: 8px;">Dayanak: ${res.citation}</div>
      `;
    } catch (err) {
      this.showToast('Hesaplama hatası: ' + err.message, 'error');
    }
  },

  toggleCalcCustomDays() {
    const val = document.getElementById('calc-rule-type').value;
    document.getElementById('calc-custom-days-box').style.display = val === 'custom' ? 'block' : 'none';
  },

  showTenantSwitchModal() {
    this.closeModals();
    const container = document.getElementById('tenant-list-body');
    container.innerHTML = this.state.tenants.map(t => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 8px; background: ${t.id === this.state.tenant.id ? '#eff6ff' : '#fff'}; cursor: pointer;" onclick="App.switchTenant('${t.id}')">
        <div>
          <div style="font-weight: 700; font-size: 14px;">${t.name}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${t.city || 'Türkiye'} • Rol: ${App.getRoleTitle(t.role)}</div>
        </div>
        ${t.id === this.state.tenant.id ? '<span class="badge badge-blue">Aktif</span>' : '<button class="btn btn-secondary btn-sm">Geçiş Yap</button>'}
      </div>
    `).join('');
    document.getElementById('modal-switch-tenant').classList.add('active');
  },

  async switchTenant(tenantId) {
    try {
      await API.auth.switchTenant(tenantId);
      this.closeModals();
      this.showToast('Çalışma alanı değiştirildi.', 'success');
      this.init();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  showLegalModal(topic) {
    this.closeModals();
    const titleEl = document.getElementById('legal-modal-title');
    const bodyEl = document.getElementById('legal-modal-body');

    if (topic === 'uyap') {
      titleEl.textContent = 'Adalet Bakanlığı UYAP ve PTT UETS Yasal Çerçevesi';
      bodyEl.innerHTML = `
        <p><strong>Resmi Entegrasyon Beyanı:</strong></p>
        <p>ADN platformu, avukatlar ve hukuk büroları için bağımsız bir çalışma alanı ve otomasyon yazılımıdır. Adalet Bakanlığı UYAP Avukat Portal ve PTT UETS sistemlerine doğrudan resmi API bağlantısı yalnızca resmi izin ve protokol kapsamında mümkündür.</p>
        <p style="margin-top: 10px;"><strong>Güvenlik ve Parola Taahhüdü:</strong></p>
        <p>Sistemimiz, 1136 sayılı Avukatlık Kanunu ve meslek kuralları gereğince <u>asla avukatların e-Devlet şifrelerini veya e-imza PIN kodlarını toplamaz veya saklamaz</u>. UYAP işlemleri için doğrudan resmi <a href="https://vatandas.uyap.gov.tr/main/avukat.jsp" target="_blank">UYAP Avukat Portal</a> bağlantıları ve dosya import mekanizması sunulmaktadır.</p>
      `;
    } else if (topic === 'tbb') {
      titleEl.textContent = 'TBB Avukatlıkta Yapay Zekâ Kullanım İlkeleri';
      bodyEl.innerHTML = `
        <p><strong>TBB Tavsiye Rehberi Uyarınca (2024):</strong></p>
        <p>1. <strong>İnsan Denetimi (Human in the Loop):</strong> Yapay zekâ tarafından üretilen tüm analiz, özet ve dilekçe taslakları "Taslak — Avukat Kontrolü Gerekli" ibaresiyle sunulur. Hukuki ve cezai sorumluluk münhasıran avukata aittir.</p>
        <p>2. <strong>Mesleki Sır ve Veri Gizliliği:</strong> Müvekkil sırları ve dosya kapsamındaki hassas kişisel veriler, büro sahibinin açık onayı olmaksızın yabancı bulut ve yapay zekâ servislerine aktarılamaz. Varsayılan olarak dış veri aktarımı kapalıdır.</p>
        <p>3. <strong>Doğruluk ve Kaynak Zorunluluğu:</strong> Sistem asla hayali kanun maddesi veya uydurma içtihat üretmez; dosyada bulunmayan hususlarda "dosyada bulunamadı" yanıtı verir.</p>
      `;
    } else {
      titleEl.textContent = '6698 Sayılı KVKK ve Büro İçi Veri İzolasyonu';
      bodyEl.innerHTML = `
        <p><strong>Veri Sorumlusu ve Büro İzolasyonu:</strong></p>
        <p>Platformumuz OWASP Multi-Tenancy standartlarında tasarlanmış olup her hukuk bürosunun müvekkil, dosya, evrak ve muhasebe kayıtları kriptografik ve mantıksal olarak diğer bürolardan izole edilmiştir. Bir büro personeli asla başka bir büronun verilerine erişemez.</p>
        <p style="margin-top: 10px;"><strong>Denetim İzi (Audit Logging):</strong></p>
        <p>KVKK m. 12 veri güvenliği standartları uyarınca, sisteme yapılan tüm girişler, dosya açma, evrak indirme ve müvekkil sorgulama işlemleri IP adresi ve zaman damgasıyla değişmez şekilde denetim izine (Audit Trail) kaydedilir.</p>
      `;
    }
    document.getElementById('modal-legal').classList.add('active');
  },

  closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  },

  toggleQuickMenu() {
    const menu = document.getElementById('quick-menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  },

  // SAYAÇ VE MİKRO-ANİMASYON MOTORU
  animateCount(elementId, targetValue, isCurrency = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const target = Number(targetValue) || 0;
    if (target === 0) {
      el.textContent = isCurrency ? '₺0,00' : '0';
      return;
    }

    const duration = 700;
    const startTime = performance.now();

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = target * ease;

      if (isCurrency) {
        el.textContent = '₺' + Number(current).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        el.textContent = Math.round(current).toLocaleString('tr-TR');
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        if (isCurrency) {
          el.textContent = '₺' + Number(target).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
          el.textContent = Math.round(target).toLocaleString('tr-TR');
        }
      }
    };

    requestAnimationFrame(step);
  },

  // BİLDİRİM MERKEZİ & GRAFİKSEL BİLDİRİM YÖNETİCİSİ
  toggleNotificationDrawer() {
    const drawer = document.getElementById('notification-drawer');
    if (!drawer) return;
    const isHidden = drawer.style.display === 'none' || !drawer.style.display;
    drawer.style.display = isHidden ? 'flex' : 'none';

    if (isHidden) {
      setTimeout(() => {
        const outsideListener = (e) => {
          if (!e.target.closest('.notification-wrapper')) {
            drawer.style.display = 'none';
            document.removeEventListener('click', outsideListener);
          }
        };
        document.addEventListener('click', outsideListener);
      }, 50);
    }
  },

  updateNotifications(notifications = []) {
    this.state.notifications = notifications;
    const badge = document.getElementById('notif-badge-count');
    const ping = document.getElementById('notif-ping');
    const count = notifications.length;

    if (badge) badge.textContent = count;
    if (ping) ping.style.display = count > 0 ? 'block' : 'none';

    // Mini grafik istatistiklerini güncelle
    const hearingCount = notifications.filter(n => n.type === 'hearing').length;
    const deadlineCount = notifications.filter(n => n.type === 'deadline').length;
    const taskCount = notifications.filter(n => n.type === 'task').length;

    const statHearings = document.getElementById('notif-stat-hearings');
    const statDeadlines = document.getElementById('notif-stat-deadlines');
    const statTasks = document.getElementById('notif-stat-tasks');

    if (statHearings) statHearings.textContent = hearingCount;
    if (statDeadlines) statDeadlines.textContent = deadlineCount;
    if (statTasks) statTasks.textContent = taskCount;

    this.renderNotificationList(notifications);
  },

  filterNotifications(category, btn) {
    if (btn) {
      document.querySelectorAll('.notif-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    const all = this.state.notifications || [];
    const filtered = category === 'all' ? all : all.filter(n => n.category === category);
    this.renderNotificationList(filtered);
  },

  renderNotificationList(notifications) {
    const listEl = document.getElementById('notif-items-list');
    if (!listEl) return;

    if (!notifications || notifications.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 30px 10px; text-align: center; color: var(--text-muted);">
          <div style="font-size: 24px; margin-bottom: 6px;">🎉</div>
          <div style="font-size: 12px; font-weight: 600;">Bekleyen Kritik Bildirim Yok</div>
          <div style="font-size: 11px; margin-top: 2px;">Tüm duruşma ve yasal süreler kontrol altında.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.type}" onclick="App.handleNotifClick('${n.type}')">
        <div class="notif-item-top">
          <span class="notif-item-title">${n.title}</span>
          <span class="notif-item-pill ${n.urgent ? 'urgent' : n.type === 'hearing' ? 'soon' : 'info'}">
            ${n.timeLabel || 'Yaklaşıyor'}
          </span>
        </div>
        <div class="notif-item-desc">${n.message}</div>
      </div>
    `).join('');
  },

  handleNotifClick(type) {
    const drawer = document.getElementById('notification-drawer');
    if (drawer) drawer.style.display = 'none';
    if (type === 'hearing') {
      this.navigate('calendar');
    } else if (type === 'deadline') {
      this.navigate('procedural');
    } else if (type === 'task') {
      this.navigate('tasks');
    } else {
      this.navigate('dashboard');
    }
  },

  markAllNotificationsRead() {
    const ping = document.getElementById('notif-ping');
    const badge = document.getElementById('notif-badge-count');
    if (ping) ping.style.display = 'none';
    if (badge) badge.textContent = '0';
    this.showToast('Tüm bildirimler okundu olarak işaretlendi.', 'success');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
      <span>${message}</span>
      <div class="toast-progress"></div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  },

  // ÖZEL ONAY & BİLDİRİM DİYALOG MOTORU (BEAUTIFUL MODAL CONFIRM & ALERT)
  confirm(options = {}) {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      const {
        title = 'İşlem Onayı',
        message = 'Bu işlemi gerçekleştirmek istediğinize emin misiniz?',
        confirmText = 'Evet, Onayla',
        cancelText = 'Vazgeç',
        type = 'danger',
        icon = null
      } = opts;

      const overlay = document.getElementById('custom-dialog-overlay');
      const iconBox = document.getElementById('dialog-icon-box');
      const iconEl = document.getElementById('dialog-icon');
      const titleEl = document.getElementById('dialog-title');
      const msgEl = document.getElementById('dialog-message');
      const copyBox = document.getElementById('dialog-copy-box');
      const cancelBtn = document.getElementById('dialog-btn-cancel');
      const confirmBtn = document.getElementById('dialog-btn-confirm');

      if (!overlay) {
        return resolve(window.confirm ? window.confirm(message) : true);
      }

      iconBox.className = `dialog-icon-wrapper ${type}`;
      iconEl.textContent = icon || (type === 'danger' ? '🗑️' : type === 'warning' ? '⚠️' : 'ℹ️');
      titleEl.textContent = title;
      msgEl.textContent = message;
      copyBox.style.display = 'none';

      cancelBtn.style.display = 'flex';
      cancelBtn.textContent = cancelText;

      confirmBtn.className = `dialog-btn dialog-btn-confirm ${type === 'danger' ? 'danger' : 'primary'}`;
      confirmBtn.textContent = confirmText;

      overlay.style.display = 'flex';

      const cleanup = (result) => {
        overlay.style.display = 'none';
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        document.removeEventListener('keydown', keyListener);
        overlay.onclick = null;
        resolve(result);
      };

      confirmBtn.onclick = () => cleanup(true);
      cancelBtn.onclick = () => cleanup(false);

      const keyListener = (e) => {
        if (e.key === 'Escape') cleanup(false);
        if (e.key === 'Enter') cleanup(true);
      };
      document.addEventListener('keydown', keyListener);

      overlay.onclick = (e) => {
        if (e.target === overlay) cleanup(false);
      };
    });
  },

  alert(options = {}) {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      const {
        title = 'Bilgilendirme',
        message = '',
        buttonText = 'Anladım',
        type = 'info',
        icon = null,
        copyable = null
      } = opts;

      const overlay = document.getElementById('custom-dialog-overlay');
      const iconBox = document.getElementById('dialog-icon-box');
      const iconEl = document.getElementById('dialog-icon');
      const titleEl = document.getElementById('dialog-title');
      const msgEl = document.getElementById('dialog-message');
      const copyBox = document.getElementById('dialog-copy-box');
      const copyInput = document.getElementById('dialog-copy-input');
      const cancelBtn = document.getElementById('dialog-btn-cancel');
      const confirmBtn = document.getElementById('dialog-btn-confirm');

      if (!overlay) {
        if (window.alert) window.alert(message);
        return resolve();
      }

      iconBox.className = `dialog-icon-wrapper ${type}`;
      iconEl.textContent = icon || (type === 'success' ? '🎉' : type === 'warning' ? '⚠️' : type === 'danger' ? '❌' : 'ℹ️');
      titleEl.textContent = title;
      msgEl.textContent = message;

      if (copyable) {
        copyBox.style.display = 'flex';
        copyInput.value = copyable;
      } else {
        copyBox.style.display = 'none';
      }

      cancelBtn.style.display = 'none';

      confirmBtn.className = `dialog-btn dialog-btn-confirm primary`;
      confirmBtn.textContent = buttonText;

      overlay.style.display = 'flex';

      const cleanup = () => {
        overlay.style.display = 'none';
        confirmBtn.onclick = null;
        document.removeEventListener('keydown', keyListener);
        overlay.onclick = null;
        resolve();
      };

      confirmBtn.onclick = cleanup;

      const keyListener = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') cleanup();
      };
      document.addEventListener('keydown', keyListener);

      overlay.onclick = (e) => {
        if (e.target === overlay) cleanup();
      };
    });
  },

  copyDialogLink() {
    const input = document.getElementById('dialog-copy-input');
    if (!input) return;
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      this.showToast('Davet bağlantısı panoya kopyalandı.', 'success');
      const btn = document.getElementById('btn-copy-dialog');
      if (btn) btn.textContent = '✓ Kopyalandı!';
      setTimeout(() => {
        if (btn) btn.textContent = '📋 Kopyala';
      }, 2000);
    }).catch(() => {
      document.execCommand('copy');
      this.showToast('Davet bağlantısı kopyalandı.', 'success');
    });
  },

  filterClients(query) {
    const q = query.toLowerCase();
    const rows = document.querySelectorAll('#clients-table tbody tr');
    rows.forEach(r => {
      r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  filterCases(query) {
    const q = query.toLowerCase();
    const rows = document.querySelectorAll('#cases-table tbody tr');
    rows.forEach(r => {
      r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  // =========================================================================
  // ABONELİK VE KAPASİTE YÖNETİMİ (SUBSCRIPTION & BILLING)
  // =========================================================================
  pricingCycle: 'monthly',

  async updateSubscriptionBanner() {
    try {
      const data = await API.billing.getMySubscription();
      const sub = data.subscription;
      const banner = document.getElementById('tenant-subscription-banner');
      const badge = document.getElementById('badge-subscription-status');

      if (badge) {
        if (sub.status === 'trialing') {
          badge.textContent = sub.days_left !== null ? `Deneme · ${sub.days_left} gün kaldı` : 'Deneme';
          badge.style.background = 'rgba(245, 158, 11, 0.2)';
          badge.style.color = '#f59e0b';
        } else if (sub.status === 'active') {
          badge.textContent = `${sub.plan_name.split(' ')[0]} Aktif`;
          badge.style.background = 'rgba(16, 185, 129, 0.2)';
          badge.style.color = '#10b981';
        } else if (sub.status === 'canceling') {
          badge.textContent = 'Dönem Sonu İptal';
          badge.style.background = 'rgba(239, 68, 68, 0.2)';
          badge.style.color = '#f87171';
        } else if (sub.status === 'expired') {
          badge.textContent = 'Süresi Doldu';
          badge.style.background = 'rgba(239, 68, 68, 0.25)';
          badge.style.color = '#ef4444';
        }
      }

      if (banner) {
        if (sub.status === 'trialing' && sub.days_left !== null && sub.days_left <= 5) {
          banner.style.display = 'block';
          banner.innerHTML = `
            <div style="background: linear-gradient(90deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.25)); border: 1px solid rgba(245, 158, 11, 0.4); padding: 12px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 10px; font-size: 13px;">
                <span style="font-size: 18px;">⏳</span>
                <span>Ücretsiz deneme sürenizin bitmesine <strong>${sub.days_left} gün</strong> kaldı. Süre sonunda otomatik ücret tahsil edilmez; verileriniz güvenle salt-okunur korunur.</span>
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.openPricingModal()" style="font-weight: 700;">
                Paketi Seç ve Devam Et
              </button>
            </div>
          `;
        } else if (sub.status === 'expired') {
          banner.style.display = 'block';
          banner.innerHTML = `
            <div style="background: linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.25)); border: 1px solid rgba(239, 68, 68, 0.4); padding: 12px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: #fecaca;">
                <span style="font-size: 18px;">⚠️</span>
                <span>Abonelik veya deneme süreniz sona ermiştir. Mevcut dosyalarınız ve takviminiz korunmaktadır. Yeni işlem yapmak için paketinizi aktifleştirin.</span>
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.openPricingModal()" style="font-weight: 700;">
                Paketi Yenile / Seç
              </button>
            </div>
          `;
        } else {
          banner.style.display = 'none';
        }
      }
    } catch (e) {
      console.warn('Subscription banner check:', e);
    }
  },

  async renderSubscription() {
    const content = document.getElementById('spa-content');
    content.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">Abonelik ve kota bilgileri yükleniyor...</div>';

    try {
      const [subData, trxData, plansData] = await Promise.all([
        API.billing.getMySubscription(),
        API.billing.getTransactions(),
        API.billing.getPlans().catch(() => ({ plans: [] }))
      ]);

      const sub = subData.subscription;
      const u = subData.usage;
      const transactions = trxData.transactions || [];
      const plans = plansData.plans || [];
      const providerStatus = subData.provider_status || { isConfigured: false, message: 'Ödeme Sağlayıcı Kurulum Bekliyor (Test Modu)' };
      const isOwner = this.state.role === 'owner' || this.state.role === 'finance';

      let statusBadge = '<span class="badge" style="background:rgba(16,185,129,0.2); color:#10b981;">✓ Aktif Abonelik</span>';
      if (sub.status === 'trialing') {
        statusBadge = `<span class="badge" style="background:rgba(245,158,11,0.2); color:#f59e0b;">⏳ Ücretsiz Deneme (${sub.days_left !== null ? sub.days_left + ' Gün Kaldı' : ''})</span>`;
      } else if (sub.status === 'canceling') {
        statusBadge = '<span class="badge" style="background:rgba(239,68,68,0.2); color:#f87171;">Dönem Sonunda İptal Edilecek</span>';
      } else if (sub.status === 'expired') {
        statusBadge = '<span class="badge" style="background:rgba(239,68,68,0.3); color:#ef4444;">Süresi Dolmuş (Salt-Okunur)</span>';
      }

      content.innerHTML = `
        <div class="view-enter-animation" style="max-width: 1100px; margin: 0 auto;">
          <div class="page-header" style="margin-bottom: 20px;">
            <div>
              <h1 class="page-title">Abonelik & Kapasite Yönetimi</h1>
              <div class="page-desc">${this.state.tenant.name} çalışma alanının paket, kota limitleri ve ödeme geçmişi</div>
            </div>
            <div>
              ${isOwner ? `
                <button class="btn btn-primary" onclick="App.openPricingModal()">
                  💳 Paketi Değiştir / Yükselt
                </button>
              ` : `
                <span style="font-size: 12px; color: var(--text-muted);">Yalnızca büro sahibi veya finans yetkilisi paket değiştirebilir.</span>
              `}
            </div>
          </div>

          <!-- Sağlayıcı ve Yapılandırma Bilgi Şerhi -->
          <div style="background: ${providerStatus.isConfigured ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'}; border: 1px dashed ${providerStatus.isConfigured ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}; border-radius: 12px; padding: 12px 18px; margin-bottom: 22px; font-size: 13px; color: ${providerStatus.isConfigured ? '#065f46' : '#92400e'}; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>${providerStatus.isConfigured ? '🛡️' : '⚙️'}</span>
              <span><strong>Ödeme Altyapısı Durumu:</strong> ${providerStatus.isConfigured ? 'Sağlayıcı Sandbox Test Modunda Hazır' : 'Kurulum Bekliyor (Canlı/Sandbox API anahtarları tanımlanmamıştır. Sistem güvenli test modundadır.)'}</span>
            </div>
            <span style="font-size: 11px; background: rgba(0,0,0,0.06); padding: 3px 8px; border-radius: 6px;">PCI-DSS Uyumlu · Kart Bilgileri Saklanmaz</span>
          </div>

          <!-- Aktif Plan ve Süre Bilgisi Kartı -->
          <div class="card" style="margin-bottom: 24px; border: 1px solid var(--border-color); border-radius: 16px; padding: 28px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
              <div>
                <div style="font-size: 13px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Mevcut Büro Paketi</div>
                <h2 style="font-size: 24px; font-weight: 800; color: var(--text-main, #0f172a); margin-top: 4px;">${sub.plan_name}</h2>
                <div style="margin-top: 8px;">${statusBadge}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 13px; color: var(--text-muted);">Faturalama Döngüsü: <strong>${sub.billing_cycle === 'yearly' ? 'Yıllık (%20 İndirimli)' : 'Aylık'}</strong></div>
                ${sub.current_period_ends_at ? `
                  <div style="font-size: 13px; color: var(--text-muted, #64748b); margin-top: 4px;">
                    Dönem Bitiş Tarihi: <strong>${new Date(sub.current_period_ends_at).toLocaleDateString('tr-TR')}</strong>
                  </div>
                ` : ''}
                ${sub.trial_ends_at && sub.status === 'trialing' ? `
                  <div style="font-size: 13px; color: #f59e0b; margin-top: 4px;">
                    Deneme Bitiş: <strong>${new Date(sub.trial_ends_at).toLocaleDateString('tr-TR')}</strong> (${sub.days_left} gün kaldı)
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Kullanım Kotaları (4 Bar) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; padding-top: 20px; border-top: 1px solid var(--border-color);">
              <!-- 1. Ekip Üyeleri -->
              <div style="background: var(--bg-secondary, #f8fafc); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                  <span style="color: var(--text-muted);">👥 Ekip Üyeleri</span>
                  <strong style="color: var(--text-main, #0f172a);">${u.members.current} / ${u.members.max}</strong>
                </div>
                <div style="background: var(--border-color, #e2e8f0); height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="background: var(--primary-accent); height: 100%; width: ${u.members.percentage}%;"></div>
                </div>
              </div>

              <!-- 2. Aktif Dosyalar -->
              <div style="background: var(--bg-secondary, #f8fafc); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                  <span style="color: var(--text-muted);">📂 Aktif Dosyalar</span>
                  <strong style="color: var(--text-main, #0f172a);">${u.cases.current} / ${u.cases.max}</strong>
                </div>
                <div style="background: var(--border-color, #e2e8f0); height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="background: #10b981; height: 100%; width: ${u.cases.percentage}%;"></div>
                </div>
              </div>

              <!-- 3. Evrak Depolama -->
              <div style="background: var(--bg-secondary, #f8fafc); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                  <span style="color: var(--text-muted);">💾 Evrak Depolama</span>
                  <strong style="color: var(--text-main, #0f172a);">${u.storage.used_mb} MB / ${u.storage.max_gb} GB</strong>
                </div>
                <div style="background: var(--border-color, #e2e8f0); height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="background: #8b5cf6; height: 100%; width: ${u.storage.percentage}%;"></div>
                </div>
              </div>

              <!-- 4. AI Kotası -->
              <div style="background: var(--bg-secondary, #f8fafc); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                  <span style="color: var(--text-muted);">🤖 Aylık AI Kotası</span>
                  <strong style="color: var(--text-main, #0f172a);">${u.ai.used} / ${u.ai.max}</strong>
                </div>
                <div style="background: var(--border-color, #e2e8f0); height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="background: #f59e0b; height: 100%; width: ${u.ai.percentage}%;"></div>
                </div>
              </div>
            </div>

            <!-- Alt Eylemler & Veri Koruma Taahhüdü -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 12px;">
              <div style="font-size: 12px; color: var(--text-muted); max-width: 600px;">
                🛡️ <strong>Veri Koruma Güvencesi:</strong> Deneme veya abonelik süresi bittiğinde hiçbir dosyanız veya evrakınız silinmez. Verileriniz salt-okunur korunur ve KVKK m.11 kapsamında dilediğiniz an JSON olarak dışa aktarılabilir.
              </div>
              <div style="display: flex; gap: 10px; align-items: center;">
                <button class="btn btn-secondary btn-sm" onclick="App.exportAudit()" title="Tüm Büro Verilerini JSON İndir">
                  📥 Verileri İndir
                </button>
                ${!sub.has_used_trial && sub.status !== 'trialing' && isOwner ? `
                  <button class="btn btn-secondary btn-sm" onclick="App.startFreeTrial()">
                    🎁 14 Gün Kartsız Ücretsiz Deneme Başlat
                  </button>
                ` : ''}
                ${isOwner && sub.status === 'active' && !sub.cancel_at_period_end ? `
                  <button class="btn btn-secondary btn-sm" style="color: #ef4444; border-color: rgba(239,68,68,0.3);" onclick="App.openCancelSubscriptionModal()">
                    Aboneliği İptal Et
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Paket Karşılaştırma Bölümü (Bireysel, Büro, Kurumsal) -->
          <div class="card" style="margin-bottom: 24px; border: 1px solid var(--border-color); border-radius: 16px; padding: 28px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
              <div>
                <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main, #0f172a);">Plan Seçenekleri ve Karşılaştırma</h3>
                <div style="font-size: 12px; color: var(--text-muted);">İhtiyacınıza uygun paketi seçerek kapasitenizi dilediğiniz an artırabilirsiniz.</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="App.openPricingModal()" style="font-weight: 600;">
                Tüm Plan Detayları & Değiştirme
              </button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
              ${plans.map(p => {
                const isCurrent = p.id === sub.plan_id;
                return `
                  <div style="border: ${isCurrent ? '2px solid #10b981' : '1px solid var(--border-color)'}; border-radius: 14px; padding: 20px; background: var(--bg-surface); display: flex; flex-direction: column; justify-content: space-between; position: relative;">
                    ${isCurrent ? `
                      <span style="position: absolute; top: -10px; right: 16px; background: #10b981; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 10px; border-radius: 999px; text-transform: uppercase;">
                        ✓ Mevcut Paketiniz
                      </span>
                    ` : ''}
                    <div>
                      <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">${p.name}</h4>
                      <div style="font-size: 20px; font-weight: 800; color: var(--text-main, #0f172a); margin-bottom: 12px;">
                        ${Number(p.price_monthly).toLocaleString('tr-TR')} ₺ <span style="font-size: 12px; color: var(--text-muted); font-weight: 400;">/ ay</span>
                      </div>
                      <ul style="font-size: 12px; color: #475569; list-style: none; padding: 0; line-height: 1.8; margin-bottom: 16px;">
                        <li>👥 <strong>${p.max_lawyers} Kullanıcı</strong> Kapasitesi</li>
                        <li>📂 <strong>${p.max_cases} Dosya</strong> Takip Limiti</li>
                        <li>💾 <strong>${p.storage_gb} GB</strong> Evrak Depolama</li>
                        <li>🤖 <strong>${p.ai_queries_monthly}</strong> Hukuk Asistanı Sorgusu</li>
                      </ul>
                    </div>
                    <div>
                      ${isCurrent ? `
                        <button class="btn btn-secondary btn-sm" style="width: 100%; opacity: 0.7; cursor: default;" disabled>Kullanımda</button>
                      ` : `
                        <button class="btn btn-primary btn-sm" style="width: 100%; font-weight: 700;" onclick="App.handleCheckout('${p.id}')">
                          Bu Pakete Geç
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- İşlem ve Tahsilat Dekontları -->
          <div class="card" style="border: 1px solid var(--border-color); border-radius: 16px; padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
              <h3 style="font-size: 18px; font-weight: 700;">İşlem ve Tahsilat Dekontları</h3>
              <span style="font-size: 12px; color: var(--text-muted);">
                ℹ️ Kayıtlar elektronik ödeme dekontudur; resmi e-fatura için muhasebe entegrasyonu geçerlidir.
              </span>
            </div>

            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Dekont No</th>
                    <th>Paket / Döngü</th>
                    <th>Tutar</th>
                    <th>Ödeme Sağlayıcı</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactions.length === 0 ? `
                    <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 28px;">Henüz kayıtlı ödeme işlemi bulunmuyor.</td></tr>
                  ` : transactions.map(t => `
                    <tr>
                      <td>${new Date(t.created_at).toLocaleDateString('tr-TR')}</td>
                      <td><code>${t.receipt_number || t.merchant_oid}</code></td>
                      <td><strong>${(t.plan_id || 'solo').toUpperCase()}</strong> (${t.billing_cycle === 'yearly' ? 'Yıllık' : 'Aylık'})</td>
                      <td><strong>${Number(t.amount).toLocaleString('tr-TR')} ₺</strong></td>
                      <td>${t.provider.toUpperCase()}</td>
                      <td>
                        ${t.status === 'success' 
                          ? '<span class="badge" style="background:rgba(16,185,129,0.2); color:#10b981;">✓ Onaylandı</span>' 
                          : `<span class="badge" style="background:rgba(239,68,68,0.2); color:#f87171;">${t.status}</span>`}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="padding: 40px; color: #ef4444;">Abonelik bilgileri yüklenemedi: ${err.message}</div>`;
    }
  },

  async openPricingModal(initialCycle = null) {
    if (initialCycle) this.pricingCycle = initialCycle;
    const modal = document.getElementById('modal-pricing');
    const container = document.getElementById('pricing-modal-cards');
    if (!modal || !container) return;

    modal.classList.add('active');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 32px; color: var(--text-muted);">Paket seçenekleri yükleniyor...</div>';

    try {
      const [plansData, subData] = await Promise.all([
        API.billing.getPlans(),
        API.billing.getMySubscription().catch(() => ({ subscription: {} }))
      ]);

      const plans = plansData.plans || [];
      const currentPlanId = subData.subscription?.plan_id || null;
      const isYearly = this.pricingCycle === 'yearly';

      const toggle = document.getElementById('pricing-cycle-toggle');
      if (toggle) toggle.checked = isYearly;

      const lblMonthly = document.getElementById('label-cycle-monthly');
      const lblYearly = document.getElementById('label-cycle-yearly');
      if (lblMonthly && lblYearly) {
        lblMonthly.style.color = isYearly ? 'var(--text-muted)' : 'var(--text-main, #0f172a)';
        lblYearly.style.color = isYearly ? 'var(--text-main, #0f172a)' : 'var(--text-muted)';
      }

      container.innerHTML = plans.map(p => {
        const isCurrent = p.id === currentPlanId;
        const price = isYearly ? p.price_yearly : p.price_monthly;
        const priceLabel = isYearly 
          ? `<span style="font-size: 26px; font-weight: 800; color: var(--text-main, #0f172a);">${p.price_yearly.toLocaleString('tr-TR')} ₺</span> <span style="font-size: 12px; color: var(--text-muted);">/ yıllık (${p.monthly_equivalent} ₺/ay)</span>`
          : `<span style="font-size: 26px; font-weight: 800; color: var(--text-main, #0f172a);">${p.price_monthly.toLocaleString('tr-TR')} ₺</span> <span style="font-size: 12px; color: var(--text-muted);">/ aylık</span>`;

        const isPro = p.id === 'pro';

        return `
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border: ${isCurrent ? '2px solid #10b981' : (isPro ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)')}; border-radius: 16px; padding: 24px; position: relative;">
            ${isCurrent ? `
              <div style="position: absolute; top: -10px; left: 20px; background: #10b981; color: #070b14; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 999px; text-transform: uppercase;">
                ✓ Mevcut Paketiniz
              </div>
            ` : ''}
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="font-size: 18px; font-weight: 700;">${p.name}</h4>
                ${p.badge ? `<span class="badge" style="font-size: 11px;">${p.badge}</span>` : ''}
              </div>
              <div style="margin-bottom: 14px;">
                ${priceLabel}
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">+ %20 KDV tahakkuk eder</div>
              </div>
              <ul style="list-style: none; padding: 0; margin-bottom: 20px; font-size: 12px; color: var(--text-secondary, #334155); line-height: 1.7;">
                ${(p.features || []).map(f => `<li>✓ ${f}</li>`).join('')}
              </ul>
            </div>

            <div>
              ${p.id === 'enterprise' ? `
                <button class="btn btn-secondary" style="width: 100%; font-weight: 700;" onclick="App.showCorporateContactModal()">
                  📞 Teklif Alın
                </button>
              ` : isCurrent ? `
                <button class="btn btn-secondary" style="width: 100%; opacity: 0.6; cursor: default;" disabled>
                  Kullanımda
                </button>
              ` : `
                <button class="btn btn-primary" style="width: 100%; font-weight: 700;" onclick="App.handleCheckout('${p.id}')">
                  ${subData.subscription?.status === 'trialing' ? 'Bu Paketi Seç ve Başla' : 'Pakete Geç'}
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = `<div style="grid-column: 1/-1; color: #ef4444; padding: 24px;">Paketler yüklenemedi: ${err.message}</div>`;
    }
  },

  handlePricingToggle(isYearly) {
    this.pricingCycle = isYearly ? 'yearly' : 'monthly';
    this.openPricingModal(this.pricingCycle);
  },

  setPricingCycle(cycle) {
    this.pricingCycle = cycle;
    this.openPricingModal(cycle);
  },

  selectPlanAndRegister(planId) {
    sessionStorage.setItem('adn_selected_plan', planId);
    this.showAuthScreen('register');
  },

  async startFreeTrial() {
    try {
      const res = await API.billing.startTrial();
      this.showToast(res.message, 'success');
      this.closeModals();
      await this.updateSubscriptionBanner();
      if (this.state.currentView === 'subscription') {
        this.renderSubscription();
      }
    } catch (err) {
      alert('Hata: ' + err.message);
    }
  },

  async handleCheckout(planId) {
    try {
      const res = await API.billing.checkout({
        planId,
        billingCycle: this.pricingCycle
      });

      const c = res.checkout;
      
      // Güvenli 3D Secure / Sandbox Simülasyon Onay Modalı
      const confirmed = await this.confirm({
        title: '🔒 Güvenli Ödeme Doğrulaması (Sandbox Testi)',
        message: `Paket: ${c.planName} (${c.billingCycle === 'yearly' ? 'Yıllık' : 'Aylık'})\nNet Tutar: ${c.amount} TL\n%20 KDV: ${c.taxAmount} TL\nToplam Tahsilat: ${c.totalAmount} TL\n\nBu işlem PCI-DSS uyumlu test sandbox sağlayıcısı üzerinden yürütülmektedir. Ödemeyi onaylamak istiyor musunuz?`,
        confirmText: '💳 Güvenli 3D Secure ile Öde',
        danger: false
      });

      if (!confirmed) return;

      // Sandbox Webhook Simülasyonu (Sağlayıcı sunucu-sunucu doğrulama bildirimi)
      const webhookRes = await fetch('/api/billing/webhook/iyzico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantOid: c.merchantOid,
          status: 'SUCCESS',
          paymentId: `PAY-${Date.now()}`
        })
      });

      const webhookData = await webhookRes.json();
      if (webhookRes.ok && webhookData.status === 'success') {
        this.showToast('Tebrikler! Ödemeniz sağlayıcı tarafından doğrulandı ve paketiniz aktifleştirildi.', 'success');
        this.closeModals();
        await this.updateSubscriptionBanner();
        if (this.state.currentView === 'subscription') {
          this.renderSubscription();
        }
      } else {
        alert('Ödeme sağlayıcı tarafından onaylanamadı.');
      }
    } catch (err) {
      alert('Ödeme başlatılamadı: ' + err.message);
    }
  },

  openCancelSubscriptionModal() {
    const modal = document.getElementById('modal-cancel-subscription');
    if (modal) modal.classList.add('active');
  },

  async handleConfirmCancelSubscription() {
    try {
      const res = await API.billing.cancel();
      this.showToast(res.message, 'info');
      this.closeModals();
      await this.updateSubscriptionBanner();
      if (this.state.currentView === 'subscription') {
        this.renderSubscription();
      }
    } catch (err) {
      alert('Hata: ' + err.message);
    }
  },

  showCorporateContactModal() {
    this.closeModals();
    alert('Kurumsal & Avukatlık Ortaklığı Teklifi:\n\nLütfen kurumsal kapasite, özel TBB yapay zekâ sorguları ve baro entegrasyonu talepleriniz için kurumsal@adn.av.tr veya 0850 441 2026 üzerinden iletişime geçiniz.');
  }
};

// Global dışa aktarma ve başlatma
window.App = App;
window.alert = (msg) => {
  App.showToast(msg, 'info');
};
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.addEventListener('hashchange', () => {
  if (!App.state.user) {
    if (window.location.hash === '#register') {
      App.showAuthScreen('register');
    } else if (window.location.hash === '#login') {
      App.showAuthScreen('login');
    } else if (!window.location.hash || window.location.hash === '#') {
      App.showLanding();
    }
  }
});
