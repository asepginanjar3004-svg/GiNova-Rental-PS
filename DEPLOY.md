# 🚀 PANDUAN DEPLOYMENT GINOVA KE HOSTING & DOMAIN

## ✅ STATUS: SIAP HOSTING!

Aplikasi GiNova Rental PS sudah **production-ready** dan bisa di-deploy ke hosting dengan domain.

---

## 📋 PERSYARATAN HOSTING

| Komponen | Minimum | Rekomendasi |
|---|---|---|
| **PHP** | 7.4+ | 8.0+ |
| **MySQL/MariaDB** | 5.7+ | 8.0+ |
| **Storage** | 500 MB | 1 GB+ |
| **SSL/HTTPS** | Wajib | Let's Encrypt (Gratis) |
| **Domain** | Optional | .com / .id / .co.id |

### Rekomendasi Hosting Indonesia:
- **Niagahoster** (murah, support Indonesia)
- **Rumahweb** (stabil, server Indonesia)
- **Cloudways** (cloud hosting, scalable)
- **Hostinger** (murah, fitur lengkap)

---

## 📦 FILE YANG PERLU DI-UPLOAD

Upload semua file ini ke folder `public_html` hosting:

```
📁 ginova/
├── 📄 index.html              ← Halaman Login
├── 📄 dashboard.html          ← Dashboard Kasir
├── 📄 admin.html              ← Panel Admin
├── 📄 manifest.json           ← PWA Config
├── 📄 sw.js                   ← Service Worker
├── 📄 .htaccess               ← Security Config
├── 📄 qris.jpeg               ← QRIS Image
├── 📁 api/
│   ├── 📄 config.php          ← DB Config (UPDATE!)
│   ├── 📄 security_audit.php  ← (hapus di production)
│   ├── 📄 test_db.php         ← (hapus di production)
│   └── 📄 test_ginova_user.php ← (hapus di production)
├── 📁 css/
│   └── 📄 style.css
├── 📁 js/
│   ├── 📄 app.js
│   ├── 📄 auth.js
│   ├── 📄 dashboard.js
│   └── 📄 admin.js
├── 📁 img/
│   └── 📄 ginova-logo.svg
└── 📁 (jangan upload file .sql dan file test!)
```

### ❌ File yang HAPUS sebelum upload:
- `ginova_db.sql`
- `create_user_ginova.sql`
- `create_user_ginova_v2.sql`
- `verify_db.sql`
- `import_db.bat`
- `api/security_audit.php`
- `api/test_db.php`
- `api/test_db_cli.php`
- `api/test_ginova_user.php`
- `api/test_connection.php`
- Semua file Python (`.py`)

---

## 🔧 KONFIGURASI DATABASE DI HOSTING

### 1. Buat Database & User di cPanel/Hosting

Login ke cPanel hosting Anda:

```
1. Buka cPanel → MySQL Database Wizard
2. Step 1: Buat Database
   - Nama Database: ginova_rental_ps
   
3. Step 2: Buat User
   - Username: ginova_user (atau sesuai hosting)
   - Password: Buat password kuat!
   
4. Step 3: Grant Privileges
   - Centang ALL PRIVILEGES
   - Klik Next Step
```

### 2. Import Database

```
1. Buka phpMyAdmin di cPanel
2. Pilih database ginova_rental_ps
3. Klik tab Import
4. Pilih file ginova_db.sql
5. Klik Go / Import
```

### 3. Update `api/config.php`

Edit file `api/config.php` dengan kredensial hosting:

```php
<?php
define('DB_HOST', 'localhost');           // Biasanya localhost
define('DB_USER', 'namauser_hosting');     // User dari cPanel
define('DB_PASS', 'password_hosting');     // Password dari cPanel
define('DB_NAME', 'ginova_rental_ps');     // Nama database
define('DB_CHARSET', 'utf8');
```

