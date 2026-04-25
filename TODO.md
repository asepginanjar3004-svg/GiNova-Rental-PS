# TODO - Modifikasi Fitur GiNova Rental PS

## Rencana Modifikasi

### 1. `js/dashboard.js`
- [ ] Perbaiki kode terpotong di akhir file (helper `calculateDuration` yang tidak lengkap).
- [ ] Refactor timer: buat fungsi `updateTimer()` sebagai entry point untuk update timer + alarm.
- [ ] Modifikasi `checkAlarms()`: alarm 5 menit & 1 menit harus **berulang (looping)** dengan interval yang masuk akal.
- [ ] Pastikan komentar dokumentasi ada di setiap blok logika baru.

### 2. `js/admin.js`
- [ ] Tambahkan fungsi `renderVoidAudit()` untuk menampilkan riwayat pembatalan F&B di Super Admin.
- [ ] Tambahkan helper untuk mengambil data void dari `TRANSACTION_ITEMS`.

### 3. `admin.html`
- [ ] Tambahkan menu navigasi "Audit Void" di navbar.
- [ ] Tambahkan section baru `#section-void-audit` dengan tabel riwayat pembatalan.

### 4. `css/style.css`
- [ ] Tambahkan styling untuk tabel audit void agar konsisten dengan tema GiNova.

## Status
- [x] **Selesai**: Langkah 1 - Perbaikan `js/dashboard.js` (calculateDuration, timer, alarm)
- [x] **Selesai**: Langkah 2 - Modifikasi `js/admin.js` (renderVoidAudit, helper void)
- [x] **Selesai**: Langkah 3 - Styling `css/style.css` (tabel audit void)
- [x] **Selesai**: Menu navigasi "Audit Void" di `admin.html`
- [x] **Selesai**: Section void-audit di `admin.html`
- [x] **Selesai**: Cleanup file production (hapus test files, SQL files)
- [x] **Selesai**: Update config.php untuk production
- [x] **Selesai**: Update README.md untuk deployment
- [x] **SELESAI PENUH**: Aplikasi siap upload ke hosting!

