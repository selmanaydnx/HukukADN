<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'city',
        'phone',
        'email',
        'plan',
        'status',
        'plan_id',
        'billing_cycle',
        'trial_ends_at',
        'current_period_starts_at',
        'current_period_ends_at',
        'cancel_at_period_end',
        'has_used_trial',
        'subscription_expires_at',
        'ai_external_allowed',
    ];

    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
            'current_period_starts_at' => 'datetime',
            'current_period_ends_at' => 'datetime',
            'subscription_expires_at' => 'datetime',
            'cancel_at_period_end' => 'boolean',
            'has_used_trial' => 'boolean',
            'ai_external_allowed' => 'boolean',
        ];
    }

    public function members()
    {
        return $this->hasMany(TenantMember::class, 'tenant_id');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'tenant_members', 'tenant_id', 'user_id')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    public function clients()
    {
        return $this->hasMany(Client::class, 'tenant_id');
    }

    public function cases()
    {
        return $this->hasMany(LegalCase::class, 'tenant_id');
    }

    public function events()
    {
        return $this->hasMany(Event::class, 'tenant_id');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'tenant_id');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'tenant_id');
    }

    public function financeRecords()
    {
        return $this->hasMany(FinanceRecord::class, 'tenant_id');
    }

    public function planDetails()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id', 'id');
    }

    public function subscriptionHistories()
    {
        return $this->hasMany(SubscriptionHistory::class, 'tenant_id');
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'tenant_id');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class, 'tenant_id');
    }
}
