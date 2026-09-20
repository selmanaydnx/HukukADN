// ADN - 01 Ana Panel (Dashboard) Controller

const DashboardModule = {
  init() {
    this.updateStats();
    this.renderSchedule();
    this.renderTasks();
    this.renderMiniCalendar(2026, 2); // March 2026
    this.renderUrgentAlert();
    this.setupEventListeners();
  },

  updateStats() {
    const stats = DataStore.getStats();
    
    const activeCasesEl = document.getElementById('statActiveCasesValue');
    const todayHearingsEl = document.getElementById('statTodayHearingsValue');
    const pendingTasksEl = document.getElementById('statPendingTasksValue');
    const collectionsEl = document.getElementById('statCollectionsValue');

    if (activeCasesEl) activeCasesEl.textContent = stats.activeCases;
    if (todayHearingsEl) todayHearingsEl.textContent = stats.todayHearings;
    if (pendingTasksEl) pendingTasksEl.textContent = stats.pendingTasks;
    if (collectionsEl) collectionsEl.textContent = stats.collections;
  },

  renderUrgentAlert() {
    const banner = document.getElementById('urgentAlertBanner');
    if (!banner) return;

    const deadlines = DataStore.getDeadlines();
    const urgentCount = deadlines.filter(d => d.daysLeft <= 3).length;

    if (urgentCount === 0) {
      banner.style.background = '#f8fafc';
      banner.style.borderColor = '#e2e8f0';
      banner.innerHTML = `
        <div class="alert-left">
          <div class="alert-badge-icon" style="background: #10b981;">✓</div>
          <span class="alert-message" style="color: #059669;">Yaklaşan acil yasal süre bulunmuyor.</span>
        </div>
        <div class="alert-arrow" style="color: var(--brand-blue);" onclick="App.openAddDeadlineModal()">
          <span>+ Süre Ekle</span>
        </div>
      `;
    } else {
      banner.style.background = '#fff1f2';
      banner.style.borderColor = '#fecdd3';
      banner.innerHTML = `
        <div class="alert-left">
          <div class="alert-badge-icon">!</div>
          <span class="alert-message">${urgentCount} dosyada süre dolmasına 3 gün kaldı</span>
        </div>
        <div class="alert-arrow" onclick="App.navigateTo('calendar')">
          <span>İncele ›</span>
        </div>
      `;
    }
  },

  renderSchedule() {
    const listEl = document.getElementById('todayScheduleList');
    if (!listEl) return;

    const schedule = DataStore.getSchedule();

    if (schedule.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: #94a3b8; font-size: 0.85rem;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin-bottom: 8px;">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <p style="font-weight: 500; color: #64748b;">Bugün için planlanmış duruşma veya etkinlik yok.</p>
          <button class="btn-outline" style="margin-top: 12px; font-size: 0.76rem;" onclick="App.openAddScheduleModal()">
            + Duruşma / Etkinlik Ekle
          </button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = schedule.map(item => `
      <div class="schedule-item">
        <div class="schedule-time">${item.time}</div>
        <div class="schedule-status-dot dot-${item.badgeColor || 'blue'}"></div>
        <div class="schedule-details">
          <div class="schedule-title-row">
            <span class="schedule-title">${item.typeLabel || 'Etkinlik'}</span>
            <span class="badge-tag badge-${item.badgeColor || 'blue'}">${item.caseNo || ''}</span>
          </div>
          <div class="schedule-court">${item.court || ''}</div>
          <div class="schedule-parties">${item.parties || ''}</div>
        </div>
      </div>
    `).join('');
  },

  renderTasks() {
    const listEl = document.getElementById('tasksList');
    if (!listEl) return;

    const tasks = DataStore.getTasks();

    if (tasks.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: #94a3b8; font-size: 0.85rem;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin-bottom: 8px;">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          <p style="font-weight: 500; color: #64748b;">Henüz kayıtlı bir görev bulunmuyor.</p>
          <button class="btn-outline" style="margin-top: 12px; font-size: 0.76rem;" onclick="DashboardModule.promptNewTask()">
            + İlk Görevi Ekle
          </button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = tasks.map(task => `
      <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
        <div class="task-left">
          <div class="task-checkbox" onclick="DashboardModule.toggleTask('${task.id}')">
            ${task.completed ? `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ` : ''}
          </div>
          <span class="task-text" onclick="DashboardModule.toggleTask('${task.id}')">${task.title}</span>
        </div>
        <span class="task-badge badge-${task.dueType || 'danger'}">${task.due}</span>
      </div>
    `).join('');
  },

  toggleTask(taskId) {
    const updated = DataStore.toggleTask(taskId);
    if (updated) {
      this.renderTasks();
      this.updateStats();
      App.showToast(updated.completed ? 'Görev tamamlandı olarak işaretlendi.' : 'Görev aktif hale getirildi.');
    }
  },

  promptNewTask() {
    const title = prompt('Yeni görev başlığı giriniz:');
    if (title && title.trim()) {
      DataStore.addTask({
        id: 'task-' + Date.now(),
        title: title.trim(),
        due: 'Bugün',
        dueType: 'danger',
        completed: false
      });
      this.renderTasks();
      this.updateStats();
      App.showToast('Yeni görev başarıyla eklendi.');
    }
  },

  renderMiniCalendar(year, month) {
    const gridEl = document.getElementById('miniDaysGrid');
    const titleEl = document.getElementById('miniCalTitle');
    if (!gridEl || !titleEl) return;

    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    titleEl.textContent = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startingDay = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    let html = '';

    for (let i = startingDay - 1; i >= 0; i--) {
      html += `<div class="mini-day-cell empty-day">${prevMonthDays - i}</div>`;
    }

    const events = DataStore.getCalendarEvents();

    for (let day = 1; day <= totalDays; day++) {
      const isToday = (day === 14 && month === 2 && year === 2026);
      const hasEvent = events.some(e => e.date === day && e.month === month && e.year === year);

      html += `
        <div class="mini-day-cell ${isToday ? 'today' : ''}" onclick="App.navigateTo('calendar')">
          ${day}
          ${hasEvent ? '<span class="event-dot"></span>' : ''}
        </div>
      `;
    }

    gridEl.innerHTML = html;
  },

  setupEventListeners() {
    const newTaskBtn = document.getElementById('addNewTaskBtn');
    if (newTaskBtn) {
      newTaskBtn.addEventListener('click', () => this.promptNewTask());
    }
  }
};
