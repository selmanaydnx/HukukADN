<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LegalCase extends Model
{
    use HasFactory;

    protected $table = 'cases';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'client_id',
        'title',
        'file_number',
        'court_name',
        'case_type',
        'status',
        'claim_amount',
        'currency',
        'assigned_lawyer_id',
        'next_hearing_date',
        'critical_deadline',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'claim_amount' => 'decimal:2',
            'next_hearing_date' => 'datetime',
            'critical_deadline' => 'datetime',
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function events()
    {
        return $this->hasMany(Event::class, 'case_id');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'case_id');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'case_id');
    }

    public function financeRecords()
    {
        return $this->hasMany(FinanceRecord::class, 'case_id');
    }
}
