<?php

namespace App\Utils;

use Carbon\Carbon;

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
        $delivery = Carbon::parse($deliveryDateStr)->startOfDay();
        $legalServiceDate = $delivery->copy()->addDays(5);

        return [
            'delivery_date' => $delivery->toDateString(),
            'legal_service_date' => $legalServiceDate->toDateString(),
            'rule' => 'Elektronik Tebligat Kanunu m. 7/a (5 gün karinesi)',
            'description' => 'Tebligat muhatabın UETS adresine ulaştığı günü izleyen 5. günün sonunda (23:59) yasal olarak tebliğ edilmiş sayılır. Süreler bu tarihten sonraki gün işlemeye başlar.'
        ];
    }

    /**
     * Tatil Günü Kontrolü
     */
    public static function isHoliday(Carbon $date): array
    {
        // 1. Hafta Sonu Kontrolü (HMK m. 92/2)
        if ($date->isSaturday()) {
            return ['isHoliday' => true, 'type' => 'weekend', 'name' => 'Cumartesi'];
        }
        if ($date->isSunday()) {
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
    public static function isJudicialRecess(Carbon $date): bool
    {
        $year = $date->year;
        $recessStart = Carbon::create($year, 7, 20)->startOfDay();
        $recessEnd = Carbon::create($year, 8, 31)->endOfDay();

        return $date->between($recessStart, $recessEnd);
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

        $baseDate = Carbon::parse($startDateStr)->startOfDay();
        $calcNotes = [];
        $uetsDetails = null;

        // UETS 5 Günlük Tebliğ Karinesi Eklemesi
        if ($isUets) {
            $uetsInfo = self::calculateUetsLegalServiceDate($startDateStr);
            $uetsDetails = $uetsInfo;
            $baseDate = Carbon::parse($uetsInfo['legal_service_date'])->startOfDay();
            $calcNotes[] = 'UETS 5 günlük yasal tebligat karinesi uygulandı (Tebliğ tarihi: ' . $uetsInfo['legal_service_date'] . ').';
        }

        // HMK m. 92/1: Süre gün olarak belirlenmişse tebliğ edildiği gün hesaba katılmaz.
        $targetDate = $baseDate->copy();

        if ($unit === 'days') {
            $targetDate->addDays($duration);
            $calcNotes[] = "HMK m. 92/1 uyarınca tebliğ günü hesaba katılmadan {$duration} gün eklendi.";
        } elseif ($unit === 'weeks') {
            // HMK m. 92/2: Hafta olarak belirlenen süre, başladığı güne son hafta içindeki karşılık gelen günde biter.
            $targetDate->addWeeks($duration);
            $calcNotes[] = "HMK m. 92/2 uyarınca {$duration} hafta (14 gün) sonundaki denk gelen güne gidildi.";
        } elseif ($unit === 'months') {
            $targetDate->addMonthsNoOverflow($duration);
            $calcNotes[] = "HMK m. 92/2 uyarınca {$duration} ay sonundaki denk gelen güne gidildi.";
        }

        $rawFinalDate = $targetDate->copy();
        $recessExtended = false;

        // HMK m. 104: Adli Tatile Denk Gelme Kontrolü
        if ($subjectToRecess && self::isJudicialRecess($targetDate)) {
            $recessYear = $targetDate->year;
            $targetDate = Carbon::create($recessYear, 9, 7)->startOfDay();
            $recessExtended = true;
            $calcNotes[] = 'HMK m. 104 gereği süre adli tatile denk geldiğinden adli tatilin bittiği günden itibaren bir hafta uzatılarak 7 Eylül tarihine ertelendi.';
        }

        // HMK m. 92/2 & m. 93: Sürenin son günü resmi tatile rastlarsa, tatili takip eden ilk iş günü mesai bitimi.
        $holidayShifted = false;
        $originalBeforeShift = $targetDate->copy();

        while (true) {
            $holidayCheck = self::isHoliday($targetDate);
            if ($holidayCheck['isHoliday']) {
                $holidayShifted = true;
                $calcNotes[] = "Son gün tatil ({$holidayCheck['name']}) olduğundan takip eden iş gününe kaydırıldı: " . $targetDate->toDateString();
                $targetDate->addDay();
            } else {
                break;
            }
        }

        return [
            'start_date' => $startDateStr,
            'duration' => $duration,
            'unit' => $unit,
            'raw_deadline' => $rawFinalDate->toDateString(),
            'final_deadline' => $targetDate->toDateString(),
            'day_of_week' => $targetDate->locale('tr')->dayName,
            'is_holiday_shifted' => $holidayShifted,
            'original_before_shift' => $originalBeforeShift->toDateString(),
            'recess_extended' => $recessExtended,
            'uets_details' => $uetsDetails,
            'calculation_notes' => $calcNotes,
            'legal_basis' => 'HMK m. 91, 92, 93, 102, 104 & Tebligat Kanunu m. 7/a',
            'disclaimer' => 'Hesaplama Dayanağı ve Kapsamı: Bu araç HMK genel süre kurallarına göre hesaplama yapar; özel kanunlardaki istisnalar ve nihai süre tespiti avukatın mesleki kontrol ve teyidine tabidir.'
        ];
    }
}
