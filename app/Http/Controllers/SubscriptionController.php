<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionHistory;
use App\Models\Invoice;
use App\Models\TenantMember;
use App\Models\LegalCase;
use App\Models\Document;
use App\Models\AuditLog;
use App\Services\PaymentService;
use Illuminate\Support\Str;

class SubscriptionController extends Controller
{
    /**
     * Açık Paket Listesi (GET /api/billing/plans)
     */
    public function plans()
    {
        $plans = SubscriptionPlan::where('is_active', true)->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'name' => $p->name,
                'price_monthly' => (float)$p->price_monthly,
                'price_yearly' => (float)$p->price_yearly,
                'yearly_discount_percent' => 20,
                'currency' => $p->currency,
                'max_lawyers' => $p->max_lawyers,
                'max_cases' => $p->max_cases,
                'storage_gb' => $p->storage_gb,
                'ai_queries_monthly' => $p->ai_queries_monthly,
                'features' => $p->features,
                'demo_badge' => '14 Gün Kartsız Deneme'
            ];
        });

        return response()->json(['plans' => $plans]);
    }

    /**
     * Canlı Abonelik Durumu ve Kotalar (GET /api/billing/my-subscription)
     */
    public function mySubscription(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        if (!$tenant) {
            return response()->json(['error' => 'Büro bulunamadı.'], 404);
        }

        $plan = SubscriptionPlan::find($tenant->plan_id) ?? SubscriptionPlan::find('solo');

        $memberCount = TenantMember::where('tenant_id', $tenant->id)->count();
        $activeCasesCount = LegalCase::where('tenant_id', $tenant->id)->where('status', 'active')->count();

        $storageUsedBytes = Document::where('tenant_id', $tenant->id)->sum('file_size') ?? 0;
        $storageUsedMb = round($storageUsedBytes / (1024 * 1024), 1);
        $storageLimitMb = ($plan ? $plan->storage_gb : 15) * 1024;
        $storagePercentage = min(100, (int)round(($storageUsedMb / $storageLimitMb) * 100));

        $aiQueriesUsed = AuditLog::where('tenant_id', $tenant->id)
            ->where('action', 'ai_query')
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        // Kalan Gün Hesabı
        $daysLeft = null;
        $targetDate = null;

        if ($tenant->status === 'trialing' && $tenant->trial_ends_at) {
            $targetDate = $tenant->trial_ends_at;
        } elseif ($tenant->current_period_ends_at) {
            $targetDate = $tenant->current_period_ends_at;
        }

        if ($targetDate) {
            $diffDays = (int)ceil(now()->diffInSeconds($targetDate, false) / (24 * 3600));
            $daysLeft = max(0, $diffDays);
        }

        return response()->json([
            'subscription' => [
                'status' => $tenant->status,
                'plan_id' => $tenant->plan_id,
                'plan_name' => $plan ? $plan->name : 'Bireysel (Solo)',
                'billing_cycle' => $tenant->billing_cycle ?? 'monthly',
                'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
                'current_period_starts_at' => $tenant->current_period_starts_at?->toIso8601String(),
                'current_period_ends_at' => $tenant->current_period_ends_at?->toIso8601String(),
                'cancel_at_period_end' => (bool)$tenant->cancel_at_period_end,
                'has_used_trial' => (bool)$tenant->has_used_trial,
                'days_left' => $daysLeft,
            ],
            'usage' => [
                'members' => [
                    'current' => $memberCount,
                    'max' => $plan ? $plan->max_lawyers : 1,
                    'percentage' => $plan ? min(100, (int)round(($memberCount / $plan->max_lawyers) * 100)) : 100
                ],
                'cases' => [
                    'current' => $activeCasesCount,
                    'max' => $plan ? $plan->max_cases : 150,
                    'percentage' => $plan && $plan->max_cases !== -1 ? min(100, (int)round(($activeCasesCount / $plan->max_cases) * 100)) : 0
                ],
                'storage' => [
                    'used_bytes' => $storageUsedBytes,
                    'used_mb' => $storageUsedMb,
                    'max_gb' => $plan ? $plan->storage_gb : 15,
                    'max_mb' => $storageLimitMb,
                    'percentage' => $storagePercentage
                ],
                'ai' => [
                    'used' => $aiQueriesUsed,
                    'max' => $plan ? $plan->ai_queries_monthly : 150,
                    'percentage' => $plan ? min(100, (int)round(($aiQueriesUsed / $plan->ai_queries_monthly) * 100)) : 0
                ]
            ],
            'provider_status' => PaymentService::getProviderStatus()
        ]);
    }

    /**
     * 14 Günlük Kartsız Ücretsiz Deneme Başlatma (POST /api/billing/start-trial)
     */
    public function startTrial(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        if (!$tenant) {
            return response()->json(['error' => 'Büro bulunamadı.'], 404);
        }

        if ($tenant->has_used_trial) {
            return response()->json([
                'error' => 'Hukuk büronuz daha önce 14 günlük ücretsiz deneme süresini kullanmıştır.'
            ], 400);
        }

        $trialEndsAt = now()->addDays(14);
        $tenant->update([
            'status' => 'trialing',
            'plan_id' => 'pro',
            'trial_ends_at' => $trialEndsAt,
            'has_used_trial' => true,
            'cancel_at_period_end' => false,
        ]);

        SubscriptionHistory::create([
            'id' => 'sbh_' . Str::random(20),
            'tenant_id' => $tenant->id,
            'to_plan_id' => 'pro',
            'billing_cycle' => 'monthly',
            'action' => 'trial_started',
            'effective_date' => now(),
            'notes' => '14 Günlük kartsız ücretsiz deneme başlatıldı.',
        ]);

        AuditLog::create([
            'id' => 'aud_' . Str::random(20),
            'tenant_id' => $tenant->id,
            'user_id' => auth()->id(),
            'action' => 'start_trial',
            'entity_type' => 'billing',
            'entity_id' => $tenant->id,
            'details' => '14 Günlük kartsız deneme süresi başlatıldı.',
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => '14 Günlük ücretsiz deneme süreniz başarıyla başlatıldı (Kredi kartı gerekmez). Tüm Pro özellikleri aktiftir.',
            'trial_ends_at' => $trialEndsAt->toIso8601String()
        ]);
    }

    /**
     * Güvenli Checkout Başlatma (POST /api/billing/checkout)
     */
    public function checkout(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $validated = $request->validate([
            'planId' => 'required|string|in:solo,pro,enterprise',
            'billingCycle' => 'nullable|string|in:monthly,yearly',
        ]);

        $checkout = PaymentService::createCheckoutSession(
            $tenant,
            $validated['planId'],
            $validated['billingCycle'] ?? 'monthly'
        );

        return response()->json(['checkout' => $checkout]);
    }

    /**
     * Webhook ile İmzalı Ödeme Onayı (POST /api/billing/webhook)
     */
    public function webhook(Request $request)
    {
        $rawPayload = $request->getContent();
        $signature = $request->header('X-Payment-Signature');

        if (!PaymentService::verifyWebhookSignature($rawPayload, $signature)) {
            return response()->json(['error' => 'Geçersiz webhook imzası.'], 403);
        }

        $payload = json_decode($rawPayload, true);
        if (($payload['event'] ?? '') !== 'payment.succeeded') {
            return response()->json(['message' => 'Olay alındı fakat ödeme onay olayı değil.']);
        }

        $result = PaymentService::processSuccessfulPayment($payload['data'] ?? []);
        return response()->json($result);
    }

    /**
     * Dönem Sonunda İptal (POST /api/billing/cancel)
     */
    public function cancel(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $tenant->update(['cancel_at_period_end' => true]);

        SubscriptionHistory::create([
            'id' => 'sbh_' . Str::random(20),
            'tenant_id' => $tenant->id,
            'to_plan_id' => $tenant->plan_id,
            'action' => 'cancel',
            'effective_date' => now(),
            'notes' => 'Abonelik dönem sonunda yenilenmeyecek şekilde iptal edildi.',
        ]);

        return response()->json([
            'message' => 'Aboneliğiniz dönem sonunda sonlandırılacak şekilde işaretlendi. Mevcut dönem bitimine kadar tüm haklarınız korunacaktır.'
        ]);
    }

    /**
     * Ödeme ve Dekont Geçmişi (GET /api/billing/invoices)
     */
    public function invoices(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $invoices = Invoice::where('tenant_id', $tenant->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'invoices' => $invoices,
            'tax_disclaimer' => 'Tahsilat dekontları ve e-fatura kayıtları VUK uyarınca mali mühürlü olarak e-posta adresinize iletilmektedir.'
        ]);
    }
}
