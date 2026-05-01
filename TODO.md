# TODO.md - Perbaikan Error GiNova Rental PS
Status: 🚀 Ongoing | Progress: 1/12

**✅ Step 1 Partial Complete**: TODO.md dibuat
**⏳ Next**: Install XAMPP & test PHP

## 1. ✅ Setup Environment (Kritis)
- [ ] Install XAMPP (PHP + MySQL)
- [ ] Tambah PHP ke PATH atau gunakan full path
- [ ] Jalankan XAMPP (Apache + MySQL)
- [ ] Test `php api/test_db.php`

## 2. ✅ Database Setup
- [ ] Jalankan `import_db.bat`
- [ ] Verifikasi DB via phpMyAdmin atau test_db.php
- [ ] Update config.php jika kredensial berubah

## 3. 🔧 Fix File Hilang/Bermasalah
- [ ] Baca & fix js/dashboard.js
- [ ] Baca & fix js/payment.js  
- [ ] Baca admin.html & js/admin.js
- [ ] Fix api/save_transaction.php, get_dashboard.php

## 4. 🧪 Testing Flows
- [ ] Test login (admin/admin123, kasir/kasir123)
- [ ] Test kasir dashboard (start billing, F&B, payment)
- [ ] Test admin panel (CRUD, reports)

## 5. 🚀 Production Ready
- [ ] Fix CORS & sync LocalStorage ↔ DB
- [ ] Add JWT security
- [ ] Deploy instructions
- [ ] Final test & cleanup

**Next Step: Update status setiap selesai.**

Log Perubahan:
```

