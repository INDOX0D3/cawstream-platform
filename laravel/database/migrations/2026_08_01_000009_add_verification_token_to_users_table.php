<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Only the SHA-256 hash is stored — the raw token is emailed once
            // and never persisted, so a leaked database cannot replay links.
            $table->string('verification_token_hash')->nullable()->index()->after('email_verified_at');
            $table->timestamp('verification_token_expires_at')->nullable()->after('verification_token_hash');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['verification_token_hash', 'verification_token_expires_at']);
        });
    }
};
