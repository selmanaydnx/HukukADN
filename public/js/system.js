/**
 * ADN Sistem Yönetim Konsolu & Komuta Merkezi İstemcisi
 * Süper Yönetici Paneli (/system)
 */

const SystemApp = {
  currentUser: null,
  currentTab: 'overview',
  tenantsData: [],
  usersData: [],
  plansData: [],
  statsData: null,

  async init() {
    this.bindEvents();
    await this.checkAuth();
  },

  bindEvents() {
    // Login Form Submit
    const loginForm = document.getElementById('sys-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Logout Button
    const logoutBtn = document.getElementById('sys-btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Tab Navigation
    document.querySelectorAll('.sys-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    // Tenants Search & Filter
    const tenantSearch = document.getElementById('tenant-search-input');
    if (tenantSearch) {
      tenantSearch.addEventListener('input', () => this.renderTenantsTable());
    }
    const tenantFilter = document.getElementById('tenant-status-filter');
    if (tenantFilter) {
      tenantFilter.addEventListener('change', () => this.renderTenantsTable());
    }

    // Users Search
    const userSearch = document.getElementById('user-search-input');
    if (userSearch) {
      userSearch.addEventListener('input', () => this.renderUsersTable());
    }

    // Announcement Form
    const annForm = document.getElementById('sys-announcement-form');
    if (annForm) {
      annForm.addEventListener('submit', (e) => this.handleSaveAnnouncement(e));
    }
  },

  showToast(message, type = 'gold') {
    const toast = document.getElementById('sys-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'sys-toast show';
    setTimeout(() => {
      toast.className = 'sys-toast';
    }, 4000);
  },

  async api(endpoint, options = {}) {
    options.headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(endpoint, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'İşlem sırasında sunucu hatası oluştu.');
    }
    return data;
  },

  async checkAuth() {
    try {
      const data = await this.api('/api/system/auth/me');
      if (data.authenticated && data.user) {
        this.currentUser = data.user;
        this.showDashboard();
      } else {
        this.showLogin();
      }
    } catch (e) {
      this.showLogin();
    }
  },

  showLogin() {
    document.getElementById('sys-login-view').style.display = 'flex';
    document.getElementById('sys-dashboard-view').style.display = 'none';
  },

  showDashboard() {
    document.getElementById('sys-login-view').style.display = 'none';
    document.getElementById('sys-dashboard-view').style.display = 'flex';
    const userDisplay = document.getElementById('sys-logged-user');
    if (userDisplay && this.currentUser) {
      userDisplay.textContent = this.currentUser.username;
    }
    this.loadInitialData();
  },

  async handleLogin(e) {
    e.preventDefault();
    const userEl = document.getElementById('sys-username');
    const passEl = document.getElementById('sys-password');
    const errEl = document.getElementById('sys-login-error');

    errEl.style.display = 'none';
    errEl.textContent = '';

    const username = userEl.value.trim();
    const password = passEl.value.trim();

    try {
      const res = await this.api('/api/system/auth/login', {
        method: 'POST',
        body: { username, password }
      });
      this.currentUser = res.user;
      this.showToast('Giriş başarılı. Sistem konsolu yükleniyor...', 'green');
      this.showDashboard();
    } catch (err) {
      errEl.textContent = err.message || 'Geçersiz kullanıcı adı veya şifre.';
      errEl.style.display = 'block';
    }
  },

  async handleLogout() {
    try {
      await this.api('/api/system/auth/logout', { method: 'POST' });
    } catch (e) {}
    this.currentUser = null;
    this.showLogin();
    this.showToast('Oturum kapatıldı.');
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.sys-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    document.querySelectorAll('.sys-view').forEach(v => {
      v.classList.toggle('active', v.id === `sys-view-${tabName}`);
    });

    if (tabName === 'overview') this.loadStats();
    if (tabName === 'tenants') this.loadTenants();
    if (tabName === 'users') this.loadUsers();
    if (tabName === 'plans') this.loadPlans();
    if (tabName === 'announcements') this.loadAnnouncements();
    if (tabName === 'audit') this.loadAuditLogs();
  },

  async loadInitialData() {
    await this.loadStats();
    await this.loadTenants();
  },

  // ================= STATS & OVERVIEW =================
  async loadStats() {
    try {
      const res = await this.api('/api/system/stats');
      const m = res.metrics;
      this.statsData = m;

      document.getElementById('stat-total-tenants').textContent = m.totalTenants;
      document.getElementById('stat-active-tenants').textContent = m.activeTenants;
      document.getElementById('stat-suspended-tenants').textContent = m.suspendedTenants;
      document.getElementById('stat-total-users').textContent = m.totalUsers;
      document.getElementById('stat-total-cases').textContent = m.totalCases;
      document.getElementById('stat-total-clients').textContent = m.totalClients;
      document.getElementById('stat-mrr').textContent = Number(m.estimatedMrr).toLocaleString('tr-TR') + ' ₺';
      
      const dbSizeEl = document.getElementById('topbar-dbsize');
      if (dbSizeEl) dbSizeEl.textContent = m.dbSizeFormatted;

      const uptimeEl = document.getElementById('topbar-uptime');
      if (uptimeEl) {
        const hours = Math.floor(m.uptimeSeconds / 3600);
        const mins = Math.floor((m.uptimeSeconds % 3600) / 60);
        uptimeEl.textContent = `${hours} sa ${mins} dk`;
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  },

  // ================= TENANTS (BÜROLAR) =================
  async loadTenants() {
    try {
      const res = await this.api('/api/system/tenants');
      this.tenantsData = res.tenants || [];
      this.renderTenantsTable();
      const badge = document.getElementById('badge-tenants-count');
      if (badge) badge.textContent = this.tenantsData.length;
    } catch (err) {
      this.showToast('Bürolar yüklenemedi: ' + err.message);
    }
  },

  renderTenantsTable() {
    const tbody = document.getElementById('tenants-table-body');
    if (!tbody) return;

    const searchTerm = (document.getElementById('tenant-search-input')?.value || '').toLowerCase();
    const filterStatus = document.getElementById('tenant-status-filter')?.value || 'all';

    const filtered = this.tenantsData.filter(t => {
      const matchSearch = (t.name || '').toLowerCase().includes(searchTerm) ||
                          (t.owner_name || '').toLowerCase().includes(searchTerm) ||
                          (t.city || '').toLowerCase().includes(searchTerm) ||
                          (t.id || '').toLowerCase().includes(searchTerm);
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 32px; color: #64748b;">Kayıtlı veya eşleşen hukuk bürosu bulunamadı.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const isSuspended = t.status === 'suspended';
      const statusBadge = isSuspended 
        ? `<span class="sys-badge sys-badge-suspended">⚠️ Askıya Alındı</span>`
        : `<span class="sys-badge sys-badge-active">✓ Aktif</span>`;

      return `
        <tr>
          <td>
            <strong>${this.escape(t.name)}</strong>
            <div style="font-size:0.75rem; color:#64748b;">ID: ${t.id}</div>
          </td>
          <td>
            <div>${this.escape(t.owner_name || 'Bilinmiyor')}</div>
            <div style="font-size:0.75rem; color:#94a3b8;">${this.escape(t.owner_email || '-')}</div>
          </td>
          <td>${this.escape(t.city || 'Belirtilmedi')}</td>
          <td>
            <span class="sys-badge sys-badge-plan">${this.escape(t.plan_name || t.plan_id.toUpperCase())}</span>
          </td>
          <td>
            <span title="Üyeler">👥 ${t.member_count}</span> &nbsp;|&nbsp; 
            <span title="Davalar">📂 ${t.case_count}</span> &nbsp;|&nbsp; 
            <span title="Müvekkiller">👤 ${t.client_count}</span>
          </td>
          <td>${statusBadge}</td>
          <td>${new Date(t.created_at).toLocaleDateString('tr-TR')}</td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="sys-btn-sm ${isSuspended ? 'sys-btn-success' : 'sys-btn-warning'}" 
                onclick="SystemApp.toggleTenantStatus('${t.id}', '${isSuspended ? 'active' : 'suspended'}')">
                ${isSuspended ? 'Aktif Et' : 'Askıya Al'}
              </button>
              <button class="sys-btn-sm sys-btn-link" onclick="SystemApp.openTenantModal('${t.id}')">
                Yönet
              </button>
              <button class="sys-btn-sm sys-btn-danger" onclick="SystemApp.deleteTenant('${t.id}', '${this.escape(t.name)}')">
                Sil
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async toggleTenantStatus(tenantId, newStatus) {
    try {
      await this.api(`/api/system/tenants/${tenantId}`, {
        method: 'PATCH',
        body: { status: newStatus }
      });
      this.showToast(`Büro durumu "${newStatus === 'active' ? 'Aktif' : 'Askıya Alındı'}" olarak güncellendi.`);
      await this.loadTenants();
      await this.loadStats();
    } catch (err) {
      alert('Hata: ' + err.message);
    }
  },

  openTenantModal(tenantId) {
    const tenant = this.tenantsData.find(t => t.id === tenantId);
    if (!tenant) return;

    document.getElementById('modal-tenant-id').value = tenant.id;
    document.getElementById('modal-tenant-name').value = tenant.name;
    document.getElementById('modal-tenant-plan').value = tenant.plan_id || 'solo';
    document.getElementById('modal-tenant-status').value = tenant.status || 'active';
    
    document.getElementById('sys-tenant-modal').classList.add('active');
  },

  closeTenantModal() {
    document.getElementById('sys-tenant-modal').classList.remove('active');
  },

  async saveTenantModal() {
    const id = document.getElementById('modal-tenant-id').value;
    const name = document.getElementById('modal-tenant-name').value.trim();
    const plan_id = document.getElementById('modal-tenant-plan').value;
    const status = document.getElementById('modal-tenant-status').value;

    try {
      await this.api(`/api/system/tenants/${id}`, {
        method: 'PATCH',
        body: { name, plan_id, status }
      });
      this.showToast('Büro bilgileri güncellendi.');
      this.closeTenantModal();
      await this.loadTenants();
      await this.loadStats();
    } catch (err) {
      alert('Hata: ' + err.message);
    }
  },

  async deleteTenant(tenantId, name) {
    if (!confirm(`DİKKAT: "${name}" isimli hukuk bürosunu ve bu büroya ait tüm dava, müvekkil ve evrak kayıtlarını kalıcı olarak silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await this.api(`/api/system/tenants/${tenantId}`, { method: 'DELETE' });
      this.showToast(`"${name}" bürosu silindi.`);
      await this.loadTenants();
      await this.loadStats();
    } catch (err) {
      alert('Hata: ' + err.message);
    }
  },

  // ================= USERS (KULLANICILAR & AVUKATLAR) =================
  async loadUsers() {
    try {
      const res = await this.api('/api/system/users');
      this.usersData = res.users || [];
      this.renderUsersTable();
      const badge = document.getElementById('badge-users-count');
      if (badge) badge.textContent = this.usersData.length;
    } catch (err) {
      this.showToast('Kullanıcılar yüklenemedi: ' + err.message);
    }
  },

  renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    const searchTerm = (document.getElementById('user-search-input')?.value || '').toLowerCase();

    const filtered = this.usersData.filter(u => {
      return (u.full_name || '').toLowerCase().includes(searchTerm) ||
             (u.email || '').toLowerCase().includes(searchTerm) ||
             (u.tenant_name || '').toLowerCase().includes(searchTerm) ||
             (u.bar_number || '').toLowerCase().includes(searchTerm);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 32px; color: #64748b;">Kayıtlı veya eşleşen kullanıcı bulunamadı.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      return `
        <tr>
          <td><strong>${this.escape(u.full_name)}</strong></td>
          <td>${this.escape(u.email)}</td>
          <td>${this.escape(u.tenant_name || 'Bağımsız / Yok')}</td>
          <td>
            <span class="sys-badge sys-badge-plan">${this.escape(u.role || 'Üye')}</span>
          </td>
          <td>${this.escape(u.bar_city ? `${u.bar_city} (${u.bar_number || '-'})` : 'Girilmemiş')}</td>
          <td>${new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
          <td>
            <button class="sys-btn-sm sys-btn-warning" onclick="SystemApp.openResetPasswordModal('${u.id}', '${this.escape(u.full_name)}')">
              🔑 Şifre Sıfırla
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openResetPasswordModal(userId, fullName) {
    document.getElementById('modal-reset-user-id').value = userId;
    document.getElementById('modal-reset-user-name').textContent = fullName;
    document.getElementById('modal-reset-new-pass').value = '';
    document.getElementById('sys-reset-password-modal').classList.add('active');
  },

  closeResetPasswordModal() {
    document.getElementById('sys-reset-password-modal').classList.remove('active');
  },

  async handleResetPassword() {
    const id = document.getElementById('modal-reset-user-id').value;
    const newPassword = document.getElementById('modal-reset-new-pass').value.trim();

    if (!newPassword || newPassword.length < 6) {
      alert('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      const res = await this.api(`/api/system/users/${id}/reset-password`, {
        method: 'POST',
        body: { newPassword }
      });
      this.showToast(res.message);
      this.closeResetPasswordModal();
    } catch (err) {
      alert('Hata: ' + err.message);
    }
  },

  // ================= SUBSCRIPTION PLANS (ABONELİK VE FİYATLANDIRMA) =================
  async loadPlans() {
    try {
      const res = await this.api('/api/system/plans');
      this.plansData = res.plans || [];
      this.renderPlansGrid();
    } catch (err) {
      this.showToast('Paketler yüklenemedi: ' + err.message);
    }
  },

  renderPlansGrid() {
    const grid = document.getElementById('plans-cards-grid');
    if (!grid) return;

    grid.innerHTML = this.plansData.map(p => {
      const isFeatured = p.id === 'pro';
      return `
        <div class="sys-plan-card ${isFeatured ? 'featured' : ''}" id="plan-card-${p.id}">
          ${p.badge ? `<span class="sys-plan-badge">${this.escape(p.badge)}</span>` : ''}
          <div class="sys-plan-name">${this.escape(p.name)}</div>
          
          <div class="sys-price-inputs">
            <div class="sys-price-box">
              <label>Aylık Fiyat (₺)</label>
              <input type="number" id="plan-${p.id}-monthly" value="${p.price_monthly}" min="0">
            </div>
            <div class="sys-price-box">
              <label>Yıllık Fiyat (₺)</label>
              <input type="number" id="plan-${p.id}-yearly" value="${p.price_yearly}" min="0">
            </div>
          </div>

          <div class="sys-plan-limits">
            <div class="sys-limit-item">
              <label>Maks. Avukat Kotası</label>
              <input type="number" id="plan-${p.id}-lawyers" value="${p.max_lawyers}">
            </div>
            <div class="sys-limit-item">
              <label>Dava Kotası (-1 limitsiz)</label>
              <input type="number" id="plan-${p.id}-cases" value="${p.max_cases}">
            </div>
            <div class="sys-limit-item">
              <label>Depolama (GB)</label>
              <input type="number" id="plan-${p.id}-storage" value="${p.storage_gb}">
            </div>
            <div class="sys-limit-item">
              <label>Aylık AI Kotası</label>
              <input type="number" id="plan-${p.id}-ai" value="${p.ai_queries_monthly}">
            </div>
          </div>

          <ul class="sys-features-list">
            ${(p.features || []).map(f => `<li>${this.escape(f)}</li>`).join('')}
          </ul>

          <button class="sys-btn-primary" onclick="SystemApp.savePlan('${p.id}')">
            💾 Fiyatları & Kotaları Kaydet
          </button>
        </div>
      `;
    }).join('');
  },

  async savePlan(planId) {
    const monthly = document.getElementById(`plan-${planId}-monthly`).value;
    const yearly = document.getElementById(`plan-${planId}-yearly`).value;
    const max_lawyers = document.getElementById(`plan-${planId}-lawyers`).value;
    const max_cases = document.getElementById(`plan-${planId}-cases`).value;
    const storage_gb = document.getElementById(`plan-${planId}-storage`).value;
    const ai_queries_monthly = document.getElementById(`plan-${planId}-ai`).value;

    try {
      const res = await this.api(`/api/system/plans/${planId}`, {
        method: 'PUT',
        body: {
          price_monthly: monthly,
          price_yearly: yearly,
          max_lawyers,
          max_cases,
          storage_gb,
          ai_queries_monthly
        }
      });
      this.showToast(res.message);
      await this.loadStats();
    } catch (err) {
      alert('Paket kaydedilirken hata: ' + err.message);
    }
  },

  // ================= SYSTEM ANNOUNCEMENTS =================
  async loadAnnouncements() {
    try {
      const res = await this.api('/api/system/announcements');
      const list = document.getElementById('announcements-list');
      if (!list) return;

      if (!res.announcements || res.announcements.length === 0) {
        list.innerHTML = `<div style="color:#64748b; font-size:0.9rem;">Henüz yayınlanmış bir sistem duyurusu bulunmuyor.</div>`;
        return;
      }

      list.innerHTML = res.announcements.map(a => `
        <div style="background:#070b14; border:1px solid var(--sys-border); border-radius:10px; padding:16px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="color:var(--sys-gold);">${this.escape(a.title)}</strong>
            <span style="font-size:0.75rem; color:#64748b;">${new Date(a.created_at).toLocaleString('tr-TR')}</span>
          </div>
          <div style="font-size:0.88rem; color:#cbd5e1;">${this.escape(a.message)}</div>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  },

  async handleSaveAnnouncement(e) {
    e.preventDefault();
    const title = document.getElementById('ann-title').value.trim();
    const message = document.getElementById('ann-message').value.trim();
    const type = document.getElementById('ann-type').value;

    try {
      const res = await this.api('/api/system/announcements', {
        method: 'POST',
        body: { title, message, type }
      });
      this.showToast(res.message);
      document.getElementById('ann-title').value = '';
      document.getElementById('ann-message').value = '';
      await this.loadAnnouncements();
    } catch (err) {
      alert('Hata: ' + err.message);
    }
  },

  // ================= AUDIT LOGS =================
  async loadAuditLogs() {
    try {
      const res = await this.api('/api/system/audit-logs');
      const tbody = document.getElementById('audit-table-body');
      if (!tbody) return;

      if (!res.logs || res.logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:#64748b;">Henüz kayıtlı denetim olayı bulunmuyor.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.logs.map(l => `
        <tr>
          <td>${new Date(l.created_at).toLocaleString('tr-TR')}</td>
          <td><strong>${this.escape(l.action)}</strong></td>
          <td>${this.escape(l.tenant_name || 'Sistem')}</td>
          <td>${this.escape(l.user_name || l.user_email || '-')}</td>
          <td>${this.escape(l.details || '-')}</td>
          <td><code>${this.escape(l.ip_address || '-')}</code></td>
        </tr>
      `).join('');
    } catch (err) {
      this.showToast('Denetim kayıtları yüklenemedi: ' + err.message);
    }
  },

  escape(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  SystemApp.init();
});
