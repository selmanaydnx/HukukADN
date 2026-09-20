<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\TenantMember;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class TenantController extends Controller
{
    /**
     * Büro Üyelerini Listeleme (GET /api/tenant/members)
     */
    public function members(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $members = TenantMember::with('user')
            ->where('tenant_id', $tenant->id)
            ->get()
            ->map(function ($m) {
                return [
                    'id' => $m->id,
                    'userId' => $m->user_id,
                    'fullName' => $m->user ? $m->user->full_name : '',
                    'email' => $m->user ? $m->user->email : '',
                    'role' => $m->role,
                    'createdAt' => $m->created_at->toIso8601String(),
                ];
            });

        return response()->json(['members' => $members]);
    }

    /**
     * Yeni Büro Üyesi Davet Etme (POST /api/tenant/invite)
     */
    public function invite(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $validated = $request->validate([
            'email' => 'required|email|max:191',
            'fullName' => 'required|string|max:191',
            'role' => 'required|string|in:lawyer,manager,assistant,finance,viewer',
        ]);

        $emailClean = strtolower(trim($validated['email']));

        // Kullanıcı var mı?
        $user = User::where('email', $emailClean)->first();
        if (!$user) {
            $user = User::create([
                'id' => 'usr_' . Str::random(20),
                'full_name' => trim($validated['fullName']),
                'email' => $emailClean,
                'password_hash' => Hash::make(Str::random(12)),
                'email_verified' => true,
            ]);
        }

        // Zaten bu büronun üyesi mi?
        $existing = TenantMember::where('tenant_id', $tenant->id)->where('user_id', $user->id)->first();
        if ($existing) {
            return response()->json(['error' => 'Bu kullanıcı zaten büronuzun bir üyesidir.'], 400);
        }

        $member = TenantMember::create([
            'id' => 'tmb_' . Str::random(20),
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => $validated['role'],
        ]);

        AuditLog::create([
            'id' => 'aud_' . Str::random(20),
            'tenant_id' => $tenant->id,
            'user_id' => auth()->id(),
            'action' => 'invite_member',
            'entity_type' => 'tenant_member',
            'entity_id' => $member->id,
            'details' => "Büroya yeni üye davet edildi: {$user->email} (Rol: {$validated['role']})",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => "{$user->full_name} büroya başarıyla eklendi.",
            'member' => $member
        ], 201);
    }

    /**
     * Üye Rolünü Güncelleme (PUT /api/tenant/members/{id}/role)
     */
    public function updateRole(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $validated = $request->validate([
            'role' => 'required|string|in:owner,manager,lawyer,assistant,finance,viewer'
        ]);

        $member = TenantMember::where('tenant_id', $tenant->id)->where('id', $id)->first();
        if (!$member) {
            return response()->json(['error' => 'Üye bulunamadı.'], 404);
        }

        $member->update(['role' => $validated['role']]);
        return response()->json(['message' => 'Üye rolü güncellendi.', 'member' => $member]);
    }

    /**
     * Üyeyi Bürodan Çıkarma (DELETE /api/tenant/members/{id})
     */
    public function removeMember(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $member = TenantMember::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$member) {
            return response()->json(['error' => 'Üye bulunamadı.'], 404);
        }

        if ($member->role === 'owner') {
            $ownerCount = TenantMember::where('tenant_id', $tenant->id)->where('role', 'owner')->count();
            if ($ownerCount <= 1) {
                return response()->json(['error' => 'Büronun tek kurucu sahibini çıkaramazsınız.'], 400);
            }
        }

        $member->delete();
        return response()->json(['message' => 'Üye bürodan çıkarıldı.']);
    }
}
