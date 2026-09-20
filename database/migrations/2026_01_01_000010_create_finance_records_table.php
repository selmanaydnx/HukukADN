<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_records', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('tenant_id', 64)->index();
            $table->string('case_id', 64)->nullable()->index();
            $table->string('type', 20); // income, expense
            $table->string('category', 50); // vekalet_ucreti, harc, masraf, bilirkisi, genel_gider, diger
            $table->decimal('amount', 14, 2);
            $table->string('description', 255)->nullable();
            $table->date('record_date');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'record_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_records');
    }
};
