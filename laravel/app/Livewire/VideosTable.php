<?php

namespace App\Livewire;

use App\Models\Video;
use Illuminate\View\View;
use Livewire\Attributes\Url;
use Livewire\Component;
use Livewire\WithPagination;

class VideosTable extends Component
{
    use WithPagination;

    #[Url]
    public string $search = '';

    #[Url]
    public string $status = '';

    public function updatedSearch(): void
    {
        $this->resetPage();
    }

    public function updatedStatus(): void
    {
        $this->resetPage();
    }

    public function render(): View
    {
        $videos = Video::query()
            ->where('user_id', auth()->id())
            ->when($this->search !== '', fn ($q) => $q->where('title', 'like', '%'.$this->search.'%'))
            ->when($this->status !== '', fn ($q) => $q->where('status', $this->status))
            ->latest()
            ->paginate(12);

        return view('livewire.videos-table', [
            'videos' => $videos,
        ])->layout('components.layouts.app', ['title' => t('nav.videos')]);
    }
}
