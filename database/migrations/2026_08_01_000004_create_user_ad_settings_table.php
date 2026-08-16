<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_ad_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('smartlink_enabled')->default(false);
            $table->string('smartlink_url')->nullable();
            $table->boolean('social_bar_enabled')->default(false);
            $table->longText('social_bar_code')->nullable();
            $table->boolean('popunder_enabled')->default(false);
            $table->longText('popunder_code')->nullable();
            $table->string('frequency')->default('session'); // session | always
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_ad_settings');
    }
};
