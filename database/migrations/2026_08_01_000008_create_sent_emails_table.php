<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sent_emails', function (Blueprint $table) {
            $table->id();
            $table->string('to_addr');
            $table->string('subject');
            $table->string('kind')->default('mail'); // verify | reset | smtp_test | welcome
            $table->string('status')->default('sent'); // sent | failed | logged
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['kind', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sent_emails');
    }
};
