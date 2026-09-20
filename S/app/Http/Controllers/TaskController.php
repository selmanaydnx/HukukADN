<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;
use Illuminate\Support\Str;

class TaskController extends Controller
{
    /**
     * Görevleri Listeleme (GET /api/tasks)
     */
    public function index(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $query = Task::with('legalCase')->where('tenant_id', $tenant->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $tasks = $query->orderBy('due_date', 'asc')->get();
        return response()->json(['tasks' => $tasks]);
    }

    /**
     * Yeni Görev Ekleme (POST /api/tasks)
     */
    public function store(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'dueDate' => 'nullable|date',
            'caseId' => 'nullable|string',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'assignedTo' => 'nullable|string',
        ]);

        $task = Task::create([
            'id' => 'tsk_' . Str::random(20),
            'tenant_id' => $tenant->id,
            'case_id' => $validated['caseId'] ?? null,
            'title' => trim($validated['title']),
            'due_date' => $validated['dueDate'] ?? null,
            'priority' => $validated['priority'] ?? 'medium',
            'status' => 'pending',
            'assigned_to' => $validated['assignedTo'] ?? null,
        ]);

        return response()->json(['message' => 'Görev başarıyla oluşturuldu.', 'task' => $task], 201);
    }

    /**
     * Görev Güncelleme (PUT /api/tasks/{id})
     */
    public function update(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $task = Task::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$task) {
            return response()->json(['error' => 'Görev bulunamadı.'], 404);
        }

        $task->update($request->only(['title', 'due_date', 'status', 'priority', 'assigned_to']));
        return response()->json(['message' => 'Görev güncellendi.', 'task' => $task]);
    }

    /**
     * Görev Silme (DELETE /api/tasks/{id})
     */
    public function destroy(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $task = Task::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$task) {
            return response()->json(['error' => 'Görev bulunamadı.'], 404);
        }

        $task->delete();
        return response()->json(['message' => 'Görev silindi.']);
    }
}
