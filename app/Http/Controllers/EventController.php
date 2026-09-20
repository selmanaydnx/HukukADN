<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Event;
use Illuminate\Support\Str;

class EventController extends Controller
{
    /**
     * Duruşma ve Süreleri Listeleme (GET /api/events)
     */
    public function index(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $query = Event::with('legalCase')->where('tenant_id', $tenant->id);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $events = $query->orderBy('start_date', 'asc')->get();
        return response()->json(['events' => $events]);
    }

    /**
     * Yeni Etkinlik / Duruşma Ekleme (POST /api/events)
     */
    public function store(Request $request)
    {
        $tenant = $request->attributes->get('tenant');
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|string|max:50',
            'startDate' => 'required|date',
            'endDate' => 'nullable|date',
            'caseId' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'isProceduralDeadline' => 'nullable|boolean',
        ]);

        $event = Event::create([
            'id' => 'evt_' . Str::random(20),
            'tenant_id' => $tenant->id,
            'case_id' => $validated['caseId'] ?? null,
            'title' => trim($validated['title']),
            'type' => $validated['type'],
            'start_date' => $validated['startDate'],
            'end_date' => $validated['endDate'] ?? null,
            'is_procedural_deadline' => (bool)($validated['isProceduralDeadline'] ?? false),
            'location' => $validated['location'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(['message' => 'Etkinlik oluşturuldu.', 'event' => $event], 201);
    }

    /**
     * Etkinlik Silme (DELETE /api/events/{id})
     */
    public function destroy(Request $request, $id)
    {
        $tenant = $request->attributes->get('tenant');
        $event = Event::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$event) {
            return response()->json(['error' => 'Etkinlik bulunamadı.'], 404);
        }

        $event->delete();
        return response()->json(['message' => 'Etkinlik silindi.']);
    }
}
