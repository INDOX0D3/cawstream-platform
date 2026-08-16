<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_registered_user_becomes_admin_and_must_verify_email(): void
    {
        $response = $this->post('/register', [
            'name' => 'First Admin',
            'email' => 'admin@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertRedirect(route('verification.notice'));

        $this->assertDatabaseHas('users', [
            'email' => 'admin@example.com',
            'role' => User::ROLE_ADMIN,
        ]);

        // The dashboard stays locked until the email is verified.
        $this->get(route('dashboard'))->assertRedirect(route('verification.notice'));
    }

    public function test_registration_with_existing_email_is_rejected(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->post('/register', [
            'name' => 'Someone',
            'email' => 'taken@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertDatabaseCount('users', 1);
    }

    public function test_login_redirects_to_dashboard(): void
    {
        $user = User::factory()->create(['password' => 'secret123']);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'secret123',
        ]);

        $response->assertRedirect(route('dashboard'));
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_with_wrong_password_returns_generic_error(): void
    {
        $user = User::factory()->create(['password' => 'secret123']);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_login_with_unregistered_email_is_rejected(): void
    {
        $response = $this->post('/login', [
            'email' => 'nobody@example.com',
            'password' => 'secret123',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_suspended_user_cannot_login(): void
    {
        $user = User::factory()->suspended()->create(['password' => 'secret123']);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'secret123',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_unverified_user_is_blocked_from_dashboard(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('verification.notice'));
    }

    public function test_verification_link_verifies_the_email(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);
        $token = $user->generateVerificationToken();

        $this->get(route('verification.verify', ['token' => $token]))
            ->assertRedirect(route('dashboard'));

        $this->assertNotNull($user->refresh()->email_verified_at);
        $this->assertNull($user->verification_token_hash);
    }

    public function test_expired_verification_token_is_rejected(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);
        $token = $user->generateVerificationToken();

        $user->forceFill(['verification_token_expires_at' => now()->subMinute()])->save();

        $this->get(route('verification.verify', ['token' => $token]))
            ->assertRedirect(route('verification.notice'));

        $this->assertNull($user->refresh()->email_verified_at);
    }

    public function test_resending_invalidates_the_previous_token(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        $first = $user->generateVerificationToken();
        $second = $user->generateVerificationToken();

        $this->assertNotSame($first, $second);

        // The first link is dead once a new one was generated.
        $this->get(route('verification.verify', ['token' => $first]))
            ->assertRedirect(route('verification.notice'));

        $this->get(route('verification.verify', ['token' => $second]))
            ->assertRedirect(route('dashboard'));

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_logout_destroys_session(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/logout')
            ->assertRedirect(route('home'));

        $this->assertGuest();
    }
}
