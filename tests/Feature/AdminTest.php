<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_admin_panel(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/admin')
            ->assertNotFound();
    }

    public function test_admin_can_access_admin_panel(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get('/admin')
            ->assertOk()
            ->assertSee('Users');
    }

    public function test_admin_can_change_user_plan(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create(['plan' => User::PLAN_FREE]);

        $this->actingAs($admin)
            ->patch(route('admin.users.update', $user), [
                'role' => User::ROLE_USER,
                'status' => User::STATUS_ACTIVE,
                'plan' => User::PLAN_PREMIUM,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'plan' => User::PLAN_PREMIUM,
        ]);
    }

    public function test_guest_is_redirected_from_admin_panel(): void
    {
        $this->get('/admin')->assertRedirect(route('login'));
    }
}
