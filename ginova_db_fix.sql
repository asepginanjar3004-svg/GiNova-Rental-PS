-- ============================================
-- GINOVA RENTAL PS - Database Schema (UPDATED)
-- Sistem Manajemen Rental PlayStation dengan Sync Status
-- ============================================

-- Membuat database
CREATE DATABASE IF NOT EXISTS ginova_rental_ps
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ginova_rental_ps;

-- ============================================
-- TABEL: USERS (Pengguna/Admin)
-- ============================================
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'kasir') NOT NULL DEFAULT 'kasir',
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- TABEL: CONSOLES (Unit PS)
-- ============================================
CREATE TABLE consoles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('PS3', 'PS4', 'PS5') NOT NULL,
    status ENUM('available', 'busy') NOT NULL DEFAULT 'available',
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- TABEL: PACKAGES (Paket Rental)
-- ============================================
CREATE TABLE packages (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    duration INT NOT NULL DEFAULT 0, -- dalam menit, 0 = reguler
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_reguler BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- TABEL: PRODUCTS (Produk F&B)
-- ============================================
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category ENUM('Makanan', 'Minuman', 'Snack') NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- TABEL: TRANSACTIONS (Transaksi Rental)
-- ============================================
CREATE TABLE transactions (
    id VARCHAR(36) PRIMARY KEY,
    console_id VARCHAR(36),
    package_id VARCHAR(36),
    customer_name VARCHAR(100),
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    base_price DECIMAL(10,2) DEFAULT 0,
    extended_amount DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2),
    status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    paid_at DATETIME,
    paid_amount DECIMAL(10,2),
    change_amount DECIMAL(10,2),
    payment_method VARCHAR(20) DEFAULT 'cash',
    created_by VARCHAR(36),
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (console_id) REFERENCES consoles(id) ON DELETE SET NULL,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- TABEL: TRANSACTION_ITEMS (Item F&B per Transaksi)
-- DENGAN SYNC STATUS - Kolom is_synced Ditambahkan
-- ============================================
CREATE TABLE transaction_items (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    status ENUM('active', 'void') NOT NULL DEFAULT 'active',
    
    -- Kolom untuk Sinkronisasi (BARU)
    -- is_synced: 0 = belum sync, 1 = sudah sync ke server
    is_synced TINYINT(1) DEFAULT 0,
    sync_attempts INT DEFAULT 0,
    last_sync_at DATETIME,
    
    voided_by VARCHAR(36),
    voided_at DATETIME,
    created_at DATETIME NOT NULL,

    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (voided_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- TABEL: PENDING_SYNC (Antrian Sync Offline)
-- Untuk menyimpan pesanan yang perlu sync saat online
-- ============================================
CREATE TABLE pending_sync (
    id VARCHAR(36) PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(36) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'insert', 'update', 'delete'
    payload JSON,
    status ENUM('pending', 'syncing', 'synced', 'failed') DEFAULT 'pending',
    attempts INT DEFAULT 0,
    last_attempt_at DATETIME,
    created_at DATETIME NOT NULL,
    synced_at DATETIME
);

-- ============================================
-- INDEXES untuk performa
-- ============================================
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_paid_at ON transactions(paid_at);
CREATE INDEX idx_transactions_console_id ON transactions(console_id);
CREATE INDEX idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_status ON transaction_items(status);
CREATE INDEX idx_transaction_items_synced ON transaction_items(is_synced);
CREATE INDEX idx_pending_sync_status ON pending_sync(status);
CREATE INDEX idx_consoles_status ON consoles(status);
CREATE INDEX idx_products_category ON products(category);

-- ============================================
-- DATA SAMPLE
-- ============================================

-- Users default
INSERT INTO users (id, name, username, password, role, created_at) VALUES
('user-admin-001', 'Administrator', 'admin', '$2a$10$8K1p8Z9WvM9q8K1p8Z9WvM9q8K1p8Z9WvM9q8K1p8Z9WvM9q8K1p8Z9Wv', 'admin', NOW()),
('user-kasir-001', 'Kasir Utama', 'kasir', '$2a$10$8K1p8Z9WvM9q8K1p8Z9WvM9q8K1p8Z9WvM9q8K1p8Z9WvM9q8K1p8Z9Wv', 'kasir', NOW());

-- Consoles (Unit PS)
INSERT INTO consoles (id, name, type, status, created_at) VALUES
('ps4-001', 'PS4 Pro Unit 1', 'PS4', 'available', NOW()),
('ps4-002', 'PS4 Pro Unit 2', 'PS4', 'available', NOW()),
('ps4-003', 'PS4 Slim Unit 3', 'PS4', 'available', NOW()),
('ps5-001', 'PS5 Standard Unit 1', 'PS5', 'available', NOW()),
('ps5-002', 'PS5 Digital Unit 2', 'PS5', 'available', NOW()),
('ps3-001', 'PS3 Super Slim Unit 1', 'PS3', 'available', NOW());

-- Packages
INSERT INTO packages (id, name, duration, price, description, is_reguler, created_at) VALUES
('pkg-1jam', 'Paket 1 Jam', 60, 15000.00, '1 jam main PS', FALSE, NOW()),
('pkg-2jam', 'Paket 2 Jam', 120, 25000.00, '2 jam main PS', FALSE, NOW()),
('pkg-3jam', 'Paket 3 Jam', 180, 35000.00, '3 jam main PS', FALSE, NOW()),
('pkg-reguler', 'Reguler', 0, 5000.00, 'Per jam reguler', TRUE, NOW());

-- Products (F&B)
INSERT INTO products (id, name, category, stock, price, created_at) VALUES
('prod-mie-001', 'Mie Goreng', 'Makanan', 50, 12000.00, NOW()),
('prod-mie-002', 'Mie Kuah', 'Makanan', 45, 10000.00, NOW()),
('prod-nasgor', 'Nasi Goreng', 'Makanan', 40, 15000.00, NOW()),
('prod-ayam', 'Ayam Goreng', 'Makanan', 30, 18000.00, NOW()),
('prod-coke', 'Coca Cola', 'Minuman', 100, 8000.00, NOW()),
('prod-sprite', 'Sprite', 'Minuman', 95, 8000.00, NOW()),
('prod-teh', 'Es Teh Manis', 'Minuman', 80, 5000.00, NOW()),
('prod-jeruk', 'Jus Jeruk', 'Minuman', 60, 10000.00, NOW()),
('prod-kentang', 'Kentang Goreng', 'Snack', 70, 12000.00, NOW()),
('prod-pisang', 'Pisang Goreng', 'Snack', 55, 8000.00, NOW()),
('prod-onion', 'Onion Rings', 'Snack', 40, 15000.00, NOW());

-- ============================================
-- MIGRATION: Jika tabel sudah ada, tambahkan kolom is_synced
-- ============================================
-- ALTER TABLE transaction_items ADD COLUMN is_synced TINYINT(1) DEFAULT 0;
-- ALTER TABLE transaction_items ADD COLUMN sync_attempts INT DEFAULT 0;
-- ALTER TABLE transaction_items ADD COLUMN last_sync_at DATETIME;

-- ============================================
-- END OF SCHEMA
-- ============================================
