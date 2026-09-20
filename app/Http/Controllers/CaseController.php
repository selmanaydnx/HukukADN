<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Models\LegalCase;
use App\Models\Client;
use App\Models\Event;
use App\Models\AuditLog;

class CaseController extends Controller
{
    /**
     * Dava Dosyalarını Listeleme (GET /api/cases)
     */
    public function index(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $query = LegalCase::with(['client'])
            ->where('tenant_id', $tenant->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('file_number', 'like', "%{$s}%")
                  ->orWhere('court_name', 'like', "%{$s}%");
            });
        }

        $cases = $query->orderBy('created_at', 'desc')->get();
        return response()->json(['cases' => $cases]);
    }

    /**
     * Yeni Dava Dosyası Açma (POST /api/cases)
     */
    public function store(Request $request)
    {
        $tenant = $request->attributes->get('tenant');

        $validated = $request->validate([
            'clientId' => 'required|string',
            'title' => 'required|string|max:255',
            'fileNumber' => 'required|string|max:100',
            'courtName' => 'required|string|max:255',
            'caseType' => 'required|string|max:100',
            'claimAmount' => 'nullable|numeric',
            'currency' => 'nullable|string|max:10',
            'notes' => 'nullable|string',
            'nextHearingDate' => 'nullable|date',
            'criticalDeadline' => 'nullable|date',
        ]);

        // Müvekkil bu büroya mı ait?
        $client = Client::where('tenant_id', $tenant->id)->find($validated['clientId']);
        if (!$client) {
            return response()->json(['error' => 'Seçilen müvekkil bu büroda bulunamadı.'], 404);
        }

        // Menfaat Çatışması (Conflict Check) Filtresi
        $conflictFound = false;
        $conflictDetails = null;
        $existingCase = LegalCase::where('tenant_id', $tenant->id)
            ->where('file_number', trim($validated['fileNumber']))
            ->first();

        if ($existingCase) {
            $conflictFound = true;
            $conflictDetails = "Bu dosya numarası ({$validated['fileNumber']}) büronuzda zaten kayıtlıdır.";
        }

        $caseId = 'cas_' . Str::random(20);
        $case = LegalCase::create([
            'id' => $caseId,
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'title' => trim($validated['title']),
            'file_number' => trim($validated['fileNumber']),
            'court_name' => trim($validated['courtName']),
            'case_type' => trim($validated['caseType']),
            'status' => 'active',
            'claim_amount' => $validated['claimAmount'] ?? 0.00,
            'currency' => $validated['currency'] ?? 'TRY',
            'next_hearing_date' => $validated['nextHearingDate'] ?? null,
            'critical_deadline' => $validated['criticalDeadline'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        // Otomatik Duruşma Etkinliği Ekleme
        if (!empty($validated['nextHearingDate'])) {
            Event::create([
                'id' => 'evt_' . Str::random(20),
                'tenant_id' => $tenant->id,
                'case_id' => $case->id,
                'title' => "Duruşma: {$case->file_number} - {$case->title}",
                'type' => 'hearing',
                'start_date' => $validated['nextHearingDate'],
                'location' => $case->court_name,
            ]);
        }

        AuditLog::create([
            'id' => 'aud_' . Str::random(20),
            'tenant_id' => $tenant->id,
            'user_id' => auth()->id(),
            'action' => 'create_case',
            'entity_type' => 'case',
            'entity_id' => $case->id,
            'details' => "Yeni dava dosyası açıldı: {$case->file_number}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Dava dosyası başarıyla açıldı.',
            'case' => $case->load('client'),
            'conflictCheck' => [
                'hasConflict' => $conflictFound,
                'details' => $conflictDetails
            ]
        ], 201);
    }

    /**
     * Dava Detayı (GET /api/cases/{id}) - IDOR Korumalı
     */
    public function show(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $case = LegalCase::with(['client', 'events', 'tasks', 'documents', 'financeRecords'])
            ->where('tenant_id', $tenant->id)
            ->where('id', $id)
            ->first();

        if (!$case) {
            return response()->json(['error' => 'Dosya bulunamadı veya erişim yetkiniz yok.'], 404);
        }

        return response()->json(['case' => $case]);
    }

    /**
     * Dava Güncelleme (PUT /api/cases/{id})
     */
    public function update(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $case = LegalCase::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$case) {
            return response()->json(['error' => 'Dosya bulunamadı.'], 404);
        }

        $case->update($request->only([
            'title', 'court_name', 'case_type', 'status',
            'claim_amount', 'currency', 'next_hearing_date',
            'critical_deadline', 'notes'
        ]));

        return response()->json(['message' => 'Dosya başarıyla güncellendi.', 'case' => $case]);
    }

    /**
     * Dava Silme (DELETE /api/cases/{id})
     */
    public function destroy(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $case = LegalCase::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$case) {
            return response()->json(['error' => 'Dosya bulunamadı.'], 404);
        }

        $case->delete();
        return response()->json(['message' => 'Dava dosyası başarıyla silindi.']);
    }
}
