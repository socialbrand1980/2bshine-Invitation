# 2bShine Invitation Pro (RSVP -> Google Sheet + QR + Panitia Check-in)

## Isi yang kamu dapat
- `index.html` : undangan + form RSVP + generate QR Ticket ID
- `checkin.html` : halaman panitia scan QR (kamera) + manual check-in backup
- Integrasi Google Sheet via Google Apps Script (`apps-script/Code.gs`)

---

## 1) Setup Google Sheet
1. Buat Google Sheet baru
2. Buat tab / sheet bernama: **RSVP**
3. Isi header baris 1:
   - A: ticket_id
   - B: nama
   - C: whatsapp
   - D: jumlah_tamu
   - E: catatan
   - F: created_at
   - G: status_hadir
   - H: checkin_at

---

## 2) Setup Google Apps Script (API)
1. Google Sheet → Extensions → Apps Script
2. Paste isi file `apps-script/Code.gs` ke editor (replace semuanya)
3. Deploy → New deployment → Web app
   - Execute as: **Me**
   - Who has access: **Anyone** (atau Anyone with the link)
4. Copy URL Web App

---

## 3) Hubungkan website ke API
1. Buka `js/config.js`
2. Paste URL Web App ke `window.API_URL`

---

## 4) Jalankan website
### Penting:
- `checkin.html` butuh HTTPS untuk akses kamera (mobile).
- Cara gampang host:
  - Netlify / Vercel / GitHub Pages (gratis)

Kalau kamu mau test lokal:
- Pakai VS Code Live Server extension (untuk undangan OK)
- Tapi camera scanner biasanya butuh https, jadi tetap disarankan hosting.

---

## 5) Edit detail event
Buka `js/config.js`, ubah:
- startISO, endISO (WIB)
- venue, address, mapsQuery

---

## Notes
- QR berisi Ticket ID saja (lebih aman & cepat lookup)
- Scan QR → Apps Script cari Ticket ID di kolom A → set status_hadir=HADIR + timestamp

Have fun ✨
