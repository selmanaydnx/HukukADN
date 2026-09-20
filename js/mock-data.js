// ADN - Veri Deposu (Kullanıcı Verileri & LocalStorage Yönetimi)

const STORAGE_KEY = 'adn_law_firm_data_v1';

const DEFAULT_EMPTY_STATE = {
  currentLawyer: {
    name: "Av. [Adınız Soyadınız]",
    firm: "Hukuk Bürosu",
    barNumber: "İstanbul Barosu",
    avatar: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=200",
    phone: "+90 532 000 00 00",
    email: "avukat@hukuk.av.tr"
  },

  cases: [],        // Dava dosyaları
  clients: [],      // Müvekkiller CRM
  tasks: [],        // Yapılacak görevler
  schedule: [],     // Günlük duruşma ve toplantı ajandası
  deadlines: [],    // Takip edilen yasal süreler
  calendarEvents: [], // Takvim etkinlikleri
  expenses: [],     // Masraf ve harç kayıtları
  smmReceipts: [],  // Kesilen / hesaplanan Serbest Meslek Makbuzları
  collectionsTotal: 0, // Toplam tahsilat

  aiTemplates: {
    "is-dilekcesi": {
      name: "İşçilik Alacağı Dava Dilekçesi",
      courtPlaceholder: "Örn: İstanbul 5. İş Mahkemesi Hâkimliği'ne",
      summaryPlaceholder: "Fesih tarihi, çalışma süresi ve ödenmeyen hakları özetleyiniz...",
      claimPlaceholder: "Kıdem, ihbar tazminatı ve fazla mesai alacakları..."
    },
    "cevap-dilekcesi": {
      name: "Cevap Dilekçesi",
      courtPlaceholder: "Örn: İstanbul 12. Asliye Hukuk Mahkemesi'ne",
      summaryPlaceholder: "Davacının iddialarına karşı itiraz ve savunmalarınız...",
      claimPlaceholder: "Haksız davanın usulden ve esastan reddi talebi..."
    },
    "istinaf-dilekcesi": {
      name: "İstinaf Başvuru Dilekçesi",
      courtPlaceholder: "Örn: İstanbul Bölge Adliye Mahkemesi İlgili Hukuk Dairesi'ne",
      summaryPlaceholder: "İlk derece mahkemesi kararının usul ve yasaya aykırı yönleri...",
      claimPlaceholder: "İlk derece mahkemesi kararının kaldırılarak davanın kabulü..."
    },
    "ihtarname": {
      name: "Noter İhtarnamesi",
      courtPlaceholder: "Örn: Beyoğlu 24. Noterliği'ne",
      summaryPlaceholder: "İhtar konusu olay ve sözleşme ihlali...",
      claimPlaceholder: "Belirlenen süre içinde ifa veya ödeme ihtarı..."
    }
  }
};

const DataStore = {
  data: null,

  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.data = JSON.parse(saved);
        if (!this.data.clients) this.data.clients = [];
        if (!this.data.expenses) this.data.expenses = [];
        if (!this.data.smmReceipts) this.data.smmReceipts = [];
      } catch (e) {
        this.data = JSON.parse(JSON.stringify(DEFAULT_EMPTY_STATE));
      }
    } else {
      this.data = JSON.parse(JSON.stringify(DEFAULT_EMPTY_STATE));
      this.save();
    }
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  },

  resetAll() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_EMPTY_STATE));
    this.save();
  },

  // Cases
  getCases() {
    return this.data.cases || [];
  },

  addCase(caseItem) {
    if (!this.data.cases) this.data.cases = [];
    this.data.cases.unshift(caseItem);
    this.save();
  },

  getCaseById(id) {
    return (this.data.cases || []).find(c => c.id === id);
  },

  // Clients
  getClients() {
    return this.data.clients || [];
  },

  addClient(clientItem) {
    if (!this.data.clients) this.data.clients = [];
    this.data.clients.unshift(clientItem);
    this.save();
  },

  // Tasks
  getTasks() {
    return this.data.tasks || [];
  },

  addTask(taskItem) {
    if (!this.data.tasks) this.data.tasks = [];
    this.data.tasks.unshift(taskItem);
    this.save();
  },

  toggleTask(taskId) {
    const task = (this.data.tasks || []).find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      task.due = task.completed ? 'Tamamlandı' : 'Aktif';
      task.dueType = task.completed ? 'success' : 'danger';
      this.save();
    }
    return task;
  },

  deleteTask(taskId) {
    this.data.tasks = (this.data.tasks || []).filter(t => t.id !== taskId);
    this.save();
  },

  // Schedule
  getSchedule() {
    return this.data.schedule || [];
  },

  addScheduleItem(item) {
    if (!this.data.schedule) this.data.schedule = [];
    this.data.schedule.push(item);
    this.save();
  },

  // Deadlines
  getDeadlines() {
    return this.data.deadlines || [];
  },

  addDeadline(dl) {
    if (!this.data.deadlines) this.data.deadlines = [];
    this.data.deadlines.push(dl);
    this.save();
  },

  // Calendar
  getCalendarEvents() {
    return this.data.calendarEvents || [];
  },

  addCalendarEvent(eventItem) {
    if (!this.data.calendarEvents) this.data.calendarEvents = [];
    this.data.calendarEvents.push(eventItem);
    this.save();
  },

  // Expenses & Finance
  getExpenses() {
    return this.data.expenses || [];
  },

  addExpense(exp) {
    if (!this.data.expenses) this.data.expenses = [];
    this.data.expenses.unshift(exp);
    this.save();
  },

  addSMMReceipt(receipt) {
    if (!this.data.smmReceipts) this.data.smmReceipts = [];
    this.data.smmReceipts.unshift(receipt);
    this.data.collectionsTotal = (this.data.collectionsTotal || 0) + (receipt.netAmount || 0);
    this.save();
  },

  getStats() {
    const cases = this.getCases();
    const activeCases = cases.filter(c => c.status === 'Aktif').length;
    const schedule = this.getSchedule();
    const todayHearings = schedule.filter(s => s.type === 'hearing').length;
    const tasks = this.getTasks();
    const pendingTasks = tasks.filter(t => !t.completed).length;
    const collections = this.data.collectionsTotal || 0;

    return {
      activeCases,
      todayHearings,
      pendingTasks,
      clientsCount: (this.data.clients || []).length,
      collections: collections.toLocaleString('tr-TR') + ' TL'
    };
  }
};

DataStore.init();
const MOCK_DATA = DataStore.data;
