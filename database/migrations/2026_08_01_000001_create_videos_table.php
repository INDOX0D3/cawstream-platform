<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('public_id', 16)->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('original_filename');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size');
            $table->string('status')->default('queued'); // uploading | queued | processing | ready | failed
            $table->unsignedTinyInteger('processing_progress')->default(0);
            $table->float('duration', 10, 3)->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('codec')->nullable();
            $table->unsignedBigInteger('bitrate')->nullable();
            $table->float('fps', 8, 3)->nullable();
            $table->string('source_path')->nullable();
            $table->string('video_path')->nullable();
            $table->string('thumbnail_path')->nullable();
            $table->string('hls_path')->nullable();
            $table->string('playback_type')->nullable(); // direct | hls
            $table->unsignedBigInteger('views')->default(0);
            $table->unsignedBigInteger('unique_viewers')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('processing_started_at')->nullable();
            $table->timestamp('processing_completed_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('videos');
    }
};
