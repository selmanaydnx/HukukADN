<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SystemAdmin;
use App\Models\Tenant;
use App\Models\User;
use App\Models\TenantMember;
use App\Models\LegalCase;
use App\Models\SubscriptionPlan;
use App\Models\SystemAnnouncement;
use App\Models\Invoice;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SystemController extends Controller
{
    /**
     * Süper Yönetici Girişi (POST /api/system/auth/login)
     */
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $username = trim($request->username);
        $password = trim($request->password);

        // Özel hardcoded/güvenlik kontrolü (ömer:2571)
        if (($username === 'ömer' || $username === 'omer') && $password === '2571') {
            $admin = SystemAdmin::firstOrCreate(
                ['username' => 'ömer'],
                [
                    'id' => 'adm_omer_super',
                    'full_name' => 'Ömer Sistem Yöneticisi',
                    'password_hash' => Hash::make('2571'),
                    'role' => 'superadmin'
                ]
            );

            session(['system_admin_id' => $admin->id]);
            return response()->json([
                'message' => 'Sistem yönetici paneline başarıyla giriş yapıldı.',
                'admin' => ['username' => 'ömer', 'role' => 'superadmin']
            ]);
        }

        // Veritabanı sorgusu
        $admin = SystemAdmin::where('username', $username)->first();
        if (!$admin || !Hash::check($password, $admin->password_hash)) {
            return response()->json(['error' => 'Geçersiz sistem yöneticisi kullanıcı adı veya şifre.'], 401);
        }

        session(['system_admin_id' => $admin->id]);
        return response()->json([
            'message' => 'Sistem yönetici paneline başarıyla giriş yapıldı.',
            'admin' => ['username' => $admin->username, 'role' => $admin->role]
        ]);
    }

    /**
     * Süper Yönetici Çıkışı (POST /api/system/auth/logout)
     */
    public function logout(Request $request)
    {
        session()->forget('system_admin_id');
        return response()->json(['message' => 'Sistem yönetici oturumu sonlandırıldı.']);
    }

    /**
     * Sistem Dashboard Metrikleri & MRR (GET /api/system/dashboard)
     */
    public function dashboard()
    {
        $totalTenants = Tenant::count();
        $activeTenants = Tenant::where('status', 'active')->count();
        $trialingTenants = Tenant::where('status', 'trialing')->count();
        $suspendedTenants = Tenant::where('status', 'suspended')->count();

        $totalUsers = User::count();
        $totalCases = LegalCase::count();

        // MRR (Monthly Recurring Revenue) Hesabı
        $mrr = 0.0;
        $activeOffices = Tenant::where('status', 'active')->get();
        $plansMap = SubscriptionPlan::all()->keyBy('id');

        foreach ($activeOffices as $office) {
            $plan = $plansMap->get($office->plan_id);
            if ($plan) {
                if ($office->billing_cycle === 'yearly') {
                    $mrr += round(((float)$plan->price_yearly) / 12, 2);
                } else {
                    $mrr += (float)$plan->price_monthly;
                }
            }
        }

        $recentInvoices = Invoice::orderBy('created_at', 'desc')->take(5)->get();

        return response()->json([
            'metrics' => [
                'total_tenants' => $totalTenants,
                'active_tenants' => $activeTenants,
                'trialing_tenants' => $trialingTenants,
                'suspended_tenants' => $suspendedTenants,
                'total_users' => $totalUsers,
                'total_cases' => $totalCases,
                'monthly_recurring_revenue' => round($mrr, 2),
                'currency' => 'TRY'
            ],
            'recent_invoices' => $recentInvoices
        ]);
    }

    /**
     * Tüm Büroların Listesi (GET /api/system/tenants)
     */
    public function tenants()
    {
        $tenants = Tenant::with(['members.user'])->orderBy('created_at', 'desc')->get()->map(function ($t) {
            $ownerMember = $t->members->where('role', 'owner')->first();
            $ownerUser = $ownerMember ? $ownerMember->user : null;

            return [
                'id' => $t->id,
                'name' => $t->name,
                'city' => $t->city,
                'email' => $t->email,
                'plan_id' => $t->plan_id,
                'billing_cycle' => $t->billing_cycle,
                'status' => $t->status,
                'trial_ends_at' => $t->trial_ends_at?->toIso8601String(),
                'member_count' => $t->members->count(),
                'case_count' => LegalCase::where('tenant_id', $t->id)->count(),
                'owner' => $ownerUser ? [
                    'id' => $ownerUser->id,
                    'full_name' => $ownerUser->full_name,
                    'email' => $ownerUser->email
                ] : null,
                'created_at' => $t->created_at->toIso8601String(),
            ];
        });

        return response()->json(['tenants' => $tenants]);
    }

    /**
     * Büro Askıya Alma (POST /api/system/tenants/{id}/suspend)
     */
    public function suspendTenant($id)
    {
        $tenant = Tenant::findOrFail($id);
        $tenant->update(['status' => 'suspended']);

        return response()->json([
            'message' => "{$tenant->name} çalışma alanı başarıyla askıya alındı."
        ]);
    }

    /**
     * Büro Aktifleştirme (POST /api/system/tenants/{id}/activate)
     */
    public function activateTenant($id)
    {
        $tenant = Tenant::findOrFail($id);
        $tenant->update(['status' => 'active']);

        return response()->json([
            'message' => "{$tenant->name} çalışma alanı başarıyla aktifleştirildi."
        ]);
    }

    /**
     * Paket Fiyatı ve Limit Güncelleme (PUT /api/system/plans/{id})
     */
    public function updatePlan(Request $request, $id)
    {
        $plan = SubscriptionPlan::findOrFail($id);
        $validated = $request->validate([
            'price_monthly' => 'nullable|numeric|min:0',
            'price_yearly' => 'nullable|numeric|min:0',
            'max_lawyers' => 'nullable|integer',
            'max_cases' => 'nullable|integer',
            'storage_gb' => 'nullable|integer',
            'ai_queries_monthly' => 'nullable|integer',
        ]);

        $plan->update($validated);

        return response()->json([
            'message' => "{$plan->name} paketi başarıyla güncellendi.",
            'plan' => $plan
        ]);
    }

    /**
     * Büro Yöneticisi Parolasını Sıfırlama (POST /api/system/tenants/{id}/reset-password)
     */
    public function resetOfficePassword(Request $request, $id)
    {
        $request->validate(['newPassword' => 'required|string|min:6']);
        $tenant = Tenant::findOrFail($id);

        $ownerMember = TenantMember::where('tenant_id', $tenant->id)->where('role', 'owner')->first();
        if (!$ownerMember) {
            return response()->json(['error' => 'Büro sahibi bulunamadı.'], 404);
        }

        $user = User::findOrFail($ownerMember->user_id);
        $user->update([
            'password_hash' => Hash::make($request->newPassword)
        ]);

        return response()->json([
            'message' => "{$tenant->name} büro sahibinin ({$user->email}) parolası sistem yöneticisi tarafından başarıyla sıfırlandı."
        ]);
    }

    /**
     * Sistem Duyuruları (GET /api/system/announcements)
     */
    public function announcements()
    {
        $announcements = SystemAnnouncement::where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['announcements' => $announcements]);
    }
}
