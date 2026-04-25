# 🗄️ GINOVA RENTAL PS - DATABASE SETUP

## 📋 File Database

| File | Deskripsi |
|------|-----------|
| `ginova_db.sql` | Schema database lengkap + data sample |
| `create_user_ginova.sql` | Script pembuatan user database |
| `import_db.bat` | Script import otomatis (Windows) |
| `verify_db.sql` | Script verifikasi setup database |

## 🚀 Quick Setup Database

### Opsi 1: Otomatis (Windows)
```bash
# Klik 2x file import_db.bat
# Ikuti instruksi di command prompt
```

### Opsi 2: Manual MySQL
```bash
# 1. Buat user database
mysql -u root -p < create_user_ginova.sql

# 2. Import schema & data
mysql -u root -p < ginova_db.sql

# 3. Verifikasi
mysql -u root -p ginova_rental_ps < verify_db.sql
```

### Opsi 3: phpMyAdmin
1. Login ke phpMyAdmin
2. Buat database: `ginova_rental_ps`
3. Import `ginova_db.sql`
4. Buat user: `ginova_user` dengan full privileges

## 🔧 Konfigurasi User Database

**Default Credentials:**
- Username: `ginova_user`
- Password: `password_anda` (ganti dengan password kuat!)
- Database: `ginova_rental_ps`

**Update di `api/config.php`:**
```php
define('DB_USER', 'ginova_user');
define('DB_PASS', 'password_anda'); // Ganti dengan password Anda
define('DB_NAME', 'ginova_rental_ps');
```

## 📊 Struktur Database

### Tabel Utama:
- `users` - Data pengguna (admin/kasir)
- `consoles` - Unit PS (PS3/PS4/PS5)
- `packages` - Paket rental (durasi/harga)
- `products` - Produk F&B (makanan/minuman/snack)
- `transactions` - Transaksi rental
- `transaction_items` - Item F&B per transaksi

### Data Sample:
- **Users**: admin/admin123, kasir/kasir123
- **Consoles**: 6 unit PS (PS3, PS4, PS5)
- **Packages**: 4 paket (1-3 jam + reguler)
- **Products**: 11 item F&B berbagai kategori

## ✅ Verifikasi Setup

Jalankan query verifikasi:
```sql
USE ginova_rental_ps;
SHOW TABLES;
SELECT COUNT(*) FROM users; -- Harus 2
SELECT COUNT(*) FROM consoles; -- Harus 6
SELECT COUNT(*) FROM products; -- Harus 11
```

## 🔒 Security Notes

- ✅ Password di-hash dengan bcrypt
- ✅ SQL Injection protection via PDO
- ✅ XSS protection di aplikasi
- ✅ File sensitif (.sql) jangan di-upload ke hosting

## 🆘 Troubleshooting

**Error: Access denied for user**
- Pastikan user `ginova_user` sudah dibuat
- Cek privileges user di MySQL

**Error: Table doesn't exist**
- Pastikan `ginova_db.sql` sudah di-import
- Cek nama database: `ginova_rental_ps`

**Error: Connection failed**
- Cek kredensial di `api/config.php`
- Pastikan MySQL service running

---

**🎉 Database siap! Lanjut ke setup aplikasi.**