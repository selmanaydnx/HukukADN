<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\User;
use App\Models\Tenant;
use App\Models\TenantMember;
use Illuminate\Support\Facades\DB;

class EnsureTenantContext
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Oturum kontrolü (Laravel Session veya Çerezden adn_session kontrolü)
        $userId = session('user_id');
        $tenantId = session('tenant_id');

        // Oturum çerezi veya auth guard kontrolü
        if (!$userId) {
            $cookieSession = $request->cookie('adn_session');
            if ($cookieSession) {
                $sessionRow = DB::table('sessions')->where('id', $cookieSession)->first();
                if ($sessionRow && $sessionRow->user_id) {
                    $userId = $sessionRow->user_id;
                    $tenantId = $sessionRow->tenant_id;
                    session(['user_id' => $userId, 'tenant_id' => $tenantId]);
                }
            }
        }

        if (!$userId) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['error' => 'Bu işlem için oturum açmanız gerekmektedir.'], 401);
            }
            return redirect('/giris');
        }

        $user = User::find($userId);
        if (!$user) {
            session()->flush();
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['error' => 'Geçersiz kullanıcı oturumu.'], 401);
            }
            return redirect('/giris');
        }

        // 2. Tenant & Üyelik Kontrolü
        if (!$tenantId) {
            $membership = TenantMember::where('user_id', $user->id)->first();
            if ($membership) {
                $tenantId = $membership->tenant_id;
                session(['tenant_id' => $tenantId]);
            }
        }

        $tenant = $tenantId ? Tenant::find($tenantId) : null;
        if ($tenant && $tenant->status === 'suspended') {
            return response()->json([
                'error' => 'Hukuk büronuzun çalışma alanı sistem yönetimi tarafından askıya alınmıştır. Lütfen sistem yöneticisi ile iletişime geçin.'
            ], 403);
        }

        $role = 'owner';
        if ($tenant) {
            $mem = TenantMember::where('tenant_id', $tenant->id)->where('user_id', $user->id)->first();
            if ($mem) {
                $role = $mem->role;
            }
        }

        // Request context içine gömme
        $request->attributes->set('user', $user);
        $request->attributes->set('tenant', $tenant);
        $request->attributes->set('role', $role);
        $request->merge([
            'auth_user' => $user,
            'current_tenant' => $tenant,
            'user_role' => $role
        ]);

        return $next($request);
    }
}
