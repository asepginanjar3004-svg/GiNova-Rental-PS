-- ============================================================
-- GINOVA RENTAL PS MANAGEMENT SYSTEM
-- MySQL Database Schema & Seeder (MySQL 5.1 Compatible)
-- Versi: 1.0 Premium
-- Charset: utf8
-- Engine: InnoDB
-- ============================================================

CREATE DATABASE IF NOT EXISTS ginova_rental_ps
  CHARACTER SET utf8
  COLLATE utf8_general_ci;

USE ginova_rental_ps;

-- ============================================================
-- TABEL USERS (Pengguna: Admin & Kasir)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL COMMENT 'Bcrypt hash',
  name          VARCHAR(100) NOT NULL,
  role          ENUM('admin','kasir') NOT NULL DEFAULT 'kasir',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT NULL,
  
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- TABEL CONSOLES (Unit PS)
-- ============================================================
CREATE TABLE IF NOT EXISTS consoles (
  id            VARCHAR(50) PRIMARY KEY COMMENT 'Contoh: ps4-1, ps5-2',
  name          VARCHAR(100) NOT NULL COMMENT 'Contoh: PS4 No. 1',
  type          ENUM('PS3','PS4','PS5') NOT NULL DEFAULT 'PS4',
  status        ENUM('available','busy','maintenance') NOT NULL DEFAULT 'available',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT NULL,
  
  INDEX idx_status (status),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- TABEL PACKAGES (Paket Billing)
-- ============================================================
CREATE TABLE IF NOT EXISTS packages (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL COMMENT 'Contoh: Paket 2 Jam',
  duration      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Menit, 0 = Reguler per jam',
  price         DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Rupiah',
  is_reguler    TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = hitung per jam',
  description   VARCHAR(255) DEFAULT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT NULL,
  
  INDEX idx_reguler (is_reguler),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- TABEL PRODUCTS (F&B - Food & Beverage)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  category      ENUM('Makanan','Minuman','Snack') NOT NULL DEFAULT 'Makanan',
  stock         INT UNSIGNED NOT NULL DEFAULT 0,
  price         DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Rupiah',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT NULL,
  
  INDEX idx_category (category),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- TABEL TRANSACTIONS (Transaksi Penyewaan)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  console_id    VARCHAR(50) NOT NULL,
  package_id    INT UNSIGNED NOT NULL,
  start_time    DATETIME NOT NULL,
  end_time      DATETIME DEFAULT NULL COMMENT 'NULL jika reguler / open timer',
  base_price    DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Harga paket dasar',
  total_price   DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Total akhir (PS + F&B)',
  status        ENUM('unpaid','paid','cancelled') NOT NULL DEFAULT 'unpaid',
  paid_at       DATETIME DEFAULT NULL,
  payment_method ENUM('cash','qris','transfer') DEFAULT NULL,
  cash          DECIMAL(12,0) DEFAULT NULL COMMENT 'Uang diterima (cash)',
  `change`      DECIMAL(12,0) DEFAULT NULL COMMENT 'Kembalian',
  created_by    INT UNSIGNED DEFAULT NULL COMMENT 'ID user kasir',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT NULL,
  
  INDEX idx_status (status),
  INDEX idx_console (console_id),
  INDEX idx_package (package_id),
  INDEX idx_created_by (created_by),
  INDEX idx_paid_at (paid_at),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (console_id) REFERENCES consoles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- TABEL TRANSACTION_ITEMS (Item F&B per Transaksi)
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaction_id  INT UNSIGNED NOT NULL,
  product_id      INT UNSIGNED NOT NULL,
  product_name    VARCHAR(100) NOT NULL COMMENT 'Snapshot nama produk',
  price           DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Snapshot harga',
  qty             INT UNSIGNED NOT NULL DEFAULT 1,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_transaction (transaction_id),
  INDEX idx_product (product_id),
  
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- TABEL SETTINGS (Konfigurasi Toko)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store_name              VARCHAR(255) NOT NULL DEFAULT 'GiNova Rental PS',
  store_address           TEXT DEFAULT NULL,
  store_phone             VARCHAR(50) DEFAULT NULL,
  regular_price_per_hour  DECIMAL(12,0) NOT NULL DEFAULT 6000 COMMENT 'Harga reguler per jam',
  qris_nmid               VARCHAR(100) DEFAULT 'ID1021144125403',
  qris_name               VARCHAR(100) DEFAULT 'ASEP GINANJAR',
  updated_at              DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- TABEL ACTIVITY_LOG (Audit Trail - Premium Feature)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED DEFAULT NULL,
  action        VARCHAR(50) NOT NULL COMMENT 'CREATE, UPDATE, DELETE, LOGIN, LOGOUT',
  table_name    VARCHAR(50) NOT NULL,
  record_id     VARCHAR(100) DEFAULT NULL,
  old_value     TEXT DEFAULT NULL,
  new_value     TEXT DEFAULT NULL,
  ip_address    VARCHAR(45) DEFAULT NULL,
  user_agent    VARCHAR(255) DEFAULT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- ============================================================
-- SEEDER: DATA AWAL
-- ============================================================

-- 1. Users (Password dalam plaintext untuk demo, gunakan bcrypt di production)
INSERT INTO users (username, password, name, role) VALUES
  ('admin', 'admin123', 'Administrator', 'admin'),
  ('kasir', 'kasir123', 'Kasir 1', 'kasir');

-- 2. Consoles
INSERT INTO consoles (id, name, type, status) VALUES
  ('ps3-1', 'PS3 No. 1', 'PS3', 'available'),
  ('ps3-2', 'PS3 No. 2', 'PS3', 'available'),
  ('ps4-1', 'PS4 No. 1', 'PS4', 'available'),
  ('ps4-2', 'PS4 No. 2', 'PS4', 'available'),
  ('ps5-1', 'PS5 No. 1', 'PS5', 'available'),
  ('ps5-2', 'PS5 No. 2', 'PS5', 'available');

-- 3. Packages
INSERT INTO packages (name, duration, price, is_reguler, description) VALUES
  ('Reguler', 0, 6000, 1, 'Per jam'),
  ('Paket 1 Jam', 60, 6000, 0, '1 Jam'),
  ('Paket 2 Jam', 120, 11000, 0, '2 Jam'),
  ('Paket 3 Jam', 180, 15000, 0, '3 Jam'),
  ('Paket 4 Jam', 240, 18000, 0, '4 Jam'),
  ('Paket 5 Jam', 300, 22000, 0, '5 Jam');

-- 4. Products (F&B)
INSERT INTO products (name, category, stock, price) VALUES
  ('Mie Gelas', 'Makanan', 50, 3500),
  ('Permen', 'Makanan', 100, 2000),
  ('Kopi', 'Minuman', 30, 5000),
  ('Teh Manis', 'Minuman', 30, 4000),
  ('Air Mineral', 'Minuman', 40, 3000),
  ('Nasi Goreng', 'Makanan', 20, 12000);

-- 5. Settings
INSERT INTO settings (store_name, store_address, store_phone, regular_price_per_hour, qris_nmid, qris_name) VALUES
  ('GiNova Rental PS', 'Jl. Contoh No. 123', '0812-3456-7890', 6000, 'ID1021144125403', 'ASEP GINANJAR');

-- ============================================================
-- CATATAN INSTALLASI
-- ============================================================
-- 1. Buka phpMyAdmin atau MySQL Workbench
-- 2. Buat database baru bernama 'ginova_rental_ps' (atau langsung import file ini)
-- 3. Klik tab Import / SQL
-- 4. Pilih file ginova_db.sql
-- 5. Klik Go / Execute
-- 6. Selesai!
--
-- Untuk koneksi PHP, gunakan file api/config.php yang sudah disediakan.
-- Password di production HARUS di-hash dengan password_hash() PHP.
-- ============================================================

