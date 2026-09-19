// ADN - Hukuki Hesaplama Araçları (SMM, Yasal Süre, Harç Hesaplayıcı)

const LegalCalculator = {
  
  init() {
    // Set default date to today for deadline calculator
    const dateInput = document.getElementById('calcServiceDate');
    if (dateInput && !dateInput.value) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // Set default SMM amount if empty
    const smmInput = document.getElementById('smmAmountInput');
    if (smmInput && !smmInput.value) {
      smmInput.value = '25000';
    }

    // Set default claim amount for court fees
    const harcInput = document.getElementById('harcClaimAmount');
    if (harcInput && !harcInput.value) {
      harcInput.value = '100000';
    }

    this.calculateSMM();
    this.calculateDeadline();
    this.calculateCourtFees();
  },

  // =========================================================================
  // 1. SERBEST MESLEK MAKBUZU (SMM) HESAPLAYICI
  // =========================================================================
  calculateSMM() {
    const inputType = document.querySelector('input[name="smmCalcType"]:checked')?.value || 'gross';
    const amount = parseFloat(document.getElementById('smmAmountInput')?.value) || 0;
    const kdvRate = parseFloat(document.getElementById('smmKdvSelect')?.value) || 20;
    const stoppageRate = parseFloat(document.getElementById('smmStoppageSelect')?.value) || 20;
    const tevkifatType = document.getElementById('smmTevkifatSelect')?.value || 'none';

    let gross = 0;
    let stoppage = 0;
    let net = 0;
    let kdvTotal = 0;
    let tevkifatAmount = 0;
    let kdvCollected = 0;
    let totalPayable = 0;

    if (amount <= 0) {
      this.updateSMMUI(0, 0, 0, 0, 0, 0, 0);
      return;
    }

    if (inputType === 'gross') {
      gross = amount;
      stoppage = gross * (stoppageRate / 100);
      net = gross - stoppage;
      kdvTotal = gross * (kdvRate / 100);
    } else {
      // Net to Gross
      const stoppageDivisor = 1 - (stoppageRate / 100);
      gross = stoppageDivisor > 0 ? (amount / stoppageDivisor) : amount;
      stoppage = gross * (stoppageRate / 100);
      net = amount;
      kdvTotal = gross * (kdvRate / 100);
    }

    if (tevkifatType === '5_10') {
      tevkifatAmount = kdvTotal * 0.5; // 5/10
      kdvCollected = kdvTotal - tevkifatAmount;
    } else {
      tevkifatAmount = 0;
      kdvCollected = kdvTotal;
    }

    totalPayable = net + kdvCollected;

    this.updateSMMUI(gross, stoppage, net, kdvTotal, tevkifatAmount, kdvCollected, totalPayable);
  },

  updateSMMUI(gross, stoppage, net, kdvTotal, tevkifat, kdvCollected, totalPayable) {
    const format = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';

    const elGross = document.getElementById('smmResGross');
    const elStop = document.getElementById('smmResStoppage');
    const elNet = document.getElementById('smmResNet');
    const elKdv = document.getElementById('smmResKdvTotal');
    const elTev = document.getElementById('smmResTevkifat');
    const elColKdv = document.getElementById('smmResCollectedKdv');
    const elTotal = document.getElementById('smmResTotalPayable');

    if (elGross) elGross.textContent = format(gross);
    if (elStop) elStop.textContent = (stoppage > 0 ? '-' : '') + format(stoppage);
    if (elNet) elNet.textContent = format(net);
    if (elKdv) elKdv.textContent = '+' + format(kdvTotal);
    if (elTev) elTev.textContent = (tevkifat > 0 ? '-' : '') + format(tevkifat);
    if (elColKdv) elColKdv.textContent = '+' + format(kdvCollected);
    if (elTotal) elTotal.textContent = format(totalPayable);

    this.lastSMM = {
      gross, stoppage, net, kdvTotal, tevkifat, totalPayable,
      date: new Date().toLocaleDateString('tr-TR')
    };
  },

  saveSMMToFinance() {
    if (!this.lastSMM || this.lastSMM.gross <= 0) {
      App.showToast('Lütfen önce geçerli bir tutar girerek hesaplama yapınız.');
      return;
    }

    const client = prompt('Makbuz kesilen müvekkil adı:', '') || 'Müvekkil';
    const desc = prompt('Hizmet açıklaması:', 'Vekâlet Ücreti / Hukuki Danışmanlık') || 'Vekâlet Ücreti';

    DataStore.addSMMReceipt({
      id: 'smm-' + Date.now(),
      receiptNo: 'SMM-2026/' + Math.floor(100 + Math.random() * 900),
      client: client,
      description: desc,
      grossAmount: this.lastSMM.gross,
      netAmount: this.lastSMM.net,
      totalCollected: this.lastSMM.totalPayable,
      date: this.lastSMM.date
    });

    DashboardModule.updateStats();
    if (FinanceModule) {
      FinanceModule.renderFinanceOverview();
      FinanceModule.renderReceiptsTable();
    }
    App.showToast('Serbest Meslek Makbuzu kaydedildi ve büro tahsilatına eklendi!');
  },

  // =========================================================================
  // 2. YASAL SÜRE HESAPLAYICI (HMK / İİK / CMK)
  // =========================================================================
  calculateDeadline() {
    const serviceDateInput = document.getElementById('calcServiceDate')?.value;
    const ruleType = document.getElementById('calcDeadlineRule')?.value || 'hmk_2_weeks';
    const resultBox = document.getElementById('calcDeadlineResultBox');

    if (!serviceDateInput) {
      if (resultBox) resultBox.innerHTML = '<p style="color: #94a3b8; font-size: 0.85rem;">Lütfen geçerli bir tebliğ tarihi seçiniz.</p>';
      return;
    }

    const serviceDate = new Date(serviceDateInput + 'T00:00:00');
    let targetDate = new Date(serviceDate);
    let ruleName = '';
    let explanation = '';

    if (ruleType === 'hmk_2_weeks') {
      ruleName = 'HMK Cevap / İstinaf Süresi (2 Hafta)';
      targetDate.setDate(targetDate.getDate() + 14);
      explanation = 'HMK m. 92 uyarınca süre hafta olarak belirlenmişse, başladığı güne son haftada tekabül eden günün mesai saati bitiminde sona erer.';
    } else if (ruleType === 'iik_7_days') {
      ruleName = 'İcra Ödeme Emrine İtiraz (7 Gün)';
      targetDate.setDate(targetDate.getDate() + 7);
      explanation = 'İİK m. 62 uyarınca ödeme emrinin tebliğinden itibaren 7 gün içinde icra dairesine itiraz edilmelidir.';
    } else if (ruleType === 'cmk_7_days') {
      ruleName = 'Ceza Mahkemesi İstinaf Süresi (7 Gün)';
      targetDate.setDate(targetDate.getDate() + 7);
      explanation = 'CMK m. 273 uyarınca hükmün tefhim veya tebliğinden itibaren 7 gün içinde istinaf yoluna başvurulur.';
    } else if (ruleType === 'iik_5_days') {
      ruleName = 'Kambiyo Senetlerine İtiraz (5 Gün)';
      targetDate.setDate(targetDate.getDate() + 5);
      explanation = 'İİK m. 168 uyarınca kambiyo takibinde itiraz ve şikayet süresi 5 gündür.';
    } else if (ruleType === 'iyuk_30_days') {
      ruleName = 'İdari Yargı Dava / İstinaf Süresi (30 Gün)';
      targetDate.setDate(targetDate.getDate() + 30);
      explanation = 'İYUK m. 7 uyarınca idare mahkemelerinde dava açma ve istinaf süresi 30 gündür.';
    } else if (ruleType === 'custom_days') {
      ruleName = 'Özel Mehil Süresi (15 Gün)';
      targetDate.setDate(targetDate.getDate() + 15);
      explanation = '15 günlük yasal / mahkeme kesin mehil süresi.';
    }

    // Weekend check
    let rollOverNotice = '';
    const dayOfWeek = targetDate.getDay();
    if (dayOfWeek === 6) { // Saturday -> Monday
      targetDate.setDate(targetDate.getDate() + 2);
      rollOverNotice = '⚠️ Sürenin son günü Cumartesi gününe rastladığından ilk mesai günü olan Pazartesi gününe uzamıştır (HMK m. 92).';
    } else if (dayOfWeek === 0) { // Sunday -> Monday
      targetDate.setDate(targetDate.getDate() + 1);
      rollOverNotice = '⚠️ Sürenin son günü Pazar gününe rastladığından ilk mesai günü olan Pazartesi gününe uzamıştır (HMK m. 92).';
    }

    // Adli Tatil check
    let adliTatilNotice = '';
    const m = targetDate.getMonth();
    const d = targetDate.getDate();
    if ((m === 6 && d >= 20) || (m === 7)) {
      adliTatilNotice = '⚖️ Dikkat: Son gün Adli Tatil (20 Temmuz - 31 Ağustos) içerisine denk gelmektedir. Adli tatilde görülemeyen işlerde süre adli tatilin bitiminden itibaren 1 hafta (7 Eylül mesai sonu) uzar (HMK m. 104).';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateFormatted = targetDate.toLocaleDateString('tr-TR', options);

    this.calculatedDeadline = {
      title: ruleName,
      dueDate: targetDate.toLocaleDateString('tr-TR'),
      daysLeft: diffDays,
      serviceDate: serviceDate.toLocaleDateString('tr-TR')
    };

    if (resultBox) {
      resultBox.innerHTML = `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-top: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; font-weight: 700; color: #475569; text-transform: uppercase;">Son İşlem Günü</span>
            <span class="deadline-badge ${diffDays <= 3 ? 'badge-urgent-red' : 'badge-urgent-blue'}" style="font-size: 0.82rem;">
              ${diffDays > 0 ? (diffDays + ' gün kaldı') : (diffDays === 0 ? 'Bugün son gün!' : 'Süre doldu')}
            </span>
          </div>
          <div style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
            ${dateFormatted}
          </div>
          <p style="font-size: 0.78rem; color: #64748b; margin-bottom: 8px;">${explanation}</p>
          ${rollOverNotice ? `<p style="font-size: 0.76rem; color: #d97706; font-weight: 600; margin-bottom: 6px;">${rollOverNotice}</p>` : ''}
          ${adliTatilNotice ? `<p style="font-size: 0.76rem; color: #dc2626; font-weight: 600; margin-bottom: 6px;">${adliTatilNotice}</p>` : ''}
          <button class="btn-primary" style="margin-top: 10px; width: 100%; justify-content: center;" onclick="LegalCalculator.addCalculatedDeadlineToSystem()">
            + Bu Süreyi Takvime ve Takibe Ekle
          </button>
        </div>
      `;
    }
  },

  addCalculatedDeadlineToSystem() {
    if (!this.calculatedDeadline) return;

    const caseInfo = prompt('Dosya Adı / Esas No (Örn: 2026/342 veya Ahmet Yılmaz):') || 'Dosya Belirtilmedi';

    DataStore.addDeadline({
      id: 'dl-' + Date.now(),
      title: this.calculatedDeadline.title,
      caseTitle: caseInfo,
      daysLeft: this.calculatedDeadline.daysLeft,
      dueDate: this.calculatedDeadline.dueDate,
      statusBadge: this.calculatedDeadline.daysLeft > 0 ? `${this.calculatedDeadline.daysLeft} gün kaldı` : 'Bugün'
    });

    DashboardModule.renderUrgentAlert();
    CalendarModule.renderDeadlines();
    App.showToast(`'${this.calculatedDeadline.title}' takvime ve kritik süreler listesine eklendi!`);
  },

  // =========================================================================
  // 3. DAVA HARÇ & GİDER AVANSI HESAPLAYICI
  // =========================================================================
  calculateCourtFees() {
    const claimAmount = parseFloat(document.getElementById('harcClaimAmount')?.value) || 0;
    const isNispi = document.querySelector('input[name="harcType"]:checked')?.value === 'nispi';

    const basvuruHarci = 427.60;
    const vekaletHarci = 60.80;
    let pesinHarc = 0;
    const giderAvansi = 1500.00;

    if (isNispi && claimAmount > 0) {
      pesinHarc = (claimAmount * 0.06831) / 4;
    } else {
      pesinHarc = 427.60;
    }

    const total = basvuruHarci + vekaletHarci + pesinHarc + giderAvansi;
    const format = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';

    const elBasvuru = document.getElementById('harcResBasvuru');
    const elPesin = document.getElementById('harcResPesin');
    const elGider = document.getElementById('harcResGider');
    const elTotal = document.getElementById('harcResTotal');

    if (elBasvuru) elBasvuru.textContent = format(basvuruHarci + vekaletHarci);
    if (elPesin) elPesin.textContent = format(pesinHarc);
    if (elGider) elGider.textContent = format(giderAvansi);
    if (elTotal) elTotal.textContent = format(total);
  }
};
