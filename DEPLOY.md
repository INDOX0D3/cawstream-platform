# Deploy CawStream di VPS (tetap pakai Convex)

Aplikasi ini terdiri dari **2 bagian**:

| Bagian | Apa itu | Di-host di mana |
|---|---|---|
| **Frontend** | React/Vite (statis) — landing, dashboard, player, admin | **VPS kamu** (nginx/Docker) |
| **Backend + database + penyimpanan file** | Convex (fungsi, DB, auth, storage video) | **Convex Cloud** (managed) |

Jadi di VPS kamu **tidak perlu database/backend sendiri** — VPS cukup menyajikan file statis hasil build, sementara semua logika (akun, upload, statistik, iklan, watermark) tetap jalan di Convex. Ini jalur paling cepat & aman; semua fitur tetap berfungsi seperti di Freebuff.

---

## 0. Prasyarat

- **VPS** Ubuntu/Debian (min. 1 GB RAM, 20 GB disk) dengan akses root/SSH.
- **Domain** (opsional tapi disarankan, untuk HTTPS & preview link).
- **Akun Convex** gratis di <https://dashboard.convex.dev> (free tier cukup untuk memulai; pakai Production plan kalau mau production).

---

## 1. Buat project Convex & ambil URL deployment

1. Login ke <https://dashboard.convex.dev>.
2. **Create project** → pilih nama (mis. `cawstream`), region bebas.
3. Buka project → **Deployments**. Di sana ada **Deployment URL**, bentuknya:
   `https://nama-hewan-123.convex.cloud`
4. Catat **deployment name**-nya (bagian `nama-hewan-123`).

> Deployment URL ini yang akan diisi ke `VITE_CONVEX_URL` saat build frontend.

---

## 2. Siapkan env & konfigurasi Convex

Di folder proyek:

```bash
cp deploy/env.example .env
nano .env
```

Isi minimal:

```bash
VITE_CONVEX_URL=https://nama-hewan-123.convex.cloud
CONVEX_DEPLOYMENT=nama-hewan-123
```

Juga buat `convex.json` (template: `convex.json.example`) **atau** cukup pakai `CONVEX_DEPLOYMENT` di `.env` — salah satu sudah cukup untuk `bunx convex deploy`.

**Server-side env (lewat dashboard Convex, bukan file .env):**
Buka project Convex → **Settings → Environment variables**, tambahkan:

| Nama | Nilai | Fungsi |
|---|---|---|
| `CONVEX_SITE_URL` | `https://nama-hewan-123.convex.cloud` | Alamat backend yang dipakai route HTTP (OTP email) |
| `FREEBUFF_RELAY_URL` / `FREEBUFF_RELAY_KEY` | (opsional) | Relay email cadangan kalau SMTP belum dikonfigurasi |

---

## 3. Deploy backend (fungsi Convex)

Dari folder proyek (di VPS atau di laptop kamu):

```bash
bun install
bunx convex deploy
```

Ini mengunggah semua fungsi di `src/convex/` (auth, upload, video, ads, setting, email, watermark, dll) ke deployment Convex-mu.

> Setiap kali ada perubahan di `src/convex/`, jalankan ulang `bunx convex deploy`.

---

## 4. Build frontend

```bash
bun run build
```

Hasil build ada di folder `dist/` — **statis murni**, siap disajikan. Build ini sudah "menanam" `VITE_CONVEX_URL` ke dalam bundle, jadi pastikan `.env` sudah benar sebelum build.

---

## 5. Jalankan di VPS

### Opsi A — Docker (paling gampang, disarankan)

```bash
# di folder proyek, pastikan .env sudah berisi VITE_CONVEX_URL
docker compose up -d --build
```

Aplikasi langsung live di port 80. Untuk produksi, pasang reverse proxy nginx + HTTPS (lihat Opsi B untuk file nginx).

### Opsi B — nginx bare-metal (tanpa Docker)

```bash
sudo cp -r dist /var/www/cawstream
sudo cp deploy/nginx-site.conf /etc/nginx/sites-available/cawstream
# ganti "example.com" dengan domain kamu di deploy/nginx-site.conf
sudo ln -s /etc/nginx/sites-available/cawstream /etc/nginx/sites-enabled/cawstream
sudo nginx -t && sudo systemctl reload nginx
```

**HTTPS (certbot):**

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domainkamu.com --redirect
```

### Opsi C — script sekali jalan

```bash
sudo bash deploy/vps-install.sh
```

Script menginstal Bun + nginx (+ Docker opsional), deploy Convex, build, dan memasang semuanya.

---

## 6. Konfigurasi di dalam aplikasi (setelah live)

1. **Daftar akun pertama** → otomatis jadi **admin** (sama seperti di Freebuff).
2. Buka **Admin → Branding** → atur nama situs, logo, favicon, meta.
3. Buka **Admin → SMTP** → isi host/port/username/password/encryption + sender, klik **Send test email** sampai hijau, lalu aktifkan.
   > **Penting:** di deployment mandiri, email OTP (signup/login/reset) dikirim lewat SMTP yang kamu konfigurasi. Tanpa SMTP, fallback ke relay Freebuff mungkin tidak tersedia di luar platform — jadi konfigurasi SMTP adalah langkah wajib agar user bisa daftar.
4. **Admin → Player** → warna aksen, aspek rasio, watermark platform.
5. **Admin → Users** → aktifkan plan Premium/Platinum setelah pembayaran via Telegram (t.me/cawsociety).

---

## 7. Update aplikasi

```bash
# pull perubahan kode
git pull

# kalau ada perubahan Convex:
bunx convex deploy

# build ulang frontend:
bun run build

# serve ulang (sesuai pilihan):
docker compose up -d --build        # Docker
# atau
sudo cp -r dist/* /var/www/cawstream/   # nginx bare-metal
```

---

## 8. Backup

- **Data + fungsi**: Convex dashboard → project → **Settings → Data/Export** (export JSON) — lakukan berkala.
- **Video & file upload**: tersimpan di Convex file storage (terkait deployment). Untuk backup penuh, gunakan ekspor Convex atau tambahkan job sinkronisasi ke S3/R2.
- Tidak ada data yang tersimpan di VPS (frontend statis), jadi backup VPS tidak terlalu krusial.

---

## 9. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Preview/website blank atau "Did you forget to run convex dev?" | `VITE_CONVEX_URL` salah/tidak diisi saat build. Build ulang dengan URL deployment yang benar. |
| `bunx convex deploy` gagal | Cek `CONVEX_DEPLOYMENT` / `convex.json`, pastikan login Convex (`bunx convex login`). |
| Signup tidak terkirim OTP | SMTP belum dikonfigurasi — atur **Admin → SMTP** sampai banner hijau *Active and verified*. |
| Link preview di medsos tidak muncul | Pastikan domain HTTPS valid; og:image memakai thumbnail video dari Convex. |
| Upload besar gagal | Limit upload diatur di **Admin → System → Max upload size**; storage Convex punya batas file — naikkan plan Convex jika perlu. |
| Tombol langganan membuka WhatsApp | Sudah diganti — pastikan build terbaru (semua link pakai **Telegram** t.me/cawsociety). |

---

## Arsitektur ringkas

```
Browser ──► nginx (VPS, port 80/443) ──► dist/ (statis)
   │
   ├──► https://<deployment>.convex.cloud  (queries, mutations, auth, upload URL)
   └──► https://<deployment>.convex.cloud/api/*  (HTTP routes: OTP, thumbnail, video)
```

Frontend memanggil Convex langsung (HTTPS) — VPS tidak perlu memproksi apa pun, cukup menyajikan file statis.
