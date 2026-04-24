# 🎮 GiNova Rental PS Management System

![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Tech](https://img.shields.io/badge/stack-HTML%2FCSS%2FJS%2FPHP-orange)
![Database](https://img.shields.io/badge/database-MySQL-blue)

> **Sistem Manajemen Rental PlayStation Premium** — Billing real-time, F&B terintegrasi, pembayaran QRIS, laporan keuangan otomatis, dan multi-role authentication.

---

## ✨ Fitur Unggulan

| Fitur | Deskripsi |
|-------|-----------|
| 🕹️ **Billing Real-Time** | Timer otomatis per unit PS dengan hitungan per menit |
| 💰 **Pembayaran Dual Mode** | Cash & QRIS (DANA) dengan auto-transfer simulation |
| 🍔 **F&B Terintegrasi** | Kelola stok makanan & minuman, otomatis kurangi saat transaksi |
| 📊 **Laporan Keuangan** | Grafik omzet harian, mingguan, per kategori PS vs F&B |
| 👥 **Multi Role** | Admin (full access) & Kasir (operasional) |
| 📱 **PWA Ready** | Bisa di-install sebagai aplikasi di HP & desktop |
| 🔒 **Keamanan** | Hash password, SQL injection protection, XSS protection |

---

## 🚀 Quick Start

### 1. Persyaratan Server
- PHP >= 7.4 dengan ekstensi `mysqli`
- MySQL / MariaDB
- Web server (Apache/Nginx)

### 2. Setup Database
```bash
# Import struktur database
mysql -u root -p < ginova_db.sql

# Atau jalankan script batch (Windows)
import_db.bat
```

### 3. Konfigurasi
Edit file `api/config.php`:
```php
$DB_HOST = 'localhost';
$DB_USER = 'ginova_user';
$DB_PASS = 'password_anda';
$DB_NAME = 'ginova_rental';
```

### 4. Akses Aplikasi
| URL | Peran | Login |
|-----|-------|-------|
| `index.html` | Login Page | admin/admin123 atau kasir/kasir123 |
| `dashboard.html` | Kasir | Billing, F&B, Pembayaran |
| `admin.html` | Admin | CRUD Unit, Paket, Produk, User, Laporan |

---

## 📁 Struktur Proyek

```
rental-ps-dashboard/
├── index.html              # Halaman Login
├── dashboard.html          # Dashboard Kasir
├── admin.html              # Panel Admin
├── css/
│   └── style.css           # Theme Bootstrap 5 Hijau-Putih
├── js/
│   ├── app.js              # Inisialisasi & Database
│   ├── auth.js             # Autentikasi & Role
│   ├── dashboard.js        # Timer, Billing, Payment
│   └── admin.js            # CRUD & Reports
├── api/
│   ├── config.php          # Konfigurasi Database
│   ├── test_db.php         # Test Koneksi
│   └── security_audit.php  # Audit Keamanan
├── img/
│   └── ginova-logo.svg     # Logo GiNova
├── ginova_db.sql           # Struktur Database
└── README.md               # Dokumentasi
```

---

## 🖼️ Screenshot

### Login Page
Tampilan login dengan logo GiNova yang besar dan jelas.

### Dashboard Kasir
- Grid unit PS dengan status real-time
- Tabel transaksi berjalan dengan timer
- Modal pembayaran cash/QRIS

### Admin Panel
- Dashboard dengan grafik Chart.js
- Kelola Unit PS, Paket, Produk F&B, Pengguna
- Laporan keuangan dengan filter tanggal

---

## 🔐 Keamanan

- ✅ Password di-hash dengan bcrypt
- ✅ SQL Injection protection (prepared statements)
- ✅ XSS protection (output escaping)
- ✅ CSRF token ready
- ✅ Role-based access control (RBAC)
- ✅ Session timeout handling

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | HTML5, Bootstrap 5, Bootstrap Icons, Chart.js |
| **Backend** | PHP 7.4+, MySQLi |
| **Storage** | LocalStorage (client) + MySQL (server) |
| **Payment** | QRIS (simulasi DANA) |

---

## 📄 Lisensi

MIT License — Bebas digunakan untuk personal & komersial.

---

## 👤 Author

**Asep Ginanjar**  
📧 asep.ginanjar3004@gmail.com  
🔗 GitHub: [Buat repository Anda](https://github.com/new)

---

> **GiNova** — *Main Bareng, Seru Bareng!* 🎮

