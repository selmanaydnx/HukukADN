<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\Tenant;
use App\Models\TenantMember;
use App\Models\VerificationToken;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    /**
     * Yeni Kullanıcı ve Büro Kaydı (POST /api/auth/register)
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'fullName' => 'required|string|min:2|max:191',
            'email' => 'required|email|max:191',
            'password' => 'required|string|min:6',
            'officeName' => 'nullable|string|max:191',
            'city' => 'nullable|string|max:100',
            'planId' => 'nullable|string|max:50',
            'billingCycle' => 'nullable|string|in:monthly,yearly',
            'termsAccepted' => 'accepted'
        ]);

        $emailClean = strtolower(trim($validated['email']));

        if (User::where('email', $emailClean)->exists()) {
            return response()->json(['error' => 'Bu e-posta adresi ile zaten bir hesap bulunmaktadır.'], 400);
        }

        return DB::transaction(function () use ($validated, $emailClean, $request) {
            $userId = 'usr_' . Str::random(20);
            $user = User::create([
                'id' => $userId,
                'full_name' => trim($validated['fullName']),
                'email' => $emailClean,
                'password_hash' => Hash::make($validated['password']),
                'salt' => Str::random(16),
                'email_verified' => false,
                'is_verified_lawyer' => false,
            ]);

            $selectedPlan = $validated['planId'] ?? 'solo';
            $selectedCycle = $validated['billingCycle'] ?? 'monthly';
            $tenantName = !empty($validated['officeName'])
                ? trim($validated['officeName'])
                : trim($validated['fullName']) . ' Hukuk Bürosu';

            $tenantId = 'ten_' . Str::random(20);
            $tenant = Tenant::create([
                'id' => $tenantId,
                'name' => $tenantName,
                'city' => $validated['city'] ?? 'İstanbul',
                'email' => $emailClean,
                'plan' => 'office',
                'plan_id' => $selectedPlan,
                'billing_cycle' => $selectedCycle,
                'status' => 'trialing',
                'trial_ends_at' => now()->addDays(14),
                'has_used_trial' => false,
                'cancel_at_period_end' => false,
            ]);

            TenantMember::create([
                'id' => 'tmb_' . Str::random(20),
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'role' => 'owner'
            ]);

            // E-posta Doğrulama Tokeni
            $verificationToken = Str::random(40);
            VerificationToken::create([
                'id' => 'vtok_' . Str::random(20),
                'user_id' => $user->id,
                'type' => 'email_verify',
                'token' => $verificationToken,
                'expires_at' => now()->addDay(),
                'used' => false,
            ]);

            // Oturum başlatma
            session(['user_id' => $user->id, 'tenant_id' => $tenant->id]);

            AuditLog::create([
                'id' => 'aud_' . Str::random(20),
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'action' => 'register',
                'entity_type' => 'auth',
                'entity_id' => $user->id,
                'details' => "Yeni hesap ve büro çalışma alanı oluşturuldu ({$tenantName} - Paket: {$selectedPlan})",
                'ip_address' => $request->ip(),
            ]);

            $cookie = cookie('adn_session', session()->getId(), 7 * 24 * 60, null, null, false, true);

            return response()->json([
                'message' => 'Kayıt başarılı. Çalışma alanınız hazırlandı.',
                'user' => [
                    'id' => $user->id,
                    'fullName' => $user->full_name,
                    'email' => $user->email,
                    'emailVerified' => false,
                ],
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'role' => 'owner',
                    'planId' => $selectedPlan,
                    'billingCycle' => $selectedCycle,
                ],
                'verificationToken' => $verificationToken,
                'verificationUrl' => "/giris?verify_token={$verificationToken}"
            ], 201)->withCookie($cookie);
        });
    }

    /**
     * Kullanıcı Girişi (POST /api/auth/login)
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $emailClean = strtolower(trim($request->email));
        $user = User::where('email', $emailClean)->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return response()->json(['error' => 'E-posta veya parola hatalı.'], 401);
        }

        $membership = TenantMember::with('tenant')->where('user_id', $user->id)->first();
        if ($membership && $membership->tenant && $membership->tenant->status === 'suspended') {
            return response()->json([
                'error' => 'Hukuk büronuzun çalışma alanı sistem yönetimi tarafından askıya alınmıştır. Lütfen ADN Sistem Yönetimi ile iletişime geçin.'
            ], 403);
        }

        $tenantId = $membership ? $membership->tenant_id : null;
        $tenantName = $membership && $membership->tenant ? $membership->tenant->name : '';
        $role = $membership ? $membership->role : 'viewer';

        session(['user_id' => $user->id, 'tenant_id' => $tenantId]);
        $cookie = cookie('adn_session', session()->getId(), 7 * 24 * 60, null, null, false, true);

        return response()->json([
            'message' => 'Giriş başarılı.',
            'user' => [
                'id' => $user->id,
                'fullName' => $user->full_name,
                'email' => $user->email,
                'emailVerified' => (bool)$user->email_verified,
            ],
            'tenant' => [
                'id' => $tenantId,
                'name' => $tenantName,
                'role' => $role,
            ]
        ])->withCookie($cookie);
    }

    /**
     * Oturumu Kapatma (POST /api/auth/logout)
     */
    public function logout(Request $request)
    {
        session()->flush();
        $cookie = cookie()->forget('adn_session');

        return response()->json(['message' => 'Güvenli çıkış yapıldı.'])->withCookie($cookie);
    }

    /**
     * Profil ve Aktif Büro Bilgileri (GET /api/auth/me)
     */
    public function me(Request $request)
    {
        $user = $request->attributes->get('user') ?? $request->auth_user;
        $tenant = $request->attributes->get('tenant') ?? $request->current_tenant;
        $role = $request->attributes->get('role') ?? $request->user_role ?? 'viewer';

        if (!$user) {
            return response()->json(['error' => 'Oturum bulunamadı.'], 401);
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'fullName' => $user->full_name,
                'email' => $user->email,
                'barCity' => $user->bar_city,
                'barNumber' => $user->bar_number,
                'isVerifiedLawyer' => (bool)$user->is_verified_lawyer,
                'emailVerified' => (bool)$user->email_verified,
            ],
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'plan' => $tenant->plan,
                'planId' => $tenant->plan_id,
                'billingCycle' => $tenant->billing_cycle,
                'status' => $tenant->status,
                'role' => $role,
            ] : null
        ]);
    }

    /**
     * E-Posta Doğrulama (POST /api/auth/verify-email)
     */
    public function verifyEmail(Request $request)
    {
        $request->validate(['token' => 'required|string']);

        $tokenRow = VerificationToken::where('type', 'email_verify')
            ->where('token', $request->token)
            ->first();

        if (!$tokenRow || $tokenRow->used || $tokenRow->expires_at->isPast()) {
            return response()->json(['error' => 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.'], 400);
        }

        $tokenRow->update(['used' => true]);
        User::where('id', $tokenRow->user_id)->update(['email_verified' => true]);

        return response()->json([
            'message' => 'E-posta adresiniz başarıyla doğrulandı. Tüm platform özelliklerini güvenle kullanabilirsiniz.'
        ]);
    }

    /**
     * Şifremi Unuttum (POST /api/auth/forgot-password)
     */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $emailClean = strtolower(trim($request->email));

        $user = User::where('email', $emailClean)->first();
        if (!$user) {
            return response()->json([
                'message' => 'Eğer sistemde kayıtlı bir hesabınız varsa sıfırlama bağlantısı gönderilmiştir.'
            ]);
        }

        $token = Str::random(40);
        VerificationToken::create([
            'id' => 'vtok_' . Str::random(20),
            'user_id' => $user->id,
            'type' => 'password_reset',
            'token' => $token,
            'expires_at' => now()->addHour(),
            'used' => false,
        ]);

        return response()->json([
            'message' => 'Şifre sıfırlama kodu oluşturuldu.',
            'resetToken' => $token,
            'resetUrl' => "/sifremi-unuttum?token={$token}"
        ]);
    }

    /**
     * Parola Sıfırlama (POST /api/auth/reset-password)
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'newPassword' => 'required|string|min:6'
        ]);

        $tokenRow = VerificationToken::where('type', 'password_reset')
            ->where('token', $request->token)
            ->first();

        if (!$tokenRow || $tokenRow->used || $tokenRow->expires_at->isPast()) {
            return response()->json(['error' => 'Sıfırlama kodu geçersiz veya süresi dolmuş.'], 400);
        }

        $user = User::findOrFail($tokenRow->user_id);
        $user->update([
            'password_hash' => Hash::make($request->newPassword)
        ]);

        $tokenRow->update(['used' => true]);

        return response()->json(['message' => 'Parolanız başarıyla güncellendi. Yeni parolanızla giriş yapabilirsiniz.']);
    }
}
