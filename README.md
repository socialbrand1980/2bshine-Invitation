# 2bShine Invitation Pro (RSVP → Google Sheet + QR + Panitia Check-in)

## Apa yang ada di repo
- `index.html` — Halaman undangan publik + RSVP + QR ticket
- `vip.html` — Halaman undangan khusus **VIP** (tema Gold/Black, copy & style disesuaikan)
- `checkin.html` — Halaman panitia: scan QR (kamera) + manual check-in
- CSS: `css/style.css` (base), `css/vip.css` (VIP overrides)
- JS: `js/main.js` (core), `js/checkin.js` (scanner), `js/config.js`, `js/config-vip.js` (event config)
- `assets/audio/` — tempat letak file audio untuk background music (contoh: `bgm.mp3`)
- `apps-script/Code.gs` — Google Apps Script untuk integrasi Google Sheet

---

## Langkah cepat: Setup Google Sheet + API
1. Buat Google Sheet baru
2. Buat tab bernama **RSVP**
3. Isi header (baris 1): `ticket_id`, `nama`, `whatsapp`, `jumlah_tamu`, `catatan`, `created_at`, `status_hadir`, `checkin_at`

4. Buka **Extensions → Apps Script** → paste `apps-script/Code.gs` → Deploy as **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (atau Anyone with the link)
   - Copy URL Web App

5. Isi URL tersebut di `js/config.js` (publik) dan/atau `js/config-vip.js` (VIP page) pada `window.API_URL`

---

## Menjalankan & testing lokal
- Untuk development cepat, pakai **VS Code Live Server** (buka `index.html` / `vip.html`).
- Catatan: `checkin.html` membutuhkan **HTTPS** agar kamera bisa diakses di mobile/Chrome (hosting pada Netlify/Vercel/GitHub Pages atau serve via localhost over https).

---

## VIP page (catatan khusus)
- `vip.html` memuat `css/vip.css` untuk tampilan Gold/Black.
- Konfigurasi event VIP berada di `js/config-vip.js` → ubah `EVENT` (title, startISO, endISO, venue, address, mapsQuery) dan `API_URL` bila perlu.

---

## Background music (autoplay & fallback)
- Tambahkan file audio di `assets/audio/bgm.mp3` (rekomendasi 30–120 detik, mp3).
- `vip.html` sudah menautkan `<audio id="bgm" loop autoplay>`; `js/main.js` mencoba autoplay otomatis dan:
  - Jika browser mengizinkan: play muted → lalu coba unmute dan ramp volume secara perlahan.
  - Jika diblokir: tampilan hint kecil (`Tap anywhere untuk mengaktifkan suara`) dan listener `pointerdown` akan mencoba mengaktifkan audio saat pengguna menyentuh layar.
  - Tombol **Play Music** tetap tersedia sebagai fallback manual.

> Catatan: beberapa browser membatasi autoplay demi UX; tidak ada cara 100% memaksa autoplay tanpa interaksi pengguna.

---

## Smooth scroll
- `css/style.css` menggunakan `html { scroll-behavior: smooth; }` dan `js/main.js` memiliki fallback untuk anchor links agar tetap smooth pada browser yang tidak support.

---

## RSVP flow singkat
1. Pengunjung isi form RSVP (`name`, `whatsapp`, `guests`, `note`) di `index.html` atau `vip.html`.
2. `js/main.js` memanggil API (JSONP) ke `API_URL?action=rsvp` → Apps Script menyimpan data & mengembalikan `ticket_id`.
3. QR generator (`qrcodejs`) membuat QR ticket di halaman, tamu menyimpan QR untuk check-in.
4. Panitia scan di `checkin.html` → Apps Script menandai `status_hadir` pada Google Sheet.

---

## Troubleshooting cepat
- API_URL error: Pastikan `js/config.js` / `js/config-vip.js` sudah diisi dan Apps Script telah dideploy.
- Scanner tidak bisa akses kamera: butuh HTTPS; tes di desktop dengan webcam atau deploy ke hosting.
- Autoplay tidak jalan: tambahkan `assets/audio/bgm.mp3`, reload, lalu tap layar jika perlu.
- QR generator gagal: pastikan CDN `qrcodejs` ada di HTML (sudah disertakan di semua halaman).

---

## Tips pengembangan
- Ubah style spesifik VIP di `css/vip.css` (override variabel/warna dari `style.css`).
- Untuk preview audio lokal, tambahkan `assets/audio/bgm.mp3` dan buka `vip.html` di browser.

---

If you want I can also add a small automated test or a Dockerfile for local https dev. Ask me and I’ll scaffold it. ✨
