<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('full_name', 191);
            $table->string('email', 191)->unique();
            $table->string('password_hash', 255);
            $table->string('salt', 64)->nullable();
            $table->string('bar_city', 100)->nullable();
            $table->string('bar_number', 50)->nullable();
            $table->boolean('is_verified_lawyer')->default(false);
            $table->boolean('email_verified')->default(false);
            $table->boolean('two_factor_enabled')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
