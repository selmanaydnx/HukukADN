<?php

namespace App\Utils;

use DateTimeImmutable;
use DateInterval;

class ProceduralRules
{
    /**
     * Sabit Resmi Tatiller (Ay-Gün)
     */
    const OFFICIAL_HOLIDAYS = [
        '01-01' => 'Yılbaşı',
        '04-23' => 'Ulusal Egemenlik ve Çocuk Bayramı',
        '05-01' => 'Emek ve Dayanışma Günü',
        '05-19' => 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı',
        '07-15' => 'Demokrasi ve Milli Birlik Günü',
        '08-30' => 'Zafer Bayramı',
        '10-29' => 'Cumhuriyet Bayramı',
    ];

    /**
     * UETS Tebligat Karinesi Hesabı (Elektronik Tebligat Kanunu m. 7/a)
     * "Elektronik yolla tebligat, muhatabın elektronik adresine ulaştığı tarihi izleyen beşinci günün sonunda yapılmış sayılır."
     */
    public static function calculateUetsLegalServiceDate(string $deliveryDateStr): array
    {
        $delivery = new DateTimeImmutable($deliveryDateStr);
        $legalServiceDate = $delivery->add(new DateInterval('P5D'));

        return [
            'delivery_date' => $delivery->format('Y-m-d'),
            'legal_service_date' => $legalServiceDate->format('Y-m-d'),
            'rule' => 'Elektronik Tebligat Kanunu m. 7/a (5 gün karinesi)',
            'description' => 'Tebligat muhatabın UETS adresine ulaştığı günü izleyen 5. günün sonunda (23:59) yasal olarak tebliğ edilmiş sayılır. Süreler bu tarihten sonraki gün işlemeye başlar.'
        ];
    }

    /**
     * Tatil Günü Kontrolü
     */
    public static function isHoliday(DateTimeImmutable $date): array
    {
        // 1. Hafta Sonu Kontrolü (HMK m. 92/2): N formatı (1=Pazartesi, 6=Cumartesi, 7=Pazar)
        $dayOfWeek = (int)$date->format('N');
        if ($dayOfWeek === 6) {
            return ['isHoliday' => true, 'type' => 'weekend', 'name' => 'Cumartesi'];
        }
        if ($dayOfWeek === 7) {
            return ['isHoliday' => true, 'type' => 'weekend', 'name' => 'Pazar'];
        }

        // 2. Sabit Resmi Tatil Kontrolü
        $monthDay = $date->format('m-d');
        if (isset(self::OFFICIAL_HOLIDAYS[$monthDay])) {
            return ['isHoliday' => true, 'type' => 'official', 'name' => self::OFFICIAL_HOLIDAYS[$monthDay]];
        }

        // 3. Yarım Gün Tatil: 28 Ekim (Öğleden sonra tatil)
        if ($monthDay === '10-28') {
            return ['isHoliday' => true, 'type' => 'half_day', 'name' => '28 Ekim Yarım Gün'];
        }

        return ['isHoliday' => false];
    }

    /**
     * HMK m. 102 - Adli Tatil Aralığı Kontrolü (20 Temmuz - 31 Ağustos)
     */
    public static function isJudicialRecess(DateTimeImmutable $date): bool
    {
        $year = (int)$date->format('Y');
        $recessStart = new DateTimeImmutable("{$year}-07-20 00:00:00");
        $recessEnd = new DateTimeImmutable("{$year}-08-31 23:59:59");

        return $date >= $recessStart && $date <= $recessEnd;
    }

