// ADN - 04 Takvim & Süre Takibi Controller

const CalendarModule = {
  currentYear: 2026,
  currentMonth: 2, // 2 = March
  activeDeadlineFilter: 'all',
  currentView: 'ay',

  init() {
    this.renderCalendarView();
    this.renderDeadlines();
    this.setupEventListeners();
  },

  renderCalendarView() {
    const gridEl = document.getElementById('bigCalendarGrid');
    const titleEl = document.getElementById('calCurrentMonthTitle');
    if (!gridEl || !titleEl) return;

    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    titleEl.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;

    if (this.currentView === 'ay') {
      this.renderMonthGrid(gridEl);
    } else if (this.currentView === 'hafta') {
      this.renderWeekGrid(gridEl);
    } else if (this.currentView === 'gün') {
      this.renderDayGrid(gridEl);
    }
  },

  renderMonthGrid(gridEl) {
    const firstDayIndex = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const startingDay = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;
    const totalDays = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(this.currentYear, this.currentMonth, 0).getDate();

    let html = '';

    for (let i = startingDay - 1; i >= 0; i--) {
      html += `
        <div class="calendar-cell other-month">
          <span class="cell-day-num">${prevMonthDays - i}</span>
        </div>
      `;
    }

    const allEvents = DataStore.getCalendarEvents();

    for (let day = 1; day <= totalDays; day++) {
      const isToday = (day === 14 && this.currentMonth === 2 && this.currentYear === 2026);
      const events = allEvents.filter(
        e => e.date === day && e.month === this.currentMonth && e.year === this.currentYear
      );

      html += `
        <div class="calendar-cell ${isToday ? 'is-today' : ''}" onclick="CalendarModule.onDayClick(${day})">
          <span class="cell-day-num">${day}</span>
          ${events.map(ev => `
            <div class="cal-event-chip chip-${ev.color || 'blue'}" title="${ev.title}">
              ${ev.title}
            </div>
          `).join('')}
        </div>
      `;
    }

    const totalRendered = startingDay + totalDays;
    const remaining = (totalRendered % 7 === 0) ? 0 : 7 - (totalRendered % 7);
    for (let nextDay = 1; nextDay <= remaining; nextDay++) {
      html += `
        <div class="calendar-cell other-month">
          <span class="cell-day-num">${nextDay}</span>
        </div>
      `;
    }

    gridEl.style.display = 'grid';
    gridEl.style.gridTemplateColumns = 'repeat(7, 1fr)';
    gridEl.innerHTML = html;
  },

  renderWeekGrid(gridEl) {
    const allEvents = DataStore.getCalendarEvents();
    let html = '';

    const weekDays = [
      { day: 9, label: '9 Mart Pzt' },
      { day: 10, label: '10 Mart Sal' },
      { day: 11, label: '11 Mart Çar' },
      { day: 12, label: '12 Mart Per' },
      { day: 13, label: '13 Mart Cum' },
      { day: 14, label: '14 Mart Cts (Bugün)' },
      { day: 15, label: '15 Mart Paz' }
    ];

    html = weekDays.map(wd => {
      const events = allEvents.filter(e => e.date === wd.day && e.month === this.currentMonth);
      return `
        <div class="calendar-cell ${wd.day === 14 ? 'is-today' : ''}" style="min-height: 240px;" onclick="CalendarModule.onDayClick(${wd.day})">
          <span class="cell-day-num" style="width: auto; border-radius: 4px; padding: 2px 6px;">${wd.label}</span>
          <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
            ${events.length > 0 ? events.map(ev => `
              <div class="cal-event-chip chip-${ev.color || 'blue'}">${ev.title}</div>
            `).join('') : '<span style="color: #cbd5e1; font-size: 0.72rem;">Etkinlik yok</span>'}
          </div>
        </div>
      `;
    }).join('');

    gridEl.style.display = 'grid';
    gridEl.style.gridTemplateColumns = 'repeat(7, 1fr)';
    gridEl.innerHTML = html;
  },

  renderDayGrid(gridEl) {
    const allEvents = DataStore.getCalendarEvents().filter(e => e.date === 14 && e.month === this.currentMonth);
    const schedule = DataStore.getSchedule();

    gridEl.style.display = 'block';
    gridEl.innerHTML = `
      <div style="padding: 24px; background: #ffffff;">
        <h4 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 16px;">14 Mart 2026 - Günün Duruşma & Randevu Planı</h4>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${schedule.length > 0 ? schedule.map(s => `
            <div style="display: flex; gap: 14px; padding: 12px; background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 4px;">
              <strong style="width: 50px;">${s.time}</strong>
              <div>
                <div style="font-weight: 700;">${s.typeLabel} - ${s.caseNo || ''}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${s.court} • ${s.parties}</div>
              </div>
            </div>
          `).join('') : `
            <div style="text-align: center; padding: 24px; color: #94a3b8;">
              Bugün için planlanmış celse kaydı bulunmuyor.<br>
              <button class="btn-outline" style="margin-top: 10px;" onclick="App.openAddScheduleModal()">+ Duruşma Ekle</button>
            </div>
          `}
        </div>
      </div>
    `;
  },

  renderDeadlines() {
    const listEl = document.getElementById('deadlinesList');
    if (!listEl) return;

    let items = DataStore.getDeadlines();

    if (items.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; color: #94a3b8; font-size: 0.85rem;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin-bottom: 10px;">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <p style="font-weight: 600; color: #64748b;">Takip edilen süre kaydı bulunmuyor.</p>
          <p style="font-size: 0.78rem; margin-top: 4px;">İstinaf, cevap dilekçesi veya tebligat süresi ekleyebilirsiniz.</p>
          <button class="btn-outline" style="margin-top: 14px; font-size: 0.78rem;" onclick="CalendarModule.promptNewDeadline()">
            + Yeni Süre Takibi Ekle
          </button>
        </div>
      `;
      return;
    }

    if (this.activeDeadlineFilter === 'hearings') {
      items = items.filter(d => d.title.toLowerCase().includes('duruşma'));
    } else if (this.activeDeadlineFilter === 'deadlines') {
      items = items.filter(d => !d.title.toLowerCase().includes('duruşma'));
    }

    listEl.innerHTML = items.map(dl => {
      let badgeClass = 'badge-urgent-blue';
      let barClass = 'bar-info';

      if (dl.daysLeft <= 3) {
        badgeClass = 'badge-urgent-red';
        barClass = 'bar-critical';
      } else if (dl.daysLeft <= 7) {
        badgeClass = 'badge-urgent-orange';
        barClass = 'bar-warning';
      }

      return `
        <div class="deadline-item">
          <div class="deadline-left">
            <div class="deadline-icon-bar ${barClass}"></div>
            <div class="deadline-info">
              <h4>${dl.title}</h4>
              <p>${dl.caseTitle || ''}</p>
            </div>
          </div>
          <div class="deadline-right">
            <span class="deadline-badge ${badgeClass}">${dl.statusBadge || (dl.daysLeft + ' gün kaldı')}</span>
            <span class="deadline-date">${dl.dueDate}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  promptNewDeadline() {
    const title = prompt('Süre türü (Örn: İstinaf Süresi, Cevap Dilekçesi, İtiraz):');
    if (!title || !title.trim()) return;

    const caseTitle = prompt('Dosya bilgisi / Müvekkil:') || 'Dosya Belirtilmedi';
    const days = parseInt(prompt('Kalan gün sayısı:', '7'), 10) || 7;

    DataStore.addDeadline({
      id: 'dl-' + Date.now(),
      title: title.trim(),
      caseTitle: caseTitle.trim(),
      daysLeft: days,
      dueDate: `${days} gün sonra`,
      statusBadge: `${days} gün kaldı`
    });

    this.renderDeadlines();
    DashboardModule.renderUrgentAlert();
    App.showToast('Yeni yasal süre takibe alındı.');
  },

  onDayClick(day) {
    const title = prompt(`${day} Mart için yeni etkinlik veya duruşma ekle:`);
    if (title && title.trim()) {
      DataStore.addCalendarEvent({
        date: day,
        month: this.currentMonth,
        year: this.currentYear,
        title: title.trim(),
        color: 'blue'
      });
      this.renderCalendarView();
      DashboardModule.renderMiniCalendar(this.currentYear, this.currentMonth);
      App.showToast(`${day} Mart gününe '${title.trim()}' etkinliği eklendi.`);
    }
  },

  filterDeadlines(type, btn) {
    this.activeDeadlineFilter = type;
    document.querySelectorAll('.deadline-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.renderDeadlines();
  },

  changeMonth(delta) {
    this.currentMonth += delta;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear += 1;
    } else if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear -= 1;
    }
    this.renderCalendarView();
  },

  goToToday() {
    this.currentYear = 2026;
    this.currentMonth = 2;
    this.renderCalendarView();
  },

  switchView(v, btn) {
    this.currentView = v;
    document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.renderCalendarView();
    App.showToast(`${v.toUpperCase()} görünümüne geçildi.`);
  },

  setupEventListeners() {
    const prevBtn = document.getElementById('btnCalPrevMonth');
    const nextBtn = document.getElementById('btnCalNextMonth');
    const todayBtn = document.getElementById('btnCalToday');

    if (prevBtn) prevBtn.addEventListener('click', () => this.changeMonth(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.changeMonth(1));
    if (todayBtn) todayBtn.addEventListener('click', () => this.goToToday());
  }
};
