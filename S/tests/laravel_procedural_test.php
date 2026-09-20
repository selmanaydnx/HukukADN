<?php

// Standalone autoloading
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
} else {
    require_once __DIR__ . '/../bootstrap/autoload.php';
}

use App\Utils\ProceduralRules;

echo "====================================================\n";
echo "  ADN LARAVEL 12 - USUL KURALLARI & HESAPLAMA TESTİ \n";
echo "====================================================\n\n";

// Test 1: UETS 5 Günlük Yasal Tebliğ Karinesi
$uets = ProceduralRules::calculateUetsLegalServiceDate('2026-05-10');
assert($uets['legal_service_date'] === '2026-05-15', 'UETS 5 gün karinesi doğru hesaplanmalı');
echo "✓ [1/5] UETS 5 günlük yasal tebliğ karinesi doğrulandı (10 Mayıs -> 15 Mayıs).\n";

// Test 2: HMK 2 Hafta (14 gün) Kuralı
$hmk2 = ProceduralRules::calculateProceduralDeadline('2026-05-11', 2, 'weeks', ['isUets' => false, 'subjectToRecess' => false]);
assert($hmk2['final_deadline'] === '2026-05-25', 'HMK 2 hafta aynı güne denk gelmeli (11 Mayıs Pazartesi -> 25 Mayıs Pazartesi)');
echo "✓ [2/5] HMK 2 hafta (14 gün) kuralı doğrulandı (11 Mayıs -> 25 Mayıs).\n";

// Test 3: Hafta Sonu Cumartesi -> Pazartesi Kaydırması
$satShift = ProceduralRules::calculateProceduralDeadline('2026-05-09', 7, 'days', ['isUets' => false, 'subjectToRecess' => false]);
assert($satShift['final_deadline'] === '2026-05-18', 'Cumartesiye denk gelen süre Pazartesiye kaymalı');
assert($satShift['is_holiday_shifted'] === true);
echo "✓ [3/5] HMK m. 92/2 Hafta sonu Cumartesi -> Pazartesi kaydırması doğrulandı (16 Mayıs -> 18 Mayıs).\n";

// Test 4: Hafta Sonu Pazar -> Pazartesi Kaydırması
$sunShift = ProceduralRules::calculateProceduralDeadline('2026-05-10', 7, 'days', ['isUets' => false, 'subjectToRecess' => false]);
assert($sunShift['final_deadline'] === '2026-05-18', 'Pazara denk gelen süre Pazartesiye kaymalı');
echo "✓ [4/5] HMK m. 92/2 Hafta sonu Pazar -> Pazartesi kaydırması doğrulandı (17 Mayıs -> 18 Mayıs).\n";

// Test 5: Adli Tatil Uzaması (HMK m. 104)
$recess = ProceduralRules::calculateProceduralDeadline('2026-07-15', 2, 'weeks', ['isUets' => false, 'subjectToRecess' => true]);
assert($recess['final_deadline'] === '2026-09-07', 'Adli tatile denk gelen süre 7 Eylül tarihine uzamalı');
assert($recess['recess_extended'] === true);
echo "✓ [5/5] HMK m. 104 Adli Tatil uzaması ve 7 Eylül kuralı doğrulandı.\n\n";

echo ">>> TÜM LARAVEL 12 USUL VE HESAPLAMA TESTLERİ BAŞARIYLA GEÇTİ <<<\n";
