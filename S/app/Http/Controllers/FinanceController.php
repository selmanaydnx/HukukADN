<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\FinanceRecord;
use Illuminate\Support\Str;

class FinanceController extends Controller
{
    /**
     * Finansal Kayıtları Listeleme (GET /api/finance)
     */
    public function index(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $query = FinanceRecord::with('legalCase')->where('tenant_id', $tenant->id);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $records = $query->orderBy('record_date', 'desc')->get();
        return response()->json(['records' => $records]);
    }

    /**
     * Yeni Gelir / Gider / Masraf Kaydı (POST /api/finance)
     */
    public function store(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $validated = $request->validate([
            'type' => 'required|string|in:income,expense',
            'category' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'recordDate' => 'required|date',
            'caseId' => 'nullable|string',
            'description' => 'nullable|string|max:255',
        ]);

        $record = FinanceRecord::create([
            'id' => 'fin_' . Str::random(20),
            'tenant_id' => $tenant->id,
            'case_id' => $validated['caseId'] ?? null,
            'type' => $validated['type'],
            'category' => $validated['category'],
            'amount' => $validated['amount'],
            'record_date' => $validated['recordDate'],
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json(['message' => 'Finans kaydı oluşturuldu.', 'record' => $record], 201);
    }

    /**
     * Finansal Özet & Grafik Verileri (GET /api/finance/stats)
     */
    public function stats(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $totalIncome = FinanceRecord::where('tenant_id', $tenant->id)->where('type', 'income')->sum('amount') ?? 0;
        $totalExpense = FinanceRecord::where('tenant_id', $tenant->id)->where('type', 'expense')->sum('amount') ?? 0;
        $netBalance = $totalIncome - $totalExpense;

        return response()->json([
            'total_income' => (float)$totalIncome,
            'total_expense' => (float)$totalExpense,
            'net_balance' => (float)$netBalance,
            'currency' => 'TRY'
        ]);
    }

    /**
     * Finans Kaydı Silme (DELETE /api/finance/{id})
     */
    public function destroy(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $record = FinanceRecord::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$record) {
            return response()->json(['error' => 'Kayıt bulunamadı.'], 404);
        }

        $record->delete();
        return response()->json(['message' => 'Finans kaydı silindi.']);
    }
}
