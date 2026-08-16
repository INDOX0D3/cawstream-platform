<?php

namespace App\Livewire;

use App\Models\User;
use Illuminate\View\View;
use Livewire\Attributes\Url;
use Livewire\Component;
use Livewire\WithPagination;

class AdminUsersTable extends Component
{
    use WithPagination;

    #[Url]
    public string $search = '';

    #[Url]
    public string $role = '';

    #[Url]
    public string $plan = '';

    public function updatedSearch(): void
    {
        $this->resetPage();
    }

    public function updatedRole(): void
    {
        $this->resetPage();
    }

    public function updatedPlan(): void
    {
        $this->resetPage();
    }

    public function render(): View
    {
        $users = User::query()
            ->withCount('videos')
            ->withSum('videos as storage_bytes', 'file_size')
            ->when($this->search !== '', function ($q) {
                $term = '%'.$this->search.'%';
                $q->where(fn ($w) => $w->where('name', 'like', $term)->orWhere('email', 'like', $term)->orWhere('username', 'like', $term));
            })
            ->when($this->role !== '', fn ($q) => $q->where('role', $this->role))
            ->when($this->plan !== '', fn ($q) => $q->where('plan', $this->plan))
            ->latest()
            ->paginate(15);

        return view('livewire.admin-users-table', [
            'users' => $users,
        ])->layout('components.layouts.app', ['title' => t('nav.users')]);
    }
}
