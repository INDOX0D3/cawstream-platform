<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;
use Illuminate\View\View;

class InstallController extends Controller
{
    public function index(): View
    {
        return view('install.index', [
            'requirements' => $this->requirements(),
            'step' => 'requirements',
        ]);
    }

    public function database(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'host' => ['required', 'string', 'max:255'],
            'port' => ['required', 'integer', 'between:1,65535'],
            'database' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $dsn = "mysql:host={$data['host']};port={$data['port']};dbname={$data['database']}";
            new \PDO($dsn, $data['username'], $data['password'] ?? '', [\PDO::ATTR_TIMEOUT => 6, \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]);

            session(['install.db' => $data]);

            return back()->with('status', 'Database connection successful.');
        } catch (\PDOException $e) {
            return back()->withErrors(['error' => 'Connection failed: '.$e->getMessage()]);
        }
    }

    public function application(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'url' => ['required', 'url', 'max:255'],
        ]);

        session(['install.app' => $data]);

        return back()->with('status', 'Application details saved.');
    }

    public function admin(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        session(['install.admin' => $data]);

        return back()->with('status', 'Administrator details saved.');
    }

    public function run(Request $request): RedirectResponse
    {
        $db = session('install.db');
        $app = session('install.app');
        $admin = session('install.admin');

        if (! $db || ! $app || ! $admin) {
            return redirect()->route('install.index');
        }

        $this->writeEnv([
            'APP_NAME' => $app['name'],
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'APP_URL' => rtrim($app['url'], '/'),
            'APP_KEY' => 'base64:'.base64_encode(random_bytes(32)),
            'DB_CONNECTION' => 'mysql',
            'DB_HOST' => $db['host'],
            'DB_PORT' => (string) $db['port'],
            'DB_DATABASE' => $db['database'],
            'DB_USERNAME' => $db['username'],
            'DB_PASSWORD' => $db['password'] ?? '',
        ]);

        $this->reloadEnvironment();

        try {
            Artisan::call('migrate', ['--force' => true]);
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => 'Migration failed: '.$e->getMessage()]);
        }

        User::query()->create([
            'name' => $admin['name'],
            'email' => $admin['email'],
            'password' => $admin['password'],
            'username' => strtolower(Str::slug($admin['name'])).random_int(100, 999),
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
            'email_verified_at' => now(),
        ]);

        Artisan::call('storage:link');

        touch(storage_path('installed'));

        session()->forget(['install.db', 'install.app', 'install.admin']);

        return redirect()->route('install.complete');
    }

    public function complete(): View
    {
        return view('install.complete');
    }

    /* ------------------------------------------------------------------ */

    private function requirements(): array
    {
        $extensions = ['pdo', 'pdo_mysql', 'mbstring', 'openssl', 'xml', 'ctype', 'json', 'fileinfo', 'gd', 'bcmath', 'curl', 'zip', 'intl'];

        $checks = [
            ['PHP >= 8.3', PHP_VERSION_ID >= 80300, PHP_VERSION],
            ['FFmpeg', $this->binaryExists(config('video.ffmpeg_path')), config('video.ffmpeg_path')],
            ['FFprobe', $this->binaryExists(config('video.ffprobe_path')), config('video.ffprobe_path')],
            ['Storage writable', is_writable(storage_path()), storage_path()],
            ['Bootstrap writable', is_writable(base_path('bootstrap/cache')), base_path('bootstrap/cache')],
        ];

        foreach ($extensions as $ext) {
            $checks[] = [
                'PHP extension: '.$ext,
                extension_loaded($ext),
                $ext,
            ];
        }

        return $checks;
    }

    private function binaryExists(string $path): bool
    {
        return $path !== '' && (is_executable($path) || str_contains($path, '/'));
    }

    private function writeEnv(array $values): void
    {
        $template = file_exists(base_path('.env')) ? base_path('.env') : base_path('env.example');
        $lines = file($template, FILE_IGNORE_NEW_LINES) ?: [];
        $keys = array_keys($values);

        foreach ($lines as $i => $line) {
            foreach ($keys as $key) {
                if (preg_match('/^'.$key.'=/', $line)) {
                    $lines[$i] = $key.'='.$values[$key];
                    unset($values[$key]);

                    break;
                }
            }
        }

        foreach ($values as $key => $value) {
            $lines[] = $key.'='.$value;
        }

        file_put_contents(base_path('.env'), implode("\n", $lines)."\n");
    }

    private function reloadEnvironment(): void
    {
        (new \Illuminate\Foundation\Bootstrap\LoadEnvironmentVariables)->bootstrap(app());
        (new \Illuminate\Foundation\Bootstrap\LoadConfiguration)->bootstrap(app());
    }
}
