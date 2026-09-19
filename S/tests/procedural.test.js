const assert = require('node:assert');
const { calculateUetsLegalServiceDate, calculateProceduralDeadline } = require('../src/utils/proceduralRules');

console.log('--- TEST: Usul Kuralları & UETS Hesaplama Testleri Başlatılıyor ---');

// Test 1: UETS 5 gün tebliğ edilmiş sayılma kuralı (Tebligat K. m. 7/a)
{
  const arrival = '2026-05-01'; // Cuma
  const legalService = calculateUetsLegalServiceDate(arrival);
  assert.strictEqual(legalService, '2026-05-06', 'UETS 5. gün hesabı 2026-05-06 olmalıdır.');
  console.log('✓ UETS 5 günlük yasal tebliğ karinesi doğrulandı.');
}

// Test 2: HMK 2 Hafta Süre (Hafta sonuna denk gelmeyen normal durum)
{
  const baseDate = '2026-06-03'; // Çarşamba
  const result = calculateProceduralDeadline(baseDate, 'hmk_2_weeks');
  assert.strictEqual(result.dueDate, '2026-06-17', 'Çarşamba başlayan 2 hafta 14 gün sonra Çarşamba biter.');
  assert.strictEqual(result.rolledOver, false, 'Hafta içine denk geldiği için tatil kaydırması olmamalı.');
  console.log('✓ HMK 2 hafta (14 gün) kuralı doğrulandı.');
}

// Test 3: Hafta Sonu Rollover (Cumartesi -> Pazartesi)
{
  // 2026-06-05 Cuma + 8 gün = 2026-06-13 Cumartesi -> Pazartesi 2026-06-15 olmalı
  const baseDate = '2026-06-05';
  const result = calculateProceduralDeadline(baseDate, 'custom', 8);
  assert.strictEqual(result.dueDate, '2026-06-15', 'Cumartesiye gelen son gün Pazartesiye kaymalı.');
  assert.strictEqual(result.rolledOver, true, 'Cumartesi rollover bayrağı true olmalı.');
  console.log('✓ HMK m. 92/2 Hafta sonu Cumartesi -> Pazartesi kaydırması doğrulandı.');
}

// Test 4: Hafta Sonu Rollover (Pazar -> Pazartesi)
{
  // 2026-06-05 Cuma + 9 gün = 2026-06-14 Pazar -> Pazartesi 2026-06-15 olmalı
  const baseDate = '2026-06-05';
  const result = calculateProceduralDeadline(baseDate, 'custom', 9);
  assert.strictEqual(result.dueDate, '2026-06-15', 'Pazara gelen son gün Pazartesiye kaymalı.');
  assert.strictEqual(result.rolledOver, true, 'Pazar rollover bayrağı true olmalı.');
  console.log('✓ HMK m. 92/2 Hafta sonu Pazar -> Pazartesi kaydırması doğrulandı.');
}

// Test 5: Adli Tatil Uyarısı (20 Temmuz - 31 Ağustos)
{
  const baseDate = '2026-07-15'; // 2 hafta sonrası 29 Temmuz (Adli tatil içi)
  const result = calculateProceduralDeadline(baseDate, 'hmk_2_weeks');
  assert(result.adliTatilNotice.length > 0, 'Adli tatile denk gelen süre için uyarı içermeli.');
  console.log('✓ HMK m. 104 Adli Tatil uyarısı doğrulandı.');
}

console.log('>>> TÜM USUL KURALLARI TESTLERİ BAŞARIYLA GEÇTİ <<<\n');
