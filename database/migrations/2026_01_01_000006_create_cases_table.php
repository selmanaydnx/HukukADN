<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cases', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('tenant_id', 64)->index();
            $table->string('client_id', 64)->index();
            $table->string('title', 255);
            $table->string('file_number', 100);
            $table->string('court_name', 255);
            $table->string('case_type', 100);
            $table->string('status', 50)->default('active'); // active, closed, archived
            $table->decimal('claim_amount', 14, 2)->default(0.00);
            $table->string('currency', 10)->default('TRY');
            $table->string('assigned_lawyer_id', 64)->nullable();
            $table->dateTime('next_hearing_date')->nullable();
            $table->dateTime('critical_deadline')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'file_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cases');
    }
};
