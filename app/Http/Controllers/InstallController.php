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

    public function smtp(Request $request): RedirectResponse
    {
        if ($request->has('skip')) {
            session(['install.smtp' => ['skipped' => true]]);

            return back()->with('status', 'SMTP skipped — configure it later under Admin → SMTP.');
        }

        $data = $request->validate([
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'between:1,65535'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'encryption' => ['nullable', 'in:tls,ssl,none'],
            'sender_name' => ['nullable', 'string', 'max:255'],
            'sender_email' => ['nullable', 'email', 'max:255'],
        ]);

        session(['install.smtp' => $data]);

        return back()->with('status', 'SMTP settings saved — you can always change them in the admin panel.');
    }

    public function environment(Request $request): RedirectResponse
    {
        session(['install.env_seen' => true]);

        return back()->with('status', 'Storage and queue confirmed.');
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
        $smtp = session('install.smtp');

        if (! $db || ! $app || ! $admin) {
            return redirect()->route('install.index');
        }

        $appUrl = rtrim($app['url'], '/');

        $env = [
            'APP_NAME' => $app['name'],
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'APP_URL' => $appUrl,
            'APP_KEY' => 'base64:'.base64_encode(random_bytes(32)),
            'DB_CONNECTION' => 'mysql',
            'DB_HOST' => $db['host'],
            'DB_PORT' => (string) $db['port'],
            'DB_DATABASE' => $db['database'],
            'DB_USERNAME' => $db['username'],
            'DB_PASSWORD' => $db['password'] ?? '',
            'SESSION_SECURE_COOKIE' => str_starts_with($appUrl, 'https://') ? 'true' : 'false',
            'QUEUE_CONNECTION' => 'database',
            'CACHE_STORE' => 'database',
            'FILESYSTEM_DISK' => 'local',
        ];

        if (is_array($smtp) && empty($smtp['skipped']) && ! empty($smtp['host'])) {
            $env['MAIL_MAILER'] = 'smtp';
            $env['MAIL_HOST'] = $smtp['host'];
            $env['MAIL_PORT'] = (string) ($smtp['port'] ?? 587);
            $env['MAIL_USERNAME'] = $smtp['username'] ?? '';
            $env['MAIL_PASSWORD'] = $smtp['password'] ?? '';
            $env['MAIL_ENCRYPTION'] = ($smtp['encryption'] ?? 'tls') === 'none' ? '' : ($smtp['encryption'] ?? 'tls');
            $env['MAIL_FROM_ADDRESS'] = $smtp['sender_email'] ?: 'no-reply@'.parse_url($appUrl, PHP_URL_HOST);
            $env['MAIL_FROM_NAME'] = $smtp['sender_name'] ?: $app['name'];
        }

        $this->writeEnv($env);

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

        session()->forget(['install.db', 'install.app', 'install.smtp', 'install.env_seen', 'install.admin']);

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
        if ($path === '') {
            return false;
        }

        if (is_executable($path)) {
            return true;
        }

        // A bare command name (e.g. "ffmpeg"): resolve it through PATH.
        if (! str_contains($path, '/')) {
            $output = [];
            exec('command -v '.escapeshellarg($path).' 2>/dev/null', $output, $code);

            return $code === 0 && ! empty($output);
        }

        return false;
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
