<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'type',
        'full_name',
        'identity_number',
        'tax_office',
        'tax_number',
        'phone',
        'email',
        'address',
        'notes',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function cases()
    {
        return $this->hasMany(LegalCase::class, 'client_id');
    }
}
