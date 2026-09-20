<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_admins', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('username', 100)->unique();
            $table->string('password_hash', 255);
            $table->string('full_name', 191);
            $table->string('role', 50)->default('superadmin');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_admins');
    }
};
