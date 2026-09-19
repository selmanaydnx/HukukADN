/**
 * ADN - Türk Usul Hukuku Süre & UETS Hesaplama Motoru
 * HMK m. 92, m. 104 ve Tebligat Kanunu m. 7/a normlarına tam uyumlu.
 */

function parseDateParts(str) {
  if (!str) return null;
  const parts = str.split('T')[0].split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
}

function formatDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// UETS: Elektronik tebligat, adrese ulaştığı tarihi izleyen beşinci günün sonunda yapılmış sayılır.
function calculateUetsLegalServiceDate(arrivalDateStr) {
  const d = parseDateParts(arrivalDateStr);
  if (!d) return null;

  // 5 gün ekleme
  d.setUTCDate(d.getUTCDate() + 5);
  return formatDate(d);
}

// Yasal Süre Hesaplama
function calculateProceduralDeadline(baseDateStr, ruleType, customDays = 0) {
  const base = parseDateParts(baseDateStr);
  if (!base) return null;

  let target = new Date(base.getTime());
  let ruleTitle = '';
  let citation = '';

  switch (ruleType) {
    case 'hmk_2_weeks':
      ruleTitle = 'HMK Cevap / İstinaf Süresi (2 Hafta)';
      target.setUTCDate(target.getUTCDate() + 14);
      citation = 'HMK m. 92/1: Hafta olarak belirlenen süre, başladığı güne son haftada tekabül eden gün biter.';
      break;

    case 'iik_7_days':
      ruleTitle = 'İcra Ödeme Emrine İtiraz (7 Gün)';
      target.setUTCDate(target.getUTCDate() + 7);
      citation = 'İİK m. 62/1: Ödeme emrine itiraz süresi 7 gündür.';
      break;

    case 'cmk_7_days':
      ruleTitle = 'Ceza İstinaf Süresi (7 Gün)';
      target.setUTCDate(target.getUTCDate() + 7);
      citation = 'CMK m. 273/1: Hükmün tefhim/tebliğinden itibaren 7 gündür.';
      break;

    case 'iik_5_days':
      ruleTitle = 'Kambiyo Senetlerine İtiraz / Şikâyet (5 Gün)';
      target.setUTCDate(target.getUTCDate() + 5);
      citation = 'İİK m. 168: 5 gün içinde icra mahkemesine bildirilir.';
      break;

    case 'iyuk_30_days':
      ruleTitle = 'İdari Yargı Dava Açma / İstinaf (30 Gün)';
      target.setUTCDate(target.getUTCDate() + 30);
      citation = 'İYUK m. 7: İdare ve vergi mahkemelerinde süre 30 gündür.';
      break;

    case 'custom':
      const days = parseInt(customDays, 10) || 7;
      ruleTitle = `Özel Mehil Süresi (${days} Gün)`;
      target.setUTCDate(target.getUTCDate() + days);
      citation = 'Mahkemece tayin edilen kesin süre.';
      break;

    default:
      target.setUTCDate(target.getUTCDate() + 14);
      ruleTitle = 'Yasal Süre (14 Gün)';
      citation = 'Genel usul kuralı.';
  }

  // Hafta Sonu Rollover (HMK m. 92/2)
  let rolledOver = false;
  let rolledOverNote = '';
  const dayOfWeek = target.getUTCDay(); // 0 = Pazar, 6 = Cumartesi

  if (dayOfWeek === 6) { // Cumartesi -> Pazartesi (+2 gün)
    target.setUTCDate(target.getUTCDate() + 2);
    rolledOver = true;
    rolledOverNote = 'Son gün Cumartesi gününe rastladığından ilk mesai günü olan Pazartesi gününe uzamıştır (HMK m. 92/2).';
  } else if (dayOfWeek === 0) { // Pazar -> Pazartesi (+1 gün)
    target.setUTCDate(target.getUTCDate() + 1);
    rolledOver = true;
    rolledOverNote = 'Son gün Pazar gününe rastladığından ilk mesai günü olan Pazartesi gününe uzamıştır (HMK m. 92/2).';
  }

  // Adli Tatil Kontrolü (20 Temmuz - 31 Ağustos - HMK m. 104)
  let adliTatilNotice = '';
  const month = target.getUTCMonth(); // 6 = Temmuz, 7 = Ağustos
  const day = target.getUTCDate();

  if ((month === 6 && day >= 20) || month === 7) {
    adliTatilNotice = 'Süre Adli Tatil (20 Temmuz - 31 Ağustos) dönemine rastlamaktadır. Adli tatile tabi işlerde süre, tatilin bitiminden itibaren 1 hafta (7 Eylül mesai bitimi) uzar (HMK m. 104).';
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const diffDays = Math.ceil((target.getTime() - todayUtc) / (1000 * 60 * 60 * 24));

  return {
    ruleTitle,
    citation,
    baseDate: baseDateStr,
    dueDate: formatDate(target),
    daysLeft: diffDays,
    rolledOver,
    rolledOverNote,
    adliTatilNotice
  };
}

/**
 * Serbest Meslek Makbuzu (SMM) Hesaplayıcı (2026 Mevzuatı)
 */
function calculateSMM({
  calculationType = 'gross_to_net',
  amount = 0,
  vatRate = 20,
  withholdingRate = 20,
  withholdingDeduction = 'none' // 'none', 'half' (1/2), '5_10'
}) {
  const numAmount = Math.max(0, parseFloat(amount) || 0);
  const vatR = parseFloat(vatRate) || 0;
  const withR = parseFloat(withholdingRate) || 0;

  let gross = 0;
  let netFee = 0;

  if (calculationType === 'gross_to_net') {
    gross = numAmount;
    const stopaj = gross * (withR / 100);
    netFee = gross - stopaj;
  } else {
    // Netten Brüte
    netFee = numAmount;
    gross = withR < 100 ? netFee / (1 - (withR / 100)) : netFee;
  }

  const withholdingTax = gross * (withR / 100);
  const vatTotal = gross * (vatR / 100);

  let vatDeduction = 0; // Tevkif edilen KDV
  if (withholdingDeduction === 'half' || withholdingDeduction === '5_10') {
    vatDeduction = vatTotal * 0.5;
  }

  const vatCollected = vatTotal - vatDeduction; // Avukatın fiilen tahsil ettiği KDV
  const totalPaidByClient = netFee + vatCollected; // Müvekkilden tahsil edilen net nakit
  const totalClientCost = gross + (vatTotal - vatDeduction) + (vatDeduction > 0 ? 0 : 0); // Genel maliyet: Brüt + KDV

  return {
    calculationType,
    grossFee: Math.round(gross * 100) / 100,
    withholdingRate: withR,
    withholdingTax: Math.round(withholdingTax * 100) / 100,
    netFee: Math.round(netFee * 100) / 100,
    vatRate: vatR,
    vatTotal: Math.round(vatTotal * 100) / 100,
    withholdingDeduction,
    vatDeduction: Math.round(vatDeduction * 100) / 100,
    vatCollected: Math.round(vatCollected * 100) / 100,
    totalPaidByClient: Math.round(totalPaidByClient * 100) / 100,
    totalClientCost: Math.round((gross + vatTotal) * 100) / 100
  };
}

/**
 * İcra Kapak & Güncel Borç Hesabı (İİK)
 */
function calculateExecutionCover({
  principal = 0,
  startDateStr,
  calcDateStr,
  interestType = 'legal', // 'legal' (%24), 'commercial' (%48), 'custom'
  customInterestRate = 0,
  expenses = 0,
  stage = 'after_payment_order_before_seizure', // 'before_payment_order' (%4.55), 'after_payment_order_before_seizure' (%9.10), 'after_seizure' (%11.38)
  partialPayments = 0
}) {
  const asilAlacak = Math.max(0, parseFloat(principal) || 0);
  const masraflar = Math.max(0, parseFloat(expenses) || 0);
  const yapilanOdemeler = Math.max(0, parseFloat(partialPayments) || 0);

  const startD = parseDateParts(startDateStr) || new Date();
  const calcD = parseDateParts(calcDateStr) || new Date();

  // Gün farkı
  const diffMs = Math.max(0, calcD.getTime() - startD.getTime());
  const elapsedDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Yıllık Faiz Oranı
  let annualRate = 24; // Yasal faiz 2024-2026
  let interestLabel = 'Yasal Faiz (%24)';
  if (interestType === 'commercial') {
    annualRate = 48; // Avans / Ticari Temerrüt Faizi
    interestLabel = 'Ticari Temerrüt / Avans Faizi (%48)';
  } else if (interestType === 'custom') {
    annualRate = parseFloat(customInterestRate) || 0;
    interestLabel = `Özel Faiz (%${annualRate})`;
  }

  // Takip sonrası işleyen faiz (365 gün esası)
  const isleyenFaiz = (asilAlacak * (annualRate / 100) * elapsedDays) / 365;

  // İcra Vekalet Ücreti Hesabı (AAÜT İcra Tarifesi)
  let aautVekaletUcreti = calculateAAUT({ claimAmount: asilAlacak + isleyenFaiz, courtType: 'icra' }).totalFee;
  const icraMaktuTaban = 6000;
  if (aautVekaletUcreti < icraMaktuTaban && asilAlacak > 0) {
    aautVekaletUcreti = Math.min(asilAlacak, icraMaktuTaban);
  }

  // Tahsil Harcı Oranı
  let tahsilHarciOrani = 9.10;
  let stageLabel = 'Ödeme Emri Tebliğinden Sonra / Hacizden Önce (%9.10)';
  if (stage === 'before_payment_order') {
    tahsilHarciOrani = 4.55;
    stageLabel = 'Ödeme Emri Tebliği Öncesi / Feragat (%4.55)';
  } else if (stage === 'after_seizure' || stage === 'sales') {
    tahsilHarciOrani = 11.38;
    stageLabel = 'Hacizden Sonra veya Satış Aşamasında (%11.38)';
  }

  // Tahsil Harcı Matrahı (Asıl Alacak + Faiz)
  const tahsilHarciMatrahi = asilAlacak + isleyenFaiz;
  const tahsilHarci = tahsilHarciMatrahi * (tahsilHarciOrani / 100);

  // Cezaevi Yapı Harcı (%2 - Asıl alacak üzerinden)
  const cezaeviHarci = asilAlacak * 0.02;

  // Toplam Borç
  const toplamDosyaBorcu = (asilAlacak + isleyenFaiz + masraflar + aautVekaletUcreti + tahsilHarci + cezaeviHarci) - yapilanOdemeler;

  return {
    principal: Math.round(asilAlacak * 100) / 100,
    startDate: formatDate(startD),
    calcDate: formatDate(calcD),
    elapsedDays,
    interestType,
    interestRate: annualRate,
    interestLabel,
    accruedInterest: Math.round(isleyenFaiz * 100) / 100,
    expenses: Math.round(masraflar * 100) / 100,
    attorneyFee: Math.round(aautVekaletUcreti * 100) / 100,
    stage,
    stageLabel,
    collectionLevyRate: tahsilHarciOrani,
    collectionLevy: Math.round(tahsilHarci * 100) / 100,
    prisonLevy: Math.round(cezaeviHarci * 100) / 100,
    partialPayments: Math.round(yapilanOdemeler * 100) / 100,
    totalDebt: Math.round(Math.max(0, toplamDosyaBorcu) * 100) / 100
  };
}

/**
 * Avukatlık Asgari Ücret Tarifesi (AAÜT) Kademeli Hesaplayıcı
 */
function calculateAAUT({ claimAmount = 0, courtType = 'asliye' }) {
  const amount = Math.max(0, parseFloat(claimAmount) || 0);

  // Maktu Mahkeme Tabanları (2024-2026 TBB AAÜT)
  const maktuLimits = {
    asliye: { title: 'Asliye Hukuk / Ticaret Mahkemesi', minFee: 30000 },
    sulh: { title: 'Sulh Hukuk Mahkemesi', minFee: 18000 },
    icra: { title: 'İcra Dairesi / İcra Mahkemesi', minFee: 6000 },
    is: { title: 'İş Mahkemesi', minFee: 25000 },
    tuketici: { title: 'Tüketici Mahkemesi', minFee: 15000 },
    idare: { title: 'İdare & Vergi Mahkemesi', minFee: 25000 }
  };

  const selectedCourt = maktuLimits[courtType] || maktuLimits.asliye;

  // Kademeli Nisbi Dilimler (Üçüncü Kısım: Konusu Para Olan İşler)
  const brackets = [
    { limit: 400000, rate: 0.16, title: 'İlk 400.000 TL için %16' },
    { limit: 400000, rate: 0.15, title: 'Sonraki 400.000 TL için %15' },
    { limit: 800000, rate: 0.14, title: 'Sonraki 800.000 TL için %14' },
    { limit: 1600000, rate: 0.11, title: 'Sonraki 1.600.000 TL için %11' },
    { limit: 3200000, rate: 0.08, title: 'Sonraki 3.200.000 TL için %8' },
    { limit: 6400000, rate: 0.05, title: 'Sonraki 6.400.000 TL için %5' },
    { limit: Infinity, rate: 0.03, title: '12.800.000 TL üzeri için %3' }
  ];

  let remaining = amount;
  let totalNisbi = 0;
  const breakdown = [];

  for (const b of brackets) {
    if (remaining <= 0) break;
    const taxableInBracket = Math.min(remaining, b.limit);
    const feeInBracket = taxableInBracket * b.rate;
    totalNisbi += feeInBracket;
    breakdown.push({
      bracket: b.title,
      taxableAmount: Math.round(taxableInBracket * 100) / 100,
      ratePercent: Math.round(b.rate * 100),
      fee: Math.round(feeInBracket * 100) / 100
    });
    remaining -= taxableInBracket;
  }

  // Maktu taban kontrolü
  let appliedRule = 'nisbi';
  let finalFee = totalNisbi;
  if (finalFee < selectedCourt.minFee && amount > 0) {
    finalFee = Math.min(amount, selectedCourt.minFee);
    appliedRule = 'maktu_taban';
  }

  return {
    claimAmount: amount,
    courtType,
    courtTitle: selectedCourt.title,
    minMaktuFee: selectedCourt.minFee,
    nisbiCalculated: Math.round(totalNisbi * 100) / 100,
    appliedRule,
    totalFee: Math.round(finalFee * 100) / 100,
    breakdown
  };
}

module.exports = {
  calculateUetsLegalServiceDate,
  calculateProceduralDeadline,
  calculateSMM,
  calculateExecutionCover,
  calculateAAUT
};
