<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->string('id', 50)->primary(); // solo, pro, enterprise
            $table->string('name', 100);
            $table->decimal('price_monthly', 10, 2);
            $table->decimal('price_yearly', 10, 2);
            $table->string('currency', 10)->default('TRY');
            $table->integer('max_lawyers')->default(1);
            $table->integer('max_cases')->default(150); // -1 = limitsiz
            $table->integer('storage_gb')->default(15);
            $table->integer('ai_queries_monthly')->default(150);
            $table->text('features_json')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