    /**
     * HMK Usul Süreleri Hesaplama Motoru (HMK m. 90-94, m. 104)
     *
     * @param string $startDateStr Tebliğ veya Tevhim Tarihi
     * @param int $duration Süre Değeri
     * @param string $unit 'days', 'weeks', 'months'
     * @param array $options ['subjectToRecess' => bool, 'isUets' => bool]
     */
    public static function calculateProceduralDeadline(
        string $startDateStr,
        int $duration,
        string $unit = 'weeks',
        array $options = []
    ): array {
        $subjectToRecess = $options['subjectToRecess'] ?? true;
        $isUets = $options['isUets'] ?? false;

        $baseDate = new DateTimeImmutable($startDateStr);
        $calcNotes = [];
        $uetsDetails = null;

        // UETS 5 Günlük Tebliğ Karinesi Eklemesi
        if ($isUets) {
            $uetsInfo = self::calculateUetsLegalServiceDate($startDateStr);
            $uetsDetails = $uetsInfo;
            $baseDate = new DateTimeImmutable($uetsInfo['legal_service_date']);
            $calcNotes[] = 'UETS 5 günlük yasal tebligat karinesi uygulandı (Tebliğ tarihi: ' . $uetsInfo['legal_service_date'] . ').';
        }

        // HMK m. 92/1: Süre gün olarak belirlenmişse tebliğ edildiği gün hesaba katılmaz.
        $targetDate = $baseDate;

        if ($unit === 'days') {
            $targetDate = $targetDate->add(new DateInterval("P{$duration}D"));
            $calcNotes[] = "HMK m. 92/1 uyarınca tebliğ günü hesaba katılmadan {$duration} gün eklendi.";
        } elseif ($unit === 'weeks') {
            // HMK m. 92/2: Hafta olarak belirlenen süre, başladığı güne son hafta içindeki karşılık gelen günde biter.
            $days = $duration * 7;
            $targetDate = $targetDate->add(new DateInterval("P{$days}D"));
            $calcNotes[] = "HMK m. 92/2 uyarınca {$duration} hafta ({$days} gün) sonundaki denk gelen güne gidildi.";
        } elseif ($unit === 'months') {
            $targetDate = $targetDate->add(new DateInterval("P{$duration}M"));
            $calcNotes[] = "HMK m. 92/2 uyarınca {$duration} ay sonundaki denk gelen güne gidildi.";
        }

        $rawFinalDate = $targetDate;
        $recessExtended = false;

        // HMK m. 104: Adli Tatile Denk Gelme Kontrolü
        if ($subjectToRecess && self::isJudicialRecess($targetDate)) {
            $recessYear = (int)$targetDate->format('Y');
            $targetDate = new DateTimeImmutable("{$recessYear}-09-07 00:00:00");
            $recessExtended = true;
            $calcNotes[] = 'HMK m. 104 gereği süre adli tatile denk geldiğinden adli tatilin bittiği günden itibaren bir hafta uzatılarak 7 Eylül tarihine ertelendi.';
        }

        // HMK m. 92/2 & m. 93: Sürenin son günü resmi tatile rastlarsa, tatili takip eden ilk iş günü mesai bitimi.
        $holidayShifted = false;
        $originalBeforeShift = $targetDate;

        while (true) {
            $holidayCheck = self::isHoliday($targetDate);
            if ($holidayCheck['isHoliday']) {
                $holidayShifted = true;
                $calcNotes[] = "Son gün tatil ({$holidayCheck['name']}) olduğundan takip eden iş gününe kaydırıldı: " . $targetDate->format('Y-m-d');
                $targetDate = $targetDate->add(new DateInterval('P1D'));
            } else {
                break;
            }
        }

        $turkishDays = [
            1 => 'Pazartesi',
            2 => 'Salı',
            3 => 'Çarşamba',
            4 => 'Perşembe',
            5 => 'Cuma',
            6 => 'Cumartesi',
            7 => 'Pazar'
        ];

        return [
            'start_date' => $startDateStr,
            'duration' => $duration,
            'unit' => $unit,
            'raw_deadline' => $rawFinalDate->format('Y-m-d'),
            'final_deadline' => $targetDate->format('Y-m-d'),
            'day_of_week' => $turkishDays[(int)$targetDate->format('N')] ?? '',
            'is_holiday_shifted' => $holidayShifted,
            'original_before_shift' => $originalBeforeShift->format('Y-m-d'),
            'recess_extended' => $recessExtended,
            'uets_details' => $uetsDetails,
            'calculation_notes' => $calcNotes,
            'legal_basis' => 'HMK m. 91, 92, 93, 102, 104 & Tebligat Kanunu m. 7/a',
            'disclaimer' => 'Hesaplama Dayanağı ve Kapsamı: Bu araç HMK genel süre kurallarına göre hesaplama yapar; özel kanunlardaki istisnalar ve nihai süre tespiti avukatın mesleki kontrol ve teyidine tabidir.'
        ];
    }
}
