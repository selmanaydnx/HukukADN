<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Models\Client;
use App\Models\AuditLog;

class ClientController extends Controller
{
    /**
     * Müvekkilleri Listeleme (GET /api/clients)
     */
    public function index(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $query = Client::where('tenant_id', $tenant->id);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('full_name', 'like', "%{$s}%")
                  ->orWhere('identity_number', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%");
            });
        }

        $clients = $query->orderBy('full_name', 'asc')->get();
        return response()->json(['clients' => $clients]);
    }

    /**
     * Yeni Müvekkil Ekleme (POST /api/clients)
     */
    public function store(Request $request)
    {
        $tenant = $request->attributes->get('tenant');

        $validated = $request->validate([
            'fullName' => 'required|string|max:255',
            'type' => 'nullable|string|in:individual,corporate',
            'identityNumber' => 'nullable|string|max:50',
            'taxOffice' => 'nullable|string|max:100',
            'taxNumber' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:191',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $clientId = 'cli_' . Str::random(20);
        $client = Client::create([
            'id' => $clientId,
            'tenant_id' => $tenant->id,
            'full_name' => trim($validated['fullName']),
            'type' => $validated['type'] ?? 'individual',
            'identity_number' => $validated['identityNumber'] ?? null,
            'tax_office' => $validated['taxOffice'] ?? null,
            'tax_number' => $validated['taxNumber'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        AuditLog::create([
            'id' => 'aud_' . Str::random(20),
            'tenant_id' => $tenant->id,
            'user_id' => auth()->id(),
            'action' => 'create_client',
            'entity_type' => 'client',
            'entity_id' => $client->id,
            'details' => "Yeni müvekkil eklendi: {$client->full_name}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Müvekkil kaydı başarıyla oluşturuldu.',
            'client' => $client
        ], 201);
    }

    /**
     * Müvekkil Detayı (GET /api/clients/{id}) - IDOR Korumalı
     */
    public function show(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $client = Client::with('cases')
            ->where('tenant_id', $tenant->id)
            ->where('id', $id)
            ->first();

        if (!$client) {
            return response()->json(['error' => 'Müvekkil bulunamadı.'], 404);
        }

        return response()->json(['client' => $client]);
    }

    /**
     * Müvekkil Güncelleme (PUT /api/clients/{id})
     */
    public function update(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $client = Client::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$client) {
            return response()->json(['error' => 'Müvekkil bulunamadı.'], 404);
        }

        $client->update($request->only([
            'full_name', 'type', 'identity_number', 'tax_office',
            'tax_number', 'phone', 'email', 'address', 'notes'
        ]));

        return response()->json(['message' => 'Müvekkil güncellendi.', 'client' => $client]);
    }

    /**
     * Müvekkil Silme (DELETE /api/clients/{id})
     */
    public function destroy(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $client = Client::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$client) {
            return response()->json(['error' => 'Müvekkil bulunamadı.'], 404);
        }

        $client->delete();
        return response()->json(['message' => 'Müvekkil başarıyla silindi.']);
    }
}
