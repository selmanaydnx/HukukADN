<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Utils\ProceduralRules;

class LegalCalcController extends Controller
{
    /**
     * HMK ve UETS Usul Süresi Hesabı (POST /api/calc/procedural)
     */
    public function procedural(Request $request)
    {
        $validated = $request->validate([
            'startDate' => 'required|date',
            'duration' => 'required|integer|min:1',
            'unit' => 'nullable|string|in:days,weeks,months',
            'isUets' => 'nullable|boolean',
            'subjectToRecess' => 'nullable|boolean',
        ]);

        $result = ProceduralRules::calculateProceduralDeadline(
            $validated['startDate'],
            (int)$validated['duration'],
            $validated['unit'] ?? 'weeks',
            [
                'isUets' => (bool)($validated['isUets'] ?? false),
                'subjectToRecess' => (bool)($validated['subjectToRecess'] ?? true)
            ]
        );

        return response()->json($result);
    }

    /**
     * Serbest Meslek Makbuzu (SMM) Hesabı (POST /api/calc/smm)
     */
    public function smm(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
            'calcType' => 'nullable|string|in:gross_to_net,net_to_gross',
            'stopajRate' => 'nullable|numeric',
            'kdvRate' => 'nullable|numeric',
            'withholdingFraction' => 'nullable|string', // 'none', '5/10', '9/10'
        ]);

        $amount = (float)$validated['amount'];
        $calcType = $validated['calcType'] ?? 'net_to_gross';
        $stopajRate = ($validated['stopajRate'] ?? 20) / 100;
        $kdvRate = ($validated['kdvRate'] ?? 20) / 100;
        $fractionStr = $validated['withholdingFraction'] ?? 'none';

        $withholdingRatio = 0.0;
        if ($fractionStr === '5/10') $withholdingRatio = 0.5;
        if ($fractionStr === '9/10') $withholdingRatio = 0.9;

        if ($calcType === 'net_to_gross') {
            // Net tutardan brüt tutara: Brüt = Net / (1 - Stopaj)
            $gross = $amount / (1 - $stopajRate);
            $net = $amount;
        } else {
            $gross = $amount;
            $net = $gross * (1 - $stopajRate);
        }

        $stopajAmount = round($gross * $stopajRate, 2);
        $totalKdv = round($gross * $kdvRate, 2);
        $kdvTevkifati = round($totalKdv * $withholdingRatio, 2);
        $kdvTahsilEdilen = round($totalKdv - $kdvTevkifati, 2);
        $tahsilEdilecekToplam = round($net + $kdvTahsilEdilen, 2);

        return response()->json([
            'gross_amount' => round($gross, 2),
            'stopaj_amount' => $stopajAmount,
            'net_fee' => round($net, 2),
            'total_kdv' => $totalKdv,
            'kdv_withholding' => $kdvTevkifati,
            'kdv_collected' => $kdvTahsilEdilen,
            'total_collected' => $tahsilEdilecekToplam,
            'disclaimer' => 'Vergi Usul Kanunu ve KDV Genel Tebliği ilkelerine göre bilgilendirme amaçlı hesaplanmıştır.'
        ]);
    }

    /**
     * İcra Kapak ve Güncel Borç Hesabı (POST /api/calc/execution)
     */
    public function execution(Request $request)
    {
        $validated = $request->validate([
            'principal' => 'required|numeric|min:0',
            'interestAmount' => 'nullable|numeric|min:0',
            'expenseAmount' => 'nullable|numeric|min:0',
            'hasAttachment' => 'nullable|boolean', // Haciz var mı? (Tahsil harcı: %9.10 vs %4.55)
        ]);

        $principal = (float)$validated['principal'];
        $interest = (float)($validated['interestAmount'] ?? 0);
        $expenses = (float)($validated['expenseAmount'] ?? 0);
        $hasAttachment = (bool)($validated['hasAttachment'] ?? false);

        // İcra vekalet ücreti (AAÜT İcra Asgari Tarifesi)
        $vekalet = $this->calculateExecutionAttorneysFee($principal + $interest);

        // Tahsil Harcı Oranı
        $tahsilHarciRate = $hasAttachment ? 0.0910 : 0.0455;
        $subtotal = $principal + $interest + $expenses + $vekalet;
        $tahsilHarci = round($subtotal * $tahsilHarciRate, 2);
        $cezaeviHarci = round($principal * 0.02, 2); // %2 Cezaevi yapı harcı

        $totalPayable = round($subtotal + $tahsilHarci + $cezaeviHarci, 2);

        return response()->json([
            'principal' => $principal,
            'interest' => $interest,
            'expenses' => $expenses,
            'attorney_fee' => $vekalet,
            'collection_fee' => $tahsilHarci,
            'prison_fund_fee' => $cezaeviHarci,
            'total_payable' => $totalPayable,
            'disclaimer' => 'İcra ve İflas Kanunu ve Harçlar Kanunu (1) sayılı tarife genel kurallarına göre hesaplanmıştır.'
        ]);
    }

    /**
     * AAÜT Kademeli Nisbi Ücret Hesabı (POST /api/calc/aaut)
     */
    public function aaut(Request $request)
    {
        $validated = $request->validate([
            'subjectValue' => 'required|numeric|min:0',
            'courtType' => 'nullable|string'
        ]);

        $val = (float)$validated['subjectValue'];
        $courtType = $validated['courtType'] ?? 'asliye_hukuk';

        // Maktu Tabanlar (Örnek 2026 AAÜT)
        $maktuBaselines = [
            'sulh_hukuk' => 18000.00,
            'asliye_hukuk' => 30000.00,
            'agir_ceza' => 48000.00,
            'icra' => 9000.00,
            'danistay_yargitay' => 35000.00,
        ];

        $maktuMin = $maktuBaselines[$courtType] ?? 30000.00;

        // Kademeli Nisbi Tarife
        $fee = 0.0;
        $rem = $val;

        // 1. Dilim: İlk 400.000 TL için %16
        if ($rem > 0) {
            $slice = min($rem, 400000);
            $fee += $slice * 0.16;
            $rem -= $slice;
        }
        // 2. Dilim: Sonraki 400.000 TL için %15
        if ($rem > 0) {
            $slice = min($rem, 400000);
            $fee += $slice * 0.15;
            $rem -= $slice;
        }
        // 3. Dilim: Sonraki 800.000 TL için %14
        if ($rem > 0) {
            $slice = min($rem, 800000);
            $fee += $slice * 0.14;
            $rem -= $slice;
        }
        // 4. Dilim: Sonraki 1.200.000 TL için %11
        if ($rem > 0) {
            $slice = min($rem, 1200000);
            $fee += $slice * 0.11;
            $rem -= $slice;
        }
        // 5. Kalan kısım için %8
        if ($rem > 0) {
            $fee += $rem * 0.08;
        }

        $finalFee = max($fee, $maktuMin);

        return response()->json([
            'subject_value' => $val,
            'calculated_graduated_fee' => round($fee, 2),
            'maktu_minimum' => $maktuMin,
            'final_attorney_fee' => round($finalFee, 2),
            'disclaimer' => 'Resmi Gazete\'de yayımlanan Avukatlık Asgari Ücret Tarifesi (AAÜT) 3. Kısım Kademeli Nisbi hükümleri uygulanmıştır.'
        ]);
    }

    private function calculateExecutionAttorneysFee(float $amount): float
    {
        if ($amount <= 0) return 0;
        if ($amount <= 40000) return round($amount * 0.16, 2);
        return round(40000 * 0.16 + ($amount - 40000) * 0.12, 2);
    }
}
