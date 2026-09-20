<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'full_name',
        'email',
        'password_hash',
        'salt',
        'bar_city',
        'bar_number',
        'is_verified_lawyer',
        'email_verified',
        'two_factor_enabled',
    ];

    protected $hidden = [
        'password_hash',
        'salt',
    ];

    protected function casts(): array
    {
        return [
            'is_verified_lawyer' => 'boolean',
            'email_verified' => 'boolean',
            'two_factor_enabled' => 'boolean',
        ];
    }

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function tenantMembers()
    {
        return $this->hasMany(TenantMember::class, 'user_id');
    }

    public function tenants()
    {
        return $this->belongsToMany(Tenant::class, 'tenant_members', 'user_id', 'tenant_id')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    public function verificationTokens()
    {
        return $this->hasMany(VerificationToken::class, 'user_id');
    }
}
