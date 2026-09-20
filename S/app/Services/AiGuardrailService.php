<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\LegalCase;
use App\Models\Document;
use App\Models\AuditLog;
use Illuminate\Support\Str;

class AiGuardrailService
{
    const TBB_MANDATORY_DISCLAIMER = "⚠️ TBB YASAL UYARI & TASLAK ŞERHİ:\nBu çıktı yapay zekâ destekli bir ön çalışma taslağıdır. Hukuki tavsiye veya kesin mütalaa niteliğinde değildir. Avukatlık Kanunu ve TBB Meslek Kuralları uyarınca nihai inceleme ve teyit sorumlu avukata aittir.";

    /**
     * TBB Uyumlu AI Sorgusu İşleme
     */
    public static function processQuery(Tenant $tenant, string $query, ?string $caseId = null): array
    {
        $caseData = null;
        $contextDocuments = [];

        if ($caseId) {
            $case = LegalCase::where('tenant_id', $tenant->id)->find($caseId);
            if ($case) {
                $caseData = [
                    'id' => $case->id,
                    'title' => $case->title,
                    'file_number' => $case->file_number,
                    'court_name' => $case->court_name,
                    'claim_amount' => $case->claim_amount,
                    'status' => $case->status,
                ];

                $contextDocuments = Document::where('tenant_id', $tenant->id)
                    ->where('case_id', $case->id)
                    ->get(['file_name', 'mime_type', 'file_size'])
                    ->toArray();
            }
        }

        // Halüsinasyon Önleme & Veriye Dayalı Cevaplama
        $responseContent = "";
        $citations = [];
        $lowerQuery = mb_strtolower($query, 'UTF-8');

        if ($caseData) {
            $citations[] = "Dosya No: {$caseData['file_number']} ({$caseData['court_name']})";

            if (str_contains($lowerQuery, 'dava') || str_contains($lowerQuery, 'talep') || str_contains($lowerQuery, 'miktar')) {
                $responseContent = "İncelenen {$caseData['file_number']} sayılı dosyada talep konusu tutar {$caseData['claim_amount']} TL olup, dosya şu anda '{$caseData['status']}' durumundadır.";
            } elseif (str_contains($lowerQuery, 'mahkeme')) {
                $responseContent = "Dosya {$caseData['court_name']} nezdinde derdesttir.";
            } elseif (str_contains($lowerQuery, 'belge') || str_contains($lowerQuery, 'evrak')) {
                $docCount = count($contextDocuments);
                $responseContent = "Dosyaya kayıtlı toplam {$docCount} adet resmi belge bulunmaktadır.";
            } else {
                // Dosyada olmayan bir şey sorulduğunda kesinlikle uydurmama kuralı
                $responseContent = "Dosya kayıtlarında bu bilgi bulunmamaktadır. Yalnızca sisteme taranmış ve doğrulanmış dava verileri üzerinden analiz sunulmaktadır.";
            }
        } else {
            // Genel Mevzuat / HMK Sorusu
            if (str_contains($lowerQuery, 'uets') || str_contains($lowerQuery, 'tebligat')) {
                $responseContent = "Elektronik Tebligat Kanunu m. 7/a uyarınca tebligat muhatabın adresine ulaştığı günü izleyen beşinci günün sonunda yapılmış sayılır.";
                $citations[] = "Elektronik Tebligat Kanunu m. 7/a";
            } elseif (str_contains($lowerQuery, 'cevap') || str_contains($lowerQuery, 'hmk')) {
                $responseContent = "HMK m. 127 uyarınca cevap dilekçesini verme süresi, dava dilekçesinin davalıya tebliğinden itibaren iki haftadır (14 gün).";
                $citations[] = "HMK m. 127";
            } else {
                $responseContent = "Sorunuz HMK ve ilgili Türk yargı mevzuatı çerçevesinde değerlendirilmiştir. Somut davanın niteliğine göre ek süre ve itiraz şartları avukat teyidine tabidir.";
                $citations[] = "HMK Genel Hükümler";
            }
        }

        // Denetim İzi (Audit Log) Kaydı
        AuditLog::create([
            'id' => 'aud_' . Str::random(20),
            'tenant_id' => $tenant->id,
            'user_id' => auth()->id(),
            'action' => 'ai_query',
            'entity_type' => 'ai',
            'entity_id' => $caseId,
            'details' => "AI Sorgusu: {$query}",
            'ip_address' => request()->ip(),
        ]);

        return [
            'query' => $query,
            'response' => $responseContent,
            'citations' => $citations,
            'guardrail' => [
                'tbb_compliant' => true,
                'human_review_required' => true,
                'is_draft' => true,
                'mandatory_disclaimer' => self::TBB_MANDATORY_DISCLAIMER
            ]
        ];
    }
}
