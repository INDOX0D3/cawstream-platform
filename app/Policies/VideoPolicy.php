<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Video;

class VideoPolicy
{
    public function viewAny(User $user): bool
    {
        return ! $user->isSuspended();
    }

    public function create(User $user): bool
    {
        return ! $user->isSuspended();
    }

    public function view(User $user, Video $video): bool
    {
        return $user->isAdmin() || $video->user_id === $user->id;
    }

    public function update(User $user, Video $video): bool
    {
        return $user->isAdmin() || $video->user_id === $user->id;
    }

    public function delete(User $user, Video $video): bool
    {
        return $user->isAdmin() || $video->user_id === $user->id;
    }

    public function reprocess(User $user, Video $video): bool
    {
        return $user->isAdmin() || $video->user_id === $user->id;
    }
}
