<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    /**
     * Belgeleri Listeleme (GET /api/documents)
     */
    public function index(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $query = Document::where('tenant_id', $tenant->id);

        if ($request->filled('caseId')) {
            $query->where('case_id', $request->caseId);
        }

        $documents = $query->orderBy('created_at', 'desc')->get();
        return response()->json(['documents' => $documents]);
    }

    /**
     * Yeni Belge Kaydı (POST /api/documents)
     */
    public function store(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $validated = $request->validate([
            'fileName' => 'required|string|max:255',
            'caseId' => 'nullable|string',
            'fileSize' => 'nullable|integer',
            'mimeType' => 'nullable|string|max:100',
            'filePath' => 'nullable|string',
        ]);

        $doc = Document::create([
            'id' => 'doc_' . Str::random(20),
            'tenant_id' => $tenant->id,
            'case_id' => $validated['caseId'] ?? null,
            'file_name' => $validated['fileName'],
            'file_path' => $validated['filePath'] ?? ('/uploads/' . $validated['fileName']),
            'file_size' => $validated['fileSize'] ?? 0,
            'mime_type' => $validated['mimeType'] ?? 'application/pdf',
        ]);

        return response()->json(['message' => 'Belge kaydedildi.', 'document' => $doc], 201);
    }

    /**
     * Belge Silme (DELETE /api/documents/{id})
     */
    public function destroy(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $doc = Document::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$doc) {
            return response()->json(['error' => 'Belge bulunamadı.'], 404);
        }

        $doc->delete();
        return response()->json(['message' => 'Belge silindi.']);
    }
}
