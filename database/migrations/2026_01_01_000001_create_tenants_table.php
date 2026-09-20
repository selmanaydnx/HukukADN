<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('name', 255);
            $table->string('city', 100)->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email', 191)->nullable();
            $table->string('plan', 50)->default('individual');
            $table->string('status', 50)->default('trialing');
            $table->string('plan_id', 50)->default('solo');
            $table->string('billing_cycle', 20)->default('monthly');
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_starts_at')->nullable();
            $table->timestamp('current_period_ends_at')->nullable();
            $table->boolean('cancel_at_period_end')->default(false);
            $table->boolean('has_used_trial')->default(false);
            $table->timestamp('subscription_expires_at')->nullable();
            $table->boolean('ai_external_allowed')->default(false);
            $table->timestamps();

            $table->index('status');
            $table->index('plan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
