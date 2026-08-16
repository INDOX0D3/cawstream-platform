<?php

namespace App\Http\Controllers;

use App\Services\UploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class UploadController extends Controller
{
    public function __construct(private UploadService $uploads) {}

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'filename' => ['required', 'string', 'max:255'],
            'size' => ['required', 'integer', 'min:1'],
        ]);

        $max = (int) config('video.max_upload_size');

        if ($data['size'] > $max) {
            return response()->json(['error' => 'File exceeds the maximum upload size.'], 422);
        }

        try {
            $session = $this->uploads->begin($request->user(), $data['filename'], (int) $data['size']);

            return response()->json(['ok' => true] + $session);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => $e->errors()['file'][0] ?? 'Upload not allowed.'], 422);
        }
    }

    public function append(Request $request): JsonResponse
    {
        $data = $request->validate([
            'upload_id' => ['required', 'string'],
            'offset' => ['required', 'integer', 'min:0'],
            'chunk' => ['required', 'file', 'max:'.(int) config('video.chunk_size', 10 * 1024 * 1024)],
        ]);

        $contents = file_get_contents($request->file('chunk')->getRealPath());

        if ($contents === false) {
            return response()->json(['error' => 'Could not read the chunk.'], 400);
        }

        try {
            $this->uploads->append($data['upload_id'], (int) $data['offset'], $contents);

            return response()->json(['ok' => true]);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function complete(Request $request): JsonResponse
    {
        $data = $request->validate([
            'upload_id' => ['required', 'string'],
            'filename' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        try {
            $video = $this->uploads->finalize(
                $request->user(),
                $data['upload_id'],
                $data['filename'],
                trim($data['title']),
                $data['description'] ?: null,
            );

            return response()->json([
                'ok' => true,
                'public_id' => $video->public_id,
                'watch_url' => $video->watch_url,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => $e->errors()['file'][0] ?? 'Validation failed.'], 422);
        } catch (\RuntimeException $e) {
            Log::warning('Upload finalize failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'The file could not be validated as a video.'], 422);
        }
    }

    public function cancel(Request $request): JsonResponse
    {
        $data = $request->validate(['upload_id' => ['required', 'string']]);

        $this->uploads->cleanup($data['upload_id']);

        return response()->json(['ok' => true]);
    }
}
