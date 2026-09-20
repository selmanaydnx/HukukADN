<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_history', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('tenant_id', 64)->index();
            $table->string('from_plan_id', 50)->nullable();
            $table->string('to_plan_id', 50);
            $table->string('billing_cycle', 20)->default('monthly');
            $table->string('action', 50); // upgrade, downgrade, renew, cancel, trial_started
            $table->timestamp('effective_date')->useCurrent();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_history');
    }
};
