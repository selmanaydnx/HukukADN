<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'case_id',
        'title',
        'type',
        'start_date',
        'end_date',
        'is_procedural_deadline',
        'procedural_rule',
        'location',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'datetime',
            'end_date' => 'datetime',
            'is_procedural_deadline' => 'boolean',
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function legalCase()
    {
        return $this->belongsTo(LegalCase::class, 'case_id');
    }
}
