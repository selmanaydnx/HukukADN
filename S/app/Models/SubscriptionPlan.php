<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'price_monthly',
        'price_yearly',
        'currency',
        'max_lawyers',
        'max_cases',
        'storage_gb',
        'ai_queries_monthly',
        'features_json',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price_monthly' => 'decimal:2',
            'price_yearly' => 'decimal:2',
            'max_lawyers' => 'integer',
            'max_cases' => 'integer',
            'storage_gb' => 'integer',
            'ai_queries_monthly' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function getFeaturesAttribute()
    {
        return $this->features_json ? json_decode($this->features_json, true) : [];
    }
}