**Contoh untuk Niagahoster:**
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'u1234567_ginova');
define('DB_PASS', 'PasswordKuat123!');
define('DB_NAME', 'u1234567_ginova_rental_ps');
```

---

## 🌐 SETTING DOMAIN

### Opsi 1: Domain Utama
```
Upload file ke: public_html/
Akses: https://domain-anda.com/
```

### Opsi 2: Subdomain/Folder
```
Upload file ke: public_html/ginova/
Akses: https://domain-anda.com/ginova/
```

### Opsi 3: Subdomain
```
Buat subdomain: ginova.domain-anda.com
Upload ke: public_html/ginova/
```

---

## 🔒 KONFIGURASI SSL (HTTPS)

### Aktifkan SSL Gratis (Let's Encrypt)

```
1. Login cPanel → SSL/TLS
2. Klik "Manage SSL Sites"
3. Pilih domain Anda
4. Pilih "Let's Encrypt" (Auto SSL)
5. Tunggu 5-10 menit
6. Akses https://domain-anda.com
```

### Update .htaccess untuk HTTPS

Tambahkan ini ke `.htaccess`:

```apache
# Redirect HTTP ke HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## 📱 KONFIGURASI PWA (Progressive Web App)

### Update manifest.json

```json
{
  "name": "GiNova Rental PS",
  "short_name": "GiNova",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#146c43",
  "theme_color": "#146c43",
  "icons": [
    {
      "src": "img/ginova-logo.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ]
}
```

**Jika menggunakan subdomain/folder:**
```json
{
  "start_url": "/ginova/",
  "scope": "/ginova/"
}
```

---

## ✅ CHECKLIST SEBELUM GO LIVE

- [ ] Upload semua file ke hosting
- [ ] Hapus file test/audit dari server
- [ ] Buat database & import `ginova_db.sql`
- [ ] Update `api/config.php` dengan kredensial hosting
- [ ] Aktifkan SSL/HTTPS
- [ ] Test login (admin/admin123 & kasir/kasir123)
- [ ] Test fitur billing
- [ ] Test pembayaran (Cash & QRIS)
- [ ] Test admin panel (CRUD)
- [ ] Test laporan
- [ ] Ganti password default admin & kasir!
- [ ] Backup database otomatis (setup cron job)

---

## 🔐 KEAMANAN TAMBAHAN (WAJIB!)

### 1. Ganti Password Default

```sql
-- Login phpMyAdmin → jalankan query ini:
UPDATE users SET password = SHA2('password_baru_admin', 256) WHERE username = 'admin';
UPDATE users SET password = SHA2('password_baru_kasir', 256) WHERE username = 'kasir';
```

### 2. Update .htaccess Production

```apache
# Security Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
    Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:;"
</IfModule>

# Protect sensitive files
<FilesMatch "^(config\.php|\.env|\.git)">
    Order allow,deny
    Deny from all
</FilesMatch>

# Disable directory listing
Options -Indexes
ServerSignature Off
```

### 3. Backup Database Otomatis

Buat file `backup.php` dan jalankan via cron job harian:

```php
<?php
// backup.php
$date = date('Y-m-d_H-i-s');
$filename = "backup_ginova_{$date}.sql";

exec("mysqldump -u DB_USER -p'DB_PASS' DB_NAME > /path/to/backups/{$filename}");
```

---

## 🎯 PERKIRAAN BIAYA

| Komponen | Harga (per tahun) |
|---|---|
| Domain .com | Rp 120.000 - 150.000 |
| Domain .id | Rp 180.000 - 250.000 |
| Hosting Shared (Niagahoster) | Rp 300.000 - 500.000 |
| Hosting VPS (Cloudways) | Rp 500.000 - 1.000.000 |
| SSL Let's Encrypt | **GRATIS** |
| **Total Minimal** | **Rp 420.000 - 650.000/tahun** |

---

## 📞 SUPPORT & BANTUAN

Jika ada masalah saat deployment:

1. **Test koneksi database:** Buka `https://domain-anda.com/api/test_db.php`
2. **Cek error log:** cPanel → Error Logs
3. **Verifikasi file:** Pastikan semua file ter-upload
4. **Permission file:** Pastikan file bisa di-read (chmod 644)

---

## 🚀 LANGKAH CEPAT (Quick Start)

```bash
# 1. Upload file ke hosting (via FTP/File Manager)
# 2. Import database ginova_db.sql
# 3. Edit api/config.php
# 4. Aktifkan SSL
# 5. Ganti password default
# 6. DONE! 🎉
```

**Status: ✅ SIAP DEPLOY KE HOSTING & DOMAIN!**

