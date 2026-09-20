<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verification_tokens', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('user_id', 64)->index();
            $table->string('type', 50); // email_verify, password_reset
            $table->string('token', 191)->unique();
            $table->timestamp('expires_at');
            $table->boolean('used')->default(false);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['type', 'token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_tokens');
    }
};
