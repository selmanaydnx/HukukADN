<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinanceRecord extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'case_id',
        'type',
        'category',
        'amount',
        'description',
        'record_date',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'record_date' => 'date',
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
