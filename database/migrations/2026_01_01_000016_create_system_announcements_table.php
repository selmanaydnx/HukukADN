<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_announcements', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('title', 255);
            $table->text('content');
            $table->string('priority', 20)->default('normal'); // normal, urgent, info
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_announcements');
    }
};
