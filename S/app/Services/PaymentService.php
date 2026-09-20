<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionHistory;
use App\Models\Invoice;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    /**
     * Sağlayıcı Yapılandırma Durumu
     */
    public static function getProviderStatus(): array
    {
        $provider = env('PAYMENT_PROVIDER', 'mock_sandbox');
        $apiKey = env('IYZICO_API_KEY');
        $secretKey = env('IYZICO_SECRET_KEY');

        $isConfigured = !empty($apiKey) && !empty($secretKey);

        return [
            'active_provider' => $provider,
            'is_live' => $provider === 'iyzico_live' && $isConfigured,
            'is_sandbox' => $provider === 'mock_sandbox' || ($provider === 'iyzico_sandbox' && $isConfigured),
            'setup_status' => $isConfigured ? 'CONFIGURED' : 'SETUP_PENDING',
            'message' => $isConfigured
                ? 'Ödeme altyapısı aktif.'
                : 'Ödeme sağlayıcı kurulumu bekleniyor. Test ortamında deneme ve onay işlemleri simüle edilmektedir.'
        ];
    }

    /**
     * Güvenli Checkout Başlatma
     */
    public static function createCheckoutSession(Tenant $tenant, string $planId, string $billingCycle): array
    {
        $plan = SubscriptionPlan::findOrFail($planId);

        $price = $billingCycle === 'yearly' ? (float)$plan->price_yearly : (float)$plan->price_monthly;
        $kdvRate = 0.20; // %20 KDV
        $taxAmount = round($price * $kdvRate, 2);
        $totalAmount = round($price + $taxAmount, 2);

        $checkoutId = 'chk_' . Str::random(24);

        return [
            'checkout_id' => $checkoutId,
            'plan_id' => $plan->id,
            'plan_name' => $plan->name,
            'billing_cycle' => $billingCycle,
            'subtotal' => $price,
            'tax_amount' => $taxAmount,
            'total_amount' => $totalAmount,
            'currency' => $plan->currency,
            'tenant_id' => $tenant->id,
            'provider' => env('PAYMENT_PROVIDER', 'mock_sandbox'),
            'status' => 'pending',
            'checkout_url' => "/odeme-onay?checkout_id={$checkoutId}",
            'created_at' => now()->toIso8601String()
        ];
    }

    /**
     * Webhook İmza Doğrulama (HMAC-SHA256)
     */
    public static function verifyWebhookSignature(string $rawPayload, ?string $signature): bool
    {
        $secret = env('PAYMENT_WEBHOOK_SECRET', 'adn_sec_wh_2026_prod');
        if (empty($signature)) {
            return false;
        }

        $computedSignature = hash_hmac('sha256', $rawPayload, $secret);
        return hash_equals($computedSignature, $signature);
    }

    /**
     * Ödeme Başarılı Olduğunda Aboneliği Aktifleştirme (Idempotent)
     */
    public static function processSuccessfulPayment(array $paymentData): array
    {
        $tenantId = $paymentData['tenant_id'] ?? null;
        $planId = $paymentData['plan_id'] ?? 'pro';
        $billingCycle = $paymentData['billing_cycle'] ?? 'monthly';
        $transactionId = $paymentData['transaction_id'] ?? ('txn_' . Str::random(16));
        $provider = $paymentData['provider'] ?? 'mock_sandbox';

        // 1. İdempotency Kontrolü: Bu işlem daha önce işlendi mi?
        $existingInvoice = Invoice::where('provider_transaction_id', $transactionId)->first();
        if ($existingInvoice) {
            return [
                'already_processed' => true,
                'message' => 'Bu ödeme işlemi zaten işlenmiş (İdempotent).',
                'invoice' => $existingInvoice
            ];
        }

        $tenant = Tenant::findOrFail($tenantId);
        $plan = SubscriptionPlan::findOrFail($planId);

        return DB::transaction(function () use ($tenant, $plan, $billingCycle, $transactionId, $provider) {
            $now = now();
            $periodEnd = $billingCycle === 'yearly' ? $now->copy()->addYear() : $now->copy()->addMonth();

            $price = $billingCycle === 'yearly' ? (float)$plan->price_yearly : (float)$plan->price_monthly;
            $taxAmount = round($price * 0.20, 2);
            $totalAmount = round($price + $taxAmount, 2);

            // 2. Fatura / Dekont Oluşturma
            $invoiceNumber = 'ADN-' . date('Ymd') . '-' . strtoupper(Str::random(6));
            $invoice = Invoice::create([
                'id' => 'inv_' . Str::random(20),
                'tenant_id' => $tenant->id,
                'invoice_number' => $invoiceNumber,
                'amount' => $price,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'currency' => $plan->currency,
                'billing_cycle' => $billingCycle,
                'plan_id' => $plan->id,
                'status' => 'paid',
                'provider' => $provider,
                'provider_transaction_id' => $transactionId,
                'period_start' => $now,
                'period_end' => $periodEnd,
            ]);

            // 3. Büro Abonelik Durumunu Aktifleştirme
            $oldPlanId = $tenant->plan_id;
            $tenant->update([
                'status' => 'active',
                'plan_id' => $plan->id,
                'billing_cycle' => $billingCycle,
                'current_period_starts_at' => $now,
                'current_period_ends_at' => $periodEnd,
                'cancel_at_period_end' => false,
            ]);

            // 4. Abonelik Geçmişine Kaydetme
            SubscriptionHistory::create([
                'id' => 'sbh_' . Str::random(20),
                'tenant_id' => $tenant->id,
                'from_plan_id' => $oldPlanId,
                'to_plan_id' => $plan->id,
                'billing_cycle' => $billingCycle,
                'action' => 'upgrade',
                'effective_date' => $now,
                'notes' => "{$plan->name} ({$billingCycle}) paketine başarıyla geçildi. Dekont: {$invoiceNumber}",
            ]);

            return [
                'already_processed' => false,
                'message' => 'Ödeme onaylandı ve büro aboneliği başarıyla aktifleştirildi.',
                'tenant' => $tenant->fresh(),
                'invoice' => $invoice
            ];
        });
    }
}
