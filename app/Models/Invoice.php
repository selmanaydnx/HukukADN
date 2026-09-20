<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'invoice_number',
        'amount',
        'tax_amount',
        'total_amount',
        'currency',
        'billing_cycle',
        'plan_id',
        'status',
        'provider',
        'provider_transaction_id',
        'period_start',
        'period_end',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'period_start' => 'datetime',
            'period_end' => 'datetime',
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}
