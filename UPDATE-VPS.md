# Panduan Update Manual VPS (vidood.fun)

Panduan ini untuk update kode CawStream di VPS secara manual (tanpa `install.sh`),
cocok untuk server yang sudah berjalan dan tinggal menerima versi terbaru.

> **Struktur repo (mulai versi ini):** repo **sudah menjadi project Laravel langsung di root** —
> ada `artisan`, `composer.json`, `public/`, `app/`, dll di root repo. **Tidak ada lagi subfolder
> `laravel/`** seperti versi sebelumnya. Setelah `git pull`, Anda tidak perlu `cd` ke folder mana pun.

---

## 1. Di mana app Anda sekarang?

SSH ke server, lalu cek lokasi artisan:

```bash
# Struktur baru (setelah pull versi terbaru): artisan di root repo
ls -la ~/cawstream-platform/artisan

# Struktur lama (sebelum update): artisan ada di subfolder laravel/
ls -la ~/cawstream-platform/laravel/artisan
```

**Kalau server Anda masih struktur lama** (punya folder `laravel/`), ikuti **Langkah 2a — migrasi
struktur** sekali saja. **Kalau sudah struktur baru**, langsung ke **Langkah 3**.

---

## 2a. Migrasi dari struktur lama (sekali saja)

Lakukan backup dulu (langkah 2b), lalu:

```bash
cd ~/cawstream-platform
git fetch origin
git reset --hard origin/main      # git menghapus file laravel/ yang ter-track

# Pindahkan data yang TIDAK ter-track (tidak ikut git) dari folder lama ke root baru:
mv laravel/.env .env 2>/dev/null || true
mkdir -p storage/app storage/logs
mv laravel/storage/app/videos storage/app/videos 2>/dev/null || true
mv laravel/storage/app/public storage/app/public 2>/dev/null || true
mv laravel/storage/logs/* storage/logs/ 2>/dev/null || true

# Folder lama tinggal sisa — hapus:
rm -rf laravel

# Dependensi di root baru:
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
npm install --no-audit --no-fund
npm run build
php artisan migrate --force
php artisan storage:link
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
sudo touch storage/installed

# Nginx: root harus menunjuk ke .../public di lokasi baru
# contoh: /home/ubuntu/cawstream-platform/public  (sebelumnya .../laravel/public)
sudo nginx -t && sudo systemctl reload nginx
```

> Kalau sebelumnya app sudah dipindah keluar dari repo (mis. `/var/www/vidood`), cukup salin isi
> repo root ke sana (`rsync -a --delete ~/cawstream-platform/ /var/www/vidood/`) lalu ulangi
> composer/npm/migrate/permission di `/var/www/vidood`, dan pastikan nginx menunjuk ke
> `/var/www/vidood/public`.

---

## 2b. Backup dulu (WAJIB sebelum update)

```bash
APP_DIR=~/cawstream-platform   # sesuaikan dengan lokasi artisan

# 1) Database
mysqldump -u cawstream -p cawstream > ~/backup-cawstream-$(date +%F).sql

# 2) File video & aset
sudo tar czf ~/backup-storage-$(date +%F).tar.gz -C "$APP_DIR" storage/app/videos storage/app/public

# 3) .env (rahasia, jangan sampai ketimpa)
cp "$APP_DIR/.env" ~/backup-env-$(date +%F).env

ls -lh ~/backup-* | tail -5
```

Kalau lupa password MySQL, ambil dari `.env`:
```bash
grep DB_PASSWORD .env
```

---

## 3. Ambil kode terbaru

```bash
cd ~/cawstream-platform
git fetch origin
git reset --hard origin/main        # sama seperti git pull tapi lebih pasti
git status                          # harus "nothing to commit, working tree clean"
```

Jika ternyata **"Already up to date" tapi kode lama terus** (mis. `artisan` tidak ada di root):
artinya versi terbaru belum ter-push ke GitHub. Cek:

```bash
git log --oneline -3
git ls-files | grep -c artisan
```

Kalau `artisan` tidak muncul di daftar file, tunggu sampai versi terbaru di-push, lalu ulangi.

---

## 4. Instal dependensi PHP

```bash
cd ~/cawstream-platform
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
```

---

## 5. Build aset frontend

```bash
cd ~/cawstream-platform
npm install --no-audit --no-fund
npm run build
```

Cek hasilnya:

```bash
ls public/build | head
```

---

## 6. Jalankan migrasi database

```bash
cd ~/cawstream-platform
sudo -u www-data php artisan migrate --force
```

---

## 7. Perbaiki permission & storage link

```bash
cd ~/cawstream-platform
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
sudo -u www-data php artisan storage:link   # aman diulang
```

---

## 8. Bersihkan & optimalkan cache

```bash
cd ~/cawstream-platform
sudo -u www-data php artisan optimize:clear
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan view:cache
sudo -u www-data php artisan event:cache
sudo -u www-data php artisan route:cache || true   # boleh gagal (ada route closure), normal
```

---

## 9. Restart worker queue + PHP-FPM

```bash
sudo systemctl restart cawstream-worker
sudo systemctl restart php8.3-fpm
systemctl status cawstream-worker --no-pager | head -8
```

Kalau unit `cawstream-worker` tidak ada (instal manual), pakai supervisor:

```bash
sudo supervisorctl restart cawstream-worker:* 2>/dev/null || true
```

---

## 10. Reload nginx (kalau ada perubahan config)

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 11. Verifikasi hasil update

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://vidood.fun/up          # harus 200
curl -s -o /dev/null -w "%{http_code}\n" https://vidood.fun/login       # harus 200

cd ~/cawstream-platform && sudo -u www-data php artisan cawstream:doctor
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
  menampilkan link verifikasi sekali pakai langsung di layar (tidak terkunci).
- **Installer web** `/install` sekarang punya langkah SMTP + Environment. Kalau server sudah ter-install,
  `storage/installed` sudah ada sehingga `/install` terkunci.
- **`SESSION_SECURE_COOKIE`**: pastikan `.env` memakai `true` karena vidood.fun memakai HTTPS.
- **Repo root sekarang = project Laravel.** Nginx document root harus `.../public` di root repo,
  bukan lagi `.../laravel/public`.

---

## Update cepat (satu perintah)

Semua langkah di atas sudah dirangkum dalam `update.sh` (jalankan dari root repo):

```bash
cd ~/cawstream-platform
bash update.sh
```

Catatan: `update.sh` memakai `git reset --hard origin/main` — pastikan tidak ada perubahan lokal
yang belum di-commit, dan selalu backup dulu (langkah 2b).
