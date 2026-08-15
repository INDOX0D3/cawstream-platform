# Deploy Vidood Stream di VPS (tanpa Convex — backend sendiri)

Aplikasi ini **sepenuhnya self-hosted** — tidak ada Convex, tidak ada backend pihak
ketiga. Semuanya jalan di VPS kamu:

| Bagian | Teknologi | Di-host di mana |
|---|---|---|
| **Frontend** | React/Vite (statis, hasil build ke `dist/`) | VPS (dilayani server Bun) |
| **Backend (API)** | Hono (Bun) — auth, OTP, video, ads, statistik, admin | VPS |
| **Database** | SQLite (`cawstream.db`) | VPS |
| **Penyimpanan video/thumbnail/logo** | File di disk VPS (`storage/`) | VPS |
| **Email OTP** | SMTP milikmu (Admin → SMTP) + fallback log | VPS |

Satu proses saja yang jalan: `bun run server/index.ts` (default port **8787**).
Proses ini sekaligus menyajikan frontend statis, API JSON, dan video (dengan
dukungan HTTP Range untuk seek). nginx di depannya hanya reverse-proxy + HTTPS.

---

## 1. Prasyarat

- **VPS** Ubuntu/Debian (min. 1 GB RAM, 20 GB disk; tambah disk sesuai kebutuhan
  video — semua file video tersimpan di disk VPS).
- **Bun** runtime (script instal di bawah).
- **Domain** (disarankan, untuk HTTPS & preview link).

---

## 2. Install & setup sekali jalan

```bash
sudo bash deploy/vps-install.sh
```

Atau manual:

```bash
# 1. Bun
curl -fsSL https://bun.sh/install | bash   # lalu: export PATH="$HOME/.bun/bin:$PATH"

# 2. Dependencies + build
cd /opt/vidood          # folder hasil clone/upload project
bun install
bun run build           # hasil: dist/

# 3. Jalankan server (uji dulu)
PORT=8787 bun run server/index.ts
```

---

## 3. Systemd (biar server hidup terus)

Buat `/etc/systemd/system/vidood.service`:

```ini
[Unit]
Description=Vidood Stream server
After=network.target

[Service]
WorkingDirectory=/opt/vidood
ExecStart=/root/.bun/bin/bun run server/index.ts
Restart=always
RestartSec=3
# EnvironmentFile=/opt/vidood/.env   # kalau pakai env file

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vidood
sudo systemctl status vidood
```

Log: `journalctl -u vidood -f` — di sinilah kode OTP muncul selama SMTP
belum dikonfigurasi (mode fallback "console-log").

---

## 4. nginx (reverse proxy + HTTPS)

```bash
sudo cp deploy/nginx-site.conf /etc/nginx/sites-available/vidood
# ganti "example.com" dengan domain kamu
sudo ln -s /etc/nginx/sites-available/vidood /etc/nginx/sites-enabled/vidood
sudo nginx -t && sudo systemctl reload nginx

# HTTPS
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domainkamu.com --redirect
```

nginx memproksi **semua** ke `127.0.0.1:8787` (statis + API + media + upload),
dengan `client_max_body_size 0` supaya upload video besar tidak ditolak.

---

## 5. Konfigurasi di dalam aplikasi (setelah live)

1. **Daftar akun pertama** → otomatis jadi **admin**.
2. **Admin → SMTP** → isi host/port/username/password/encryption + sender, klik
   **Send test email** sampai hijau, lalu aktifkan. Selama belum aktif, kode OTP
   ditulis ke log server (`journalctl -u vidood -f`) supaya signup tetap bisa
   diuji.
3. **Admin → Branding** → nama situs, logo, favicon, meta.
4. **Admin → Player** → warna aksen, watermark platform, dll.
5. **Admin → Users** → aktifkan plan Premium/Platinum setelah pembayaran
   via Telegram (t.me/cawsociety).

---

## 6. Update aplikasi

```bash
cd /opt/vidood
git pull origin main        # atau upload ulang source terbaru
bun install
bun run build
sudo systemctl restart vidood
```

---

## 7. Backup

- **Database**: `cawstream.db` (di folder kerja server, atau `DATA_DIR` kalau
  diset) — backup berkala, atau pasang job SQLite `.backup`.
- **Video & file**: seluruh folder `storage/` (atau `STORAGE_DIR` kalau diset) —
  ini **semua video user**, backup wajib.
- Keduanya bisa di-rsync ke disk lain / S3 / rclone.

---

## 8. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Website blank / 502 | Server belum jalan: `systemctl status vidood`, cek `journalctl -u vidood -f`. Pastikan build `dist/` ada. |
| Video tidak bisa diputar / seek | Pastikan nginx mem-proxy `/media` dengan header `Range` (sudah ada di `deploy/nginx-site.conf`) dan `proxy_buffering off`. |
| Upload video besar gagal | `client_max_body_size` nginx harus `0` (sudah di config) — cek `nginx -t` dan reload. |
| Signup tidak terkirim OTP | Konfigurasi **Admin → SMTP** + test email sampai hijau. Sebelum itu kode OTP muncul di `journalctl -u vidood -f`. |
| Link preview medsos tidak muncul | Pastikan HTTPS valid; og:image memakai thumbnail video yang tersimpan di `/media`. |
| Sesi tidak bertahan | Kalau HTTPS sudah aktif, set `COOKIE_SECURE=1` di env server, lalu restart. |

---

## Arsitektur ringkas

```
Browser ──► nginx (VPS, 80/443, HTTPS) ──► 127.0.0.1:8787 (Bun server)
                                             ├── dist/        (frontend statis)
                                             ├── /api/q /api/m (JSON API)
                                             ├── /api/upload  (multipart)
                                             ├── /media/*     (video/thumb, HTTP Range)
                                             └── cawstream.db + storage/ (SQLite + file)
```

Tidak ada dependensi eksternal: SQLite via `bun:sqlite`, storage di disk lokal,
email via nodemailer (SMTP sendiri). Cukup `bun run server/index.ts` + nginx.
