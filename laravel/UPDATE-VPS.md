# Panduan Update Manual VPS (vidood.fun)

Panduan ini untuk update kode Laravel CawStream di VPS secara manual (tanpa `install.sh`),
cocok untuk server yang sudah berjalan dan tinggal menerima versi terbaru.

> **PENTING**: Kode Laravel ada di subfolder `laravel/` dalam repo `INDOX0D3/cawstream-platform`.
> Pastikan folder yang dijadikan document root nginx berisi `artisan`, `composer.json`, dan `public/`
> (isi folder `laravel/`). Kalau nginx masih menunjuk ke root repo (yang berisi `src/`, `package.json`
> React lama), app tidak akan jalan — lihat bagian "Cek layout" di bawah.

---

## 1. Cek layout dulu (sekali saja)

SSH ke server, lalu pastikan di mana app Laravel berada. Dua kemungkinan umum:

```bash
# Kemungkinan A: app sudah dideploy ke direktori sendiri (mis. /opt/vidood)
ls -la /opt/vidood/artisan

# Kemungkinan B: app masih di dalam clone repo
ls -la ~/cawstream-platform/laravel/artisan
```

- Kalau `artisan` ada di `/opt/vidood/`, maka `APP_DIR=/opt/vidood`.
- Kalau hanya ada di `~/cawstream-platform/laravel/`, pindahkan dulu isi folder `laravel/` ke `/opt/vidood`
  (atau arahkan ulang nginx ke `~/cawstream-platform/laravel/public`).

Setelah itu pastikan nginx memakai path yang benar:

```bash
grep -r "root" /etc/nginx/sites-enabled/ | grep -v "#"
# root harus berakhir dengan .../public (mis. /opt/vidood/public)
```

Sepanjang panduan ini, ganti `APP_DIR` dengan path sebenarnya (contoh: `/opt/vidood`).

---

## 2. Backup dulu (WAJIB sebelum update)

```bash
APP_DIR=/opt/vidood   # sesuaikan!
cd "$APP_DIR"

# 1) Database
mysqldump -u cawstream -p cawstream > ~/backup-cawstream-$(date +%F).sql

# 2) File video & aset
sudo tar czf ~/backup-storage-$(date +%F).tar.gz -C "$APP_DIR" storage/app/videos storage/app/public

# 3) .env (rahasia, jangan sampai ketimpa)
cp .env ~/backup-env-$(date +%F).env

ls -lh ~/backup-* | tail -5
```

Kalau lupa password MySQL, ambil dari `.env`:
```bash
grep DB_PASSWORD .env
```

---

## 3. Ambil kode terbaru

```bash
cd "$APP_DIR"
git fetch origin
git reset --hard origin/main        # sama seperti git pull tapi lebih pasti
git status                          # harus "nothing to commit, working tree clean"
```

Jika ternyata **"Already up to date" tapi kode lama terus** (mis. `laravel/artisan` tidak ada):
artinya versi terbaru belum ter-push ke GitHub. Cek:

```bash
git log --oneline -3
git ls-files | grep -c artisan
```

Kalau `artisan` tidak muncul di daftar file, tunggu sampai kode `laravel/` terbaru di-push
dari sisi pembuat project, lalu ulangi langkah ini.

---

## 4. Instal dependensi PHP

```bash
cd "$APP_DIR"
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
```

---

## 5. Build aset frontend

```bash
cd "$APP_DIR"
npm install --no-audit --no-fund
npm run build
```

Hasilnya muncul di `public/build/`. Kalau folder `public/build` ada, artinya sukses:

```bash
ls public/build | head
```

---

## 6. Jalankan migrasi database

Versi terbaru menambahkan kolom verifikasi email. Jalankan:

```bash
cd "$APP_DIR"
sudo -u www-data php artisan migrate --force
```

Catatan: migrasi ini menambah `verification_token_hash` dan `verification_token_expires_at`
di tabel `users`. Data lama tidak hilang.

---

## 7. Perbaiki permission & storage link

```bash
cd "$APP_DIR"
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
sudo -u www-data php artisan storage:link   # aman diulang
```

---

## 8. Bersihkan & optimalkan cache

```bash
cd "$APP_DIR"
sudo -u www-data php artisan optimize:clear

# Yang aman untuk di-cache di production:
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan view:cache
sudo -u www-data php artisan event:cache

# route:cache bisa GAGAL karena ada route closure (fn) — itu normal, jalankan dengan || true:
sudo -u www-data php artisan route:cache || true
```

---

## 9. Restart worker queue + PHP-FPM

```bash
sudo systemctl restart cawstream-worker
sudo systemctl restart php8.3-fpm

# Pastikan keduanya hidup
systemctl status cawstream-worker --no-pager | head -8
```

Kalau unit `cawstream-worker` tidak ada (server di-install manual), pakai supervisor:

```bash
sudo supervisorctl restart cawstream-worker:* 2>/dev/null || true
# atau cek: supervisorctl status
```

---

## 10. Reload nginx (kalau ada perubahan config)

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 11. Verifikasi hasil update

```bash
# Kesehatan aplikasi
curl -s -o /dev/null -w "%{http_code}\n" https://vidood.fun/up          # harus 200
curl -s -o /dev/null -w "%{http_code}\n" https://vidood.fun/login       # harus 200

# Pengecekan runtime
cd "$APP_DIR" && sudo -u www-data php artisan cawstream:doctor

# Log worker & app kalau ada yang aneh
journalctl -u cawstream-worker -n 30 --no-pager
tail -n 50 storage/logs/laravel.log
```

Lalu di browser (mode incognito / hard refresh `Ctrl+Shift+R`):
1. Buka `https://vidood.fun` — landing page tampil.
2. Login dengan akun admin — masuk dashboard.
3. Upload video kecil — harus bergerak `queued → processing → ready`, lalu bisa play + seek.
4. Buka `https://vidood.fun/admin` — panel admin tampil.
5. Coba halaman embed `/e/VIDEOID` — player jalan dan iklan muncul (sesuai setting akun).

---

## 12. Hal-hal spesifik versi baru (perlu diperhatikan)

- **Email verification kini wajib sebelum dashboard dipakai.** Akun yang `email_verified_at`-nya masih
  kosong akan diarahkan ke halaman verifikasi saat login. Jika SMTP belum dikonfigurasi, halaman itu
  menampilkan link verifikasi sekali pakai langsung di layar (tidak terkunci). Setelah SMTP di-setting
  di Admin → SMTP, email verifikasi/reset terkirim normal dengan template baru.
- **Installer web** `/install` sekarang punya langkah SMTP + Environment. Kalau server sudah ter-install,
  `storage/installed` sudah ada sehingga `/install` terkunci — tidak perlu diutak-atik.
- **`SESSION_SECURE_COOKIE`**: pastikan `.env` memakai `true` karena vidood.fun memakai HTTPS.
  Jika suatu saat akses lewat HTTP/IP, ubah ke `false` lalu `php artisan config:cache`.

---

## Update cepat (satu perintah)

Semua langkah di atas sudah dirangkum dalam `update.sh` (jalankan dari dalam `APP_DIR`):

```bash
cd "$APP_DIR"
bash update.sh
```

Catatan: `update.sh` memakai `git reset --hard origin/main` — pastikan tidak ada perubahan lokal
yang belum di-commit sebelum menjalankannya, dan selalu backup dulu (langkah 2).
