<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AiGuardrailService;

class AiController extends Controller
{
    /**
     * TBB Uyumlu Yapay Zeka Hukuk Asistanı (POST /api/ai/query)
     */
    public function query(Request $request)
    {
        $request->validate([
            'query' => 'required|string|min:2',
            'caseId' => 'nullable|string'
        ]);

        $tenant = $request->attributes->get('tenant');
        $result = AiGuardrailService::processQuery(
            $tenant,
            $request->query,
            $request->caseId
        );

        return response()->json($result);
    }
}
