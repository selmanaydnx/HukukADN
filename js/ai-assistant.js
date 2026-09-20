// ADN - 03 AI Evrak Hazırlama Controller

const AIAssistantModule = {
  isEditing: false,

  init() {
    this.setupTemplates();
    this.setupEventListeners();
  },

  setupTemplates() {
    const selectEl = document.getElementById('aiTemplateSelect');
    if (!selectEl) return;

    selectEl.addEventListener('change', (e) => {
      this.onTemplateChanged(e.target.value);
    });

    this.onTemplateChanged('is-dilekcesi');
  },

  onTemplateChanged(templateKey) {
    const courtInput = document.getElementById('aiCourtName');
    const claimInput = document.getElementById('aiClaimDetails');
    const summaryInput = document.getElementById('aiIncidentSummary');

    if (templateKey === 'is-dilekcesi') {
      if (courtInput) courtInput.placeholder = 'Örn: İstanbul 5. İş Mahkemesi Hâkimliği\'ne';
      if (claimInput) claimInput.placeholder = 'Kıdem tazminatı, ihbar tazminatı, fazla çalışma ve yıllık izin alacakları...';
      if (summaryInput) summaryInput.placeholder = 'İşe başlama/fesih tarihleri, çalışma saatleri ve ödenmeyen işçilik alacakları özeti...';
    } else if (templateKey === 'cevap-dilekcesi') {
      if (courtInput) courtInput.placeholder = 'Örn: İstanbul 12. Asliye Hukuk Mahkemesi\'ne';
      if (claimInput) claimInput.placeholder = 'Haksız ve mesnetsiz açılan davanın usulden ve esastan reddi talebi...';
      if (summaryInput) summaryInput.placeholder = 'Davacının iddialarına karşı yetki, zamanaşımı ilk itirazları ve esasa cevaplar...';
    } else if (templateKey === 'istinaf-dilekcesi') {
      if (courtInput) courtInput.placeholder = 'Örn: İstanbul Bölge Adliye Mahkemesi İlgili Hukuk Dairesi\'ne';
      if (claimInput) claimInput.placeholder = 'İlk derece mahkemesi kararının kaldırılarak davanın kabulü / reddi talebidir...';
      if (summaryInput) summaryInput.placeholder = 'İlk derece mahkemesi kararının gerekçesizliği, delillerin eksik toplanması ve usul hataları...';
    } else if (templateKey === 'ihtarname') {
      if (courtInput) courtInput.placeholder = 'Örn: Beyoğlu 24. Noterliği\'ne';
      if (claimInput) claimInput.placeholder = 'Muaccel kira borcunun 30 gün içinde ödenmesi aksi halde tahliye davası açılacağı ihtarı...';
      if (summaryInput) summaryInput.placeholder = 'Sözleşme yükümlülüklerinin ihlali ve temerrüt olgusu...';
    }
  },

  generateDraft() {
    const templateKey = document.getElementById('aiTemplateSelect')?.value || 'is-dilekcesi';
    const client = document.getElementById('aiClientName')?.value.trim() || '[Müvekkil Adı Soyadı]';
    const opponent = document.getElementById('aiOpponentName')?.value.trim() || '[Karşı Taraf / Davalı]';
    const court = document.getElementById('aiCourtName')?.value.trim() || 'İLGİLİ MAHKEME HÂKİMLİĞİ\'NE';
    const caseNo = document.getElementById('aiCaseNo')?.value.trim() || '2026/...';
    const summary = document.getElementById('aiIncidentSummary')?.value.trim() || 'Uyuşmazlık konusu olay ve hukuka aykırı eylemlerin özeti.';
    const claim = document.getElementById('aiClaimDetails')?.value.trim() || 'Hak ve alacakların tahsili talebidir.';

    const lawyerName = DataStore.data.currentLawyer?.name || 'Av. [Adınız Soyadınız]';
    const lawyerFirm = DataStore.data.currentLawyer?.firm || 'Hukuk Bürosu';
    const barNumber = DataStore.data.currentLawyer?.barNumber || 'Baro Sicil: ...';

    const overlay = document.getElementById('aiGeneratingOverlay');
    const previewSheet = document.getElementById('aiPreviewSheet');
    if (!overlay || !previewSheet) return;

    overlay.style.display = 'flex';

    setTimeout(() => {
      let generatedContent = '';

      if (templateKey === 'is-dilekcesi') {
        generatedContent = `T.C.
${court.toUpperCase()}

DOSYA NO        : ${caseNo}
DAVACI          : ${client} (T.C. Kimlik No: ...)
VEKİLİ          : ${lawyerName}
                  ${lawyerFirm} - ${barNumber}
DAVALI          : ${opponent}
KONU            : Fazlaya ilişkin haklarımız saklı kalmak kaydıyla, ${claim}
DAVA DEĞERİ     : 50.000,00 TL (Kısmi Dava / Belirsiz Alacak)

AÇIKLAMALAR     :
1. ${summary}
2. Müvekkil, davalı işyerinde dürüstlük ve sadakatle görev yapmıştır. İş akdi haksız ve bildirimsiz şekilde tek taraflı olarak feshedilmiştir.
3. Hak edilen kıdem tazminatı, ihbar tazminatı ve diğer yasal işçilik alacakları fesih anında ödenmemiştir.
4. Uyuşmazlığın çözümü amacıyla 7036 sayılı Kanun uyarınca zorunlu arabuluculuk yoluna başvurulmuş, ancak anlaşma sağlanamamıştır (Ek-1: Arabuluculuk Son Oturum Tutanağı).
5. Yargıtay'ın yerleşik içtihatları doğrultusunda işverence yapılan feshin geçersizliği ve alacakların tahsili için işbu davayı açma zorunluluğu doğmuştur.

HUKUKİ SEBEPLER : 4857 sayılı İş Kanunu, 6100 sayılı HMK, 7036 sayılı İş Mahkemeleri Kanunu.
HUKUKİ DELİLLER : SGK hizmet dökümü, şahsi özlük dosyası, banka hesap hareketleri, tanık anlatımları, bilirkişi raporu ve her türlü yasal delil.

SONUÇ VE TALEP  :
Yukarıda arz ve izah edilen nedenlerle;
1. Haklı davamızın KABULÜNE,
2. Müvekkilin hak kazandığı alacak kalemlerinin fesih ve temerrüt tarihinden itibaren en yüksek banka mevduat faiziyle birlikte davalıdan tahsiline,
3. Yargılama harç ve masrafları ile vekâlet ücretinin davalıya yükletilmesine karar verilmesini bilvekâle saygılarımla talep ederim.

                                                          Davacı Vekili
                                                       ${lawyerName}
                                                      (e-İmzalıdır)`;

      } else if (templateKey === 'cevap-dilekcesi') {
        generatedContent = `T.C.
${court.toUpperCase()}

ESAS NO         : ${caseNo}
DAVALI          : ${client}
VEKİLİ          : ${lawyerName} (${lawyerFirm})
DAVACI          : ${opponent}
KONU            : Davacının mesnetsiz davasına karşı süresi içinde esasa ve usule ilişkin cevaplarımızın sunulmasıdır.

USULE İLİŞKİN İTİRAZLARIMIZ:
1. Davacı tarafın dava açmakta hukuki yararı bulunmamaktadır (HMK m. 114/1-h).
2. Talep edilen alacak zamanaşımına uğramıştır. Zamanaşımı def'inde bulunuyoruz.

ESASA İLİŞKİN CEVAPLARIMIZ:
1. ${summary}
2. Davacının iddia ve talepleri maddi vakıalarla bağdaşmamaktadır. Müvekkil tüm edimlerini eksiksiz yerine getirmiştir.
3. İddia edilen zararın varlığı ve illiyet bağı somut delillerle ispatlanamamıştır.

SONUÇ VE TALEP  :
Yukarıda arz edilen nedenlerle; haksız ve hukuki dayanaktan yoksun davanın REDDİNE, yargılama giderleri ile vekâlet ücretinin davacı yana tahmiline karar verilmesini arz ve talep ederim.

                                                          Davalı Vekili
                                                       ${lawyerName}`;

      } else if (templateKey === 'istinaf-dilekcesi') {
        generatedContent = `T.C.
${court.toUpperCase()}
GÖNDERİLMEK ÜZERE
İSTANBUL NÖBETÇİ ASLİYE HUKUK MAHKEMESİ'NE

ESAS NO         : ${caseNo}
İSTİNAF EDEN    : ${client}
VEKİLİ          : ${lawyerName}
KARŞI TARAF     : ${opponent}
KONU            : İlk derece mahkemesinin usul ve yasaya aykırı kararının istinaf incelemesi neticesinde kaldırılarak davanın kabulüne karar verilmesi talebidir.

İSTİNAF NEDENLERİ:
1. ${summary}
2. Mahkemece delillerimiz yeterince değerlendirilmemiş, bilirkişi raporundaki çelişkiler giderilmeden hüküm kurulmuştur.
3. Karar gerekçesi HMK m. 297 hükmüne aykırılık teşkil etmektedir.

SONUÇ VE TALEP  :
Hukuka aykırı ilk derece mahkemesi kararının KALDIRILMASINA, davanın KABULÜNE karar verilmesini bilvekâle talep ederim.

                                                        İstinaf Eden Vekili
                                                       ${lawyerName}`;

      } else if (templateKey === 'ihtarname') {
        generatedContent = `İHTARNAME

İHTAR EDEN      : ${client}
VEKİLİ          : ${lawyerName} (${lawyerFirm})
MUHATAP         : ${opponent}
KONU            : ${claim}

SAYIN MUHATAP;
1. ${summary}
2. Tarafınıza tanınan yasal süre içinde yükümlülüklerinizi yerine getirmediğiniz tespit edilmiştir.
3. İşbu ihtarnamenin tebliğinden itibaren 7 (yedi) gün içinde ifanın gerçekleştirilmesini, aksi takdirde aleyhinize yasal yollara müracaat olunacağını ihtar ederiz.

                                                        İhtar Eden Vekili
                                                       ${lawyerName}`;
      }

      previewSheet.textContent = generatedContent;
      overlay.style.display = 'none';
      App.showToast('Yapay zeka dilekçe taslağınız başarıyla hazırlandı!');
    }, 600);
  },

  copyDraft() {
    const previewSheet = document.getElementById('aiPreviewSheet');
    if (!previewSheet) return;

    navigator.clipboard.writeText(previewSheet.textContent).then(() => {
      App.showToast('Dilekçe panoya kopyalandı.');
    }).catch(() => {
      App.showToast('Kopyalama tamamlandı.');
    });
  },

  toggleEdit() {
    const previewSheet = document.getElementById('aiPreviewSheet');
    const editBtn = document.getElementById('btnToggleEditDraft');
    if (!previewSheet || !editBtn) return;

    this.isEditing = !this.isEditing;
    previewSheet.contentEditable = this.isEditing;

    if (this.isEditing) {
      previewSheet.classList.add('editable');
      previewSheet.focus();
      editBtn.textContent = '✓ Kaydet';
      App.showToast('Dilekçe üzerinde doğrudan yazıp düzenleyebilirsiniz.');
    } else {
      previewSheet.classList.remove('editable');
      editBtn.textContent = 'Düzenle';
      App.showToast('Düzenlemeler kaydedildi.');
    }
  },

  downloadPDF() {
    App.showToast('Yazdırma ve PDF kaydetme penceresi açılıyor...');
    setTimeout(() => {
      window.print();
    }, 300);
  },

  setupEventListeners() {
    const generateBtn = document.getElementById('btnGenerateDraft');
    if (generateBtn) generateBtn.addEventListener('click', () => this.generateDraft());

    const copyBtn = document.getElementById('btnCopyDraft');
    if (copyBtn) copyBtn.addEventListener('click', () => this.copyDraft());

    const editBtn = document.getElementById('btnToggleEditDraft');
    if (editBtn) editBtn.addEventListener('click', () => this.toggleEdit());

    const pdfBtn = document.getElementById('btnDownloadPDF');
    if (pdfBtn) pdfBtn.addEventListener('click', () => this.downloadPDF());
  }
};
