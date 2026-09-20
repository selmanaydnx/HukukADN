<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('tenant_id', 64)->index();
            $table->string('case_id', 64)->nullable()->index();
            $table->string('title', 255);
            $table->dateTime('due_date')->nullable();
            $table->string('status', 50)->default('pending'); // pending, in_progress, completed
            $table->string('priority', 20)->default('medium'); // low, medium, high, urgent
            $table->string('assigned_to', 64)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
