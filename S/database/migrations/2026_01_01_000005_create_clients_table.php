<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('tenant_id', 64)->index();
            $table->string('type', 20)->default('individual'); // individual, corporate
            $table->string('full_name', 255);
            $table->string('identity_number', 50)->nullable();
            $table->string('tax_office', 100)->nullable();
            $table->string('tax_number', 50)->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email', 191)->nullable();
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'full_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
