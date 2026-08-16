<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_watermarks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('enabled')->default(true);
            $table->string('text')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('position')->default('top-right');
            $table->float('size', 4, 1)->default(14);
            $table->float('opacity', 3, 2)->default(0.65);
            $table->float('margin', 5, 1)->default(12);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_watermarks');
    }
};
