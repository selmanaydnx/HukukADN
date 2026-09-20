<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('tenant_id', 64)->index();
            $table->string('case_id', 64)->nullable()->index();
            $table->string('title', 255);
            $table->string('type', 50); // hearing, deadline, meeting, discovery
            $table->dateTime('start_date');
            $table->dateTime('end_date')->nullable();
            $table->boolean('is_procedural_deadline')->default(false);
            $table->string('procedural_rule', 100)->nullable();
            $table->string('location', 255)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'start_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
