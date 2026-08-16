<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('video_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->string('viewer_hash', 64)->index();
            $table->timestamp('viewed_at')->index();
        });

        Schema::table('video_views', function (Blueprint $table) {
            $table->index(['video_id', 'viewer_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('video_views');
    }
};
