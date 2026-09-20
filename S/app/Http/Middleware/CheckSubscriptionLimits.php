<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Tenant;
use App\Models\SubscriptionPlan;
use App\Models\TenantMember;
use App\Models\LegalCase;
use App\Models\Document;
use App\Models\AuditLog;

class CheckSubscriptionLimits
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $resourceType): Response
    {
        $tenant = $request->attributes->get('tenant');
        if (!$tenant) {
            return $next($request);
        }

        $plan = SubscriptionPlan::find($tenant->plan_id) ?? SubscriptionPlan::find('solo');
        if (!$plan) {
            return $next($request);
        }

        if ($resourceType === 'members') {
            $memberCount = TenantMember::where('tenant_id', $tenant->id)->count();
            if ($memberCount >= $plan->max_lawyers) {
                return response()->json([
                    'error' => "Paketinizin izin verdiği azami avukat/kullanıcı sayısına ({$plan->max_lawyers} kişi) ulaşıldı. Yeni kullanıcı davet etmek için lütfen paketinizi yükseltin.",
                    'upgrade_required' => true,
                    'current' => $memberCount,
                    'max' => $plan->max_lawyers
                ], 403);
            }
        } elseif ($resourceType === 'cases') {
            if ($plan->max_cases !== -1) {
                $caseCount = LegalCase::where('tenant_id', $tenant->id)->where('status', 'active')->count();
                if ($caseCount >= $plan->max_cases) {
                    return response()->json([
                        'error' => "Paketinizin izin verdiği azami aktif dava sınırına ({$plan->max_cases} dava) ulaşıldı. Yeni dosya açmak için lütfen paketinizi yükseltin.",
                        'upgrade_required' => true,
                        'current' => $caseCount,
                        'max' => $plan->max_cases
                    ], 403);
                }
            }
        } elseif ($resourceType === 'storage') {
            $usedBytes = Document::where('tenant_id', $tenant->id)->sum('file_size') ?? 0;
            $maxBytes = $plan->storage_gb * 1024 * 1024 * 1024;
            if ($usedBytes >= $maxBytes) {
                return response()->json([
                    'error' => "Paketinizin güvenli bulut depolama alanına ({$plan->storage_gb} GB) ulaşıldı. Belge yüklemek için paketinizi yükseltin.",
                    'upgrade_required' => true
                ], 403);
            }
        } elseif ($resourceType === 'ai') {
            $monthQueries = AuditLog::where('tenant_id', $tenant->id)
                ->where('action', 'ai_query')
                ->where('created_at', '>=', now()->startOfMonth())
                ->count();
            if ($monthQueries >= $plan->ai_queries_monthly) {
                return response()->json([
                    'error' => "Aylık TBB mevzuat ve asistan AI sorgu limitinize ({$plan->ai_queries_monthly} sorgu) ulaşıldı. Ek sorgu için paketinizi yükseltin.",
                    'upgrade_required' => true
                ], 403);
            }
        }

        return $next($request);
    }
}
