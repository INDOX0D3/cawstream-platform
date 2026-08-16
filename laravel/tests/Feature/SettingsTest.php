<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_save_ad_settings(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('dashboard.ads.update'), [
                'smartlink_enabled' => 1,
                'smartlink_url' => 'https://ads.example.com',
                'social_bar_enabled' => 0,
                'popunder_enabled' => 1,
                'popunder_code' => '<script src="https://pop.example.com/x.js"></script>',
                'frequency' => 'session',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('user_ad_settings', [
            'user_id' => $user->id,
            'smartlink_url' => 'https://ads.example.com',
            'frequency' => 'session',
        ]);
    }

    public function test_user_can_save_player_preferences(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('dashboard.player.update'), [
                'autoplay' => 1,
                'default_volume' => 0.8,
                'default_speed' => 1.25,
                'show_watermark' => 1,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('user_player_settings', [
            'user_id' => $user->id,
            'autoplay' => true,
            'default_speed' => 1.25,
        ]);
    }

    public function test_free_user_cannot_edit_watermark(): void
    {
        $user = User::factory()->create(['plan' => User::PLAN_FREE]);

        $this->actingAs($user)
            ->put(route('dashboard.watermark.update'), [
                'enabled' => 1,
                'text' => 'MyBrand',
                'position' => 'top-right',
                'size' => 14,
                'opacity' => 0.7,
                'margin' => 12,
            ])
            ->assertForbidden();
    }

    public function test_premium_user_can_edit_watermark(): void
    {
        $user = User::factory()->premium()->create();

        $this->actingAs($user)
            ->put(route('dashboard.watermark.update'), [
                'enabled' => 1,
                'text' => 'MyBrand',
                'position' => 'top-right',
                'size' => 14,
                'opacity' => 0.7,
                'margin' => 12,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('user_watermarks', [
            'user_id' => $user->id,
            'text' => 'MyBrand',
        ]);
    }
}
