// ADN - Kasa, Masraf & Finans Yönetimi

const FinanceModule = {
  init() {
    this.renderFinanceOverview();
    this.renderExpensesTable();
    this.renderReceiptsTable();
    this.setupEventListeners();
  },

  renderFinanceOverview() {
    const expenses = DataStore.getExpenses();
    const receipts = DataStore.data.smmReceipts || [];

    const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalCollected = DataStore.data.collectionsTotal || 0;
    const balance = totalCollected - totalExpense;

    const elCol = document.getElementById('finTotalCollected');
    const elExp = document.getElementById('finTotalExpense');
    const elBal = document.getElementById('finBalance');

    const fmt = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL';

    if (elCol) elCol.textContent = fmt(totalCollected);
    if (elExp) elExp.textContent = fmt(totalExpense);
    if (elBal) elBal.textContent = fmt(balance);
  },

  renderExpensesTable() {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;

    const expenses = DataStore.getExpenses();

    if (expenses.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8; font-size: 0.82rem;">
            Henüz kayıtlı dosya masrafı bulunmuyor.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = expenses.map(exp => `
      <tr style="border-bottom: 1px solid var(--border-light);">
        <td style="padding: 12px 14px; font-weight: 600;">${exp.date}</td>
        <td style="padding: 12px 14px; font-weight: 700; color: #2563eb;">${exp.caseTitle || 'Genel'}</td>
        <td style="padding: 12px 14px;">${exp.type}</td>
        <td style="padding: 12px 14px; color: #64748b;">${exp.description || '-'}</td>
        <td style="padding: 12px 14px; font-weight: 700; color: #dc2626; text-align: right;">
          -${exp.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
        </td>
      </tr>
    `).join('');
  },

  renderReceiptsTable() {
    const tbody = document.getElementById('smmTableBody');
    if (!tbody) return;

    const receipts = DataStore.data.smmReceipts || [];

    if (receipts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8; font-size: 0.82rem;">
            Henüz kesilen Serbest Meslek Makbuzu bulunmuyor.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = receipts.map(r => `
      <tr style="border-bottom: 1px solid var(--border-light);">
        <td style="padding: 12px 14px; font-weight: 700; color: #2563eb;">${r.receiptNo}</td>
        <td style="padding: 12px 14px; font-weight: 600;">${r.client}</td>
        <td style="padding: 12px 14px; color: #64748b;">${r.description}</td>
        <td style="padding: 12px 14px;">${r.date}</td>
        <td style="padding: 12px 14px; font-weight: 800; color: #059669; text-align: right;">
          +${r.totalCollected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
        </td>
      </tr>
    `).join('');
  },

  promptAddExpense() {
    const amountStr = prompt('Masraf Tutarı (TL):');
    if (!amountStr) return;
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    const type = prompt('Masraf Türü (Örn: Bilirkişi Ücreti, Peşin Harç, Tebligat, Keşif):', 'Bilirkişi Ücreti') || 'Masraf';
    const caseTitle = prompt('İlgili Dava / Dosya:', '') || 'Genel Dosya Masrafı';
    const desc = prompt('Açıklama:') || '';

    DataStore.addExpense({
      id: 'exp-' + Date.now(),
      amount: amount,
      type: type,
      caseTitle: caseTitle,
      description: desc,
      date: new Date().toLocaleDateString('tr-TR')
    });

    this.renderFinanceOverview();
    this.renderExpensesTable();
    App.showToast('Masraf kaydı başarıyla eklendi.');
  },

  setupEventListeners() {}
};
