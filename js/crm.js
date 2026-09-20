// ADN - Müvekkil CRM & İletişim Portalı

const CRMModule = {
  init() {
    this.renderClientsList();
    this.setupEventListeners();
  },

  renderClientsList() {
    const container = document.getElementById('clientsCardsGrid');
    if (!container) return;

    const clients = DataStore.getClients();

    if (clients.length === 0) {
      container.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 48px 24px;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #eff6ff; color: var(--brand-blue); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Kayıtlı Müvekkil Bulunmuyor</h3>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 18px;">
            Müvekkillerinizi ve vekâletname bilgilerini kaydederek duruşma ve süre güncellemelerini WhatsApp ile kolayca paylaşabilirsiniz.
          </p>
          <button class="btn-primary" onclick="CRMModule.openNewClientModal()">
            + İlk Müvekkili Ekle
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = clients.map(cl => `
      <div class="card" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main);">${cl.name}</h4>
              <span style="font-size: 0.72rem; color: #64748b;">${cl.type === 'corporate' ? 'Kurumsal Müvekkil' : 'Bireysel Müvekkil'} • ${cl.taxNo || 'TC/VKN Belirtilmedi'}</span>
            </div>
            <span class="badge-tag badge-blue">${cl.activeCasesCount || 1} Dosya</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem; color: var(--text-main); margin-bottom: 16px;">
            <div><strong>Telefon:</strong> <span style="color: #2563eb;">${cl.phone || '-'}</span></div>
            <div><strong>E-posta:</strong> <span>${cl.email || '-'}</span></div>
            <div><strong>Vekâletname:</strong> <span style="color: #059669;">${cl.powerOfAttorney || 'Vekaletname Bilgisi Yok'}</span></div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-light); padding-top: 14px;">
          <button class="btn-outline" style="flex: 1; font-size: 0.75rem; justify-content: center; gap: 4px;" onclick="CRMModule.openWhatsAppModal('${cl.id}')">
            <span>💬 WhatsApp Bilgilendir</span>
          </button>
          <button class="btn-outline" style="padding: 6px 10px; font-size: 0.75rem;" onclick="CRMModule.createCaseForClient('${cl.id}')" title="Bu Müvekkile Dava Aç">
            + Dava Aç
          </button>
        </div>
      </div>
    `).join('');
  },

  openNewClientModal() {
    const modal = document.getElementById('newClientModal');
    if (modal) modal.style.display = 'flex';
  },

  openWhatsAppModal(clientId) {
    const cl = DataStore.getClients().find(c => c.id === clientId);
    if (!cl) return;

    this.selectedClient = cl;
    const modal = document.getElementById('whatsappModal');
    const clientNameEl = document.getElementById('waClientName');
    const previewEl = document.getElementById('waMessagePreview');

    if (clientNameEl) clientNameEl.textContent = cl.name;

    this.updateWAMessage('hearing');
    if (modal) modal.style.display = 'flex';
  },

  updateWAMessage(templateType) {
    const cl = this.selectedClient;
    const previewEl = document.getElementById('waMessagePreview');
    if (!previewEl || !cl) return;

    const lawyerName = DataStore.data.currentLawyer?.name || 'Avukatınız';
    const firm = DataStore.data.currentLawyer?.firm || 'Hukuk Bürosu';

    let text = '';
    if (templateType === 'hearing') {
      text = `Sayın ${cl.name},\n\nHukuk büromuz nezdinde takibi yapılan dava dosyanızın bir sonraki duruşması planlanmıştır.\n\n📅 Duruşma Tarihi: 14 Mart 2026\n⏰ Saat: 10:30\n⚖️ Mahkeme: İstanbul İş Mahkemesi\n\nGerektiğinde tarafınıza ek bilgilendirme sağlanacaktır. Bilgilerinize sunar, iyi günler dileriz.\n\n${lawyerName}\n${firm}`;
    } else if (templateType === 'expense') {
      text = `Sayın ${cl.name},\n\nTakip edilen dava dosyanızda mahkeme ara kararı uyarınca yatırılması gereken bilirkişi ve tebligat gider avansı bulunmaktadır.\n\nİlgili masraf tutarı ve büro hesap detayları tarafınıza iletilmiştir. Bilgilerinize sunarız.\n\n${lawyerName}\n${firm}`;
    } else if (templateType === 'decision') {
      text = `Sayın ${cl.name},\n\nMahkemece görülen davanız karara çıkmış olup gerekçeli karar tebliğ alınmıştır. Karar lehimize sonuçlanmış olup detaylar için ofisimizle iletişime geçebilirsiniz.\n\n${lawyerName}\n${firm}`;
    }

    previewEl.value = text;
  },

  sendWhatsApp() {
    const previewEl = document.getElementById('waMessagePreview');
    const phone = this.selectedClient?.phone?.replace(/\D/g, '') || '';
    if (!previewEl) return;

    const text = encodeURIComponent(previewEl.value);
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } else {
      navigator.clipboard.writeText(previewEl.value);
      App.showToast('Müvekkilin telefon numarası girilmediği için mesaj panoya kopyalandı.');
    }
  },

  createCaseForClient(clientId) {
    const cl = DataStore.getClients().find(c => c.id === clientId);
    if (!cl) return;

    const modal = document.getElementById('newCaseModal');
    const clientInput = document.getElementById('newClientInput');
    if (clientInput) clientInput.value = cl.name;
    if (modal) modal.style.display = 'flex';
  },

  setupEventListeners() {
    const form = document.getElementById('newClientForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('clientNameInput')?.value.trim();
        const phone = document.getElementById('clientPhoneInput')?.value.trim();
        const email = document.getElementById('clientEmailInput')?.value.trim();
        const taxNo = document.getElementById('clientTaxNoInput')?.value.trim();
        const notary = document.getElementById('clientNotaryInput')?.value.trim();
        const journal = document.getElementById('clientJournalInput')?.value.trim();

        if (name) {
          const powerText = notary ? `${notary} - Yevmiye: ${journal || '-'}` : 'Vekâletname eklenmedi';

          DataStore.addClient({
            id: 'cl-' + Date.now(),
            name: name,
            phone: phone,
            email: email,
            taxNo: taxNo,
            powerOfAttorney: powerText,
            activeCasesCount: 0
          });

          form.reset();
          document.getElementById('newClientModal').style.display = 'none';
          this.renderClientsList();
          DashboardModule.updateStats();
          App.showToast(`'${name}' müvekkil kaydı başarıyla oluşturuldu.`);
        }
      });
    }
  }
};
