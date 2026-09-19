/**
 * ADN API Client
 * Tüm sunucu istekleri için güvenli, oturum çerezli istemci kütüphanesi
 */

const API = {
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : endpoint;
    const config = {
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      },
      credentials: 'include', // Oturum çerezi adn_session'ı otomatik ilet
      ...options
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(config.body);
    }

    try {
      const res = await fetch(url, config);
      
      // JSON Yanıt Çözümleme
      let data = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else if (contentType.includes('text/')) {
        data = await res.text();
      }

      if (!res.ok) {
        const errorMsg = (data && data.error) || (data && data.message) || `Hata oluştu (${res.status})`;
        const error = new Error(errorMsg);
        error.status = res.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Kimlik Doğrulama & Büro Değişimi
  auth: {
    register: (payload) => API.request('/api/auth/register', { method: 'POST', body: payload }),
    login: (credentials) => API.request('/api/auth/login', { method: 'POST', body: credentials }),
    logout: () => API.request('/api/auth/logout', { method: 'POST' }),
    verifyEmail: (token) => API.request('/api/auth/verify-email', { method: 'POST', body: { token } }),
    resendVerification: (email) => API.request('/api/auth/resend-verification', { method: 'POST', body: { email } }),
    forgotPassword: (email) => API.request('/api/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (token, newPassword) => API.request('/api/auth/reset-password', { method: 'POST', body: { token, newPassword } }),
    getProfile: () => API.request('/api/auth/profile'),
    updateProfile: (data) => API.request('/api/auth/profile', { method: 'PUT', body: data }),
    changePassword: (data) => API.request('/api/auth/change-password', { method: 'POST', body: data }),
    switchTenant: (tenantId) => API.request('/api/auth/switch-tenant', { method: 'POST', body: { tenantId } })
  },

  // Dashboard
  dashboard: {
    getSummary: () => API.request('/api/dashboard/summary')
  },

  // Müvekkiller CRM
  clients: {
    list: (q) => API.request(`/api/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    get: (id) => API.request(`/api/clients/${id}`),
    create: (data) => API.request('/api/clients', { method: 'POST', body: data }),
    update: (id, data) => API.request(`/api/clients/${id}`, { method: 'PUT', body: data }),
    delete: (id) => API.request(`/api/clients/${id}`, { method: 'DELETE' }),
    checkConflict: (name, identityNo) => {
      const params = new URLSearchParams();
      if (name) params.append('name', name);
      if (identityNo) params.append('identityNo', identityNo);
      return API.request(`/api/clients/conflict-check?${params.toString()}`);
    }
  },

  // Dava & İcra Dosyaları
  cases: {
    list: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.caseType) params.append('caseType', filters.caseType);
      if (filters.q) params.append('q', filters.q);
      const qs = params.toString();
      return API.request(`/api/cases${qs ? `?${qs}` : ''}`);
    },
    get: (id) => API.request(`/api/cases/${id}`),
    create: (data) => API.request('/api/cases', { method: 'POST', body: data }),
    update: (id, data) => API.request(`/api/cases/${id}`, { method: 'PUT', body: data }),
    archive: (id) => API.request(`/api/cases/${id}/archive`, { method: 'POST' }),
    saveHearingNotes: (id, data) => API.request(`/api/cases/${id}/hearing-notes`, { method: 'POST', body: data })
  },

  // Duruşma & Süre Takvimi
  events: {
    list: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.start) params.append('start', filters.start);
      if (filters.end) params.append('end', filters.end);
      if (filters.type) params.append('type', filters.type);
      const qs = params.toString();
      return API.request(`/api/events${qs ? `?${qs}` : ''}`);
    },
    create: (data) => API.request('/api/events', { method: 'POST', body: data }),
    update: (id, data) => API.request(`/api/events/${id}`, { method: 'PUT', body: data }),
    delete: (id) => API.request(`/api/events/${id}`, { method: 'DELETE' })
  },

  // Görevler
  tasks: {
    list: (caseId) => API.request(`/api/tasks${caseId ? `?caseId=${caseId}` : ''}`),
    create: (data) => API.request('/api/tasks', { method: 'POST', body: data }),
    toggle: (id) => API.request(`/api/tasks/${id}/toggle`, { method: 'POST' }),
    delete: (id) => API.request(`/api/tasks/${id}`, { method: 'DELETE' })
  },

  // Evraklar
  documents: {
    list: (caseId) => API.request(`/api/documents${caseId ? `?caseId=${caseId}` : ''}`),
    upload: (data) => API.request('/api/documents/upload', { method: 'POST', body: data }),
    delete: (id) => API.request(`/api/documents/${id}`, { method: 'DELETE' })
  },

  // Finans
  finance: {
    list: (caseId) => API.request(`/api/finance${caseId ? `?caseId=${caseId}` : ''}`),
    create: (data) => API.request('/api/finance', { method: 'POST', body: data }),
    delete: (id) => API.request(`/api/finance/${id}`, { method: 'DELETE' })
  },

  // TBB Uyumlu Yapay Zekâ Asistanı
  ai: {
    process: (payload) => API.request('/api/ai/process', { method: 'POST', body: payload })
  },

  // Süre & Hukuki Hesaplama Motorları (SMM, İcra Kapak, AAÜT, UETS)
  calc: {
    deadline: (data) => API.request('/api/calc/deadline', { method: 'POST', body: data }),
    smm: (data) => API.request('/api/calc/smm', { method: 'POST', body: data }),
    execution: (data) => API.request('/api/calc/execution', { method: 'POST', body: data }),
    aaut: (data) => API.request('/api/calc/aaut', { method: 'POST', body: data })
  },

  procedural: {
    calculate: (baseDate, ruleType, customDays) => API.request('/api/procedural/calculate', {
      method: 'POST',
      body: { baseDate, ruleType, customDays }
    })
  },

  // Büro Ayarları, Ekip & Denetim İzi
  tenant: {
    getSettings: () => API.request('/api/tenant/settings'),
    updateSettings: (data) => API.request('/api/tenant/settings', { method: 'PUT', body: data }),
    inviteMember: (data) => API.request('/api/tenant/invite', { method: 'POST', body: data }),
    removeMember: (userId) => API.request(`/api/tenant/members/${userId}`, { method: 'DELETE' }),
    getAuditLogs: (page = 1) => API.request(`/api/tenant/audit-logs?page=${page}`),
    exportData: () => API.request('/api/tenant/export')
  },

  // Abonelik & Faturalandırma
  billing: {
    getPlans: () => API.request('/api/billing/plans'),
    getMySubscription: () => API.request('/api/billing/my-subscription'),
    startTrial: () => API.request('/api/billing/start-trial', { method: 'POST' }),
    checkout: (data) => API.request('/api/billing/checkout', { method: 'POST', body: data }),
    cancel: () => API.request('/api/billing/cancel', { method: 'POST' }),
    changePlan: (data) => API.request('/api/billing/change-plan', { method: 'POST', body: data }),
    getTransactions: () => API.request('/api/billing/transactions')
  }
};

window.API = API;
