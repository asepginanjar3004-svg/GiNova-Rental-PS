-- ============================================
-- GINOVA RENTAL PS - Database Schema
-- Sistem Manajemen Rental PlayStation
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
    console_id VARCHAR(36) NOT NULL,
    package_id VARCHAR(36),
    customer_name VARCHAR(100),
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    base_price DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2),
    status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    paid_at DATETIME,
    created_by VARCHAR(36),
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (console_id) REFERENCES consoles(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- TABEL: TRANSACTION_ITEMS (Item F&B per Transaksi)
-- ============================================
CREATE TABLE transaction_items (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    status ENUM('active', 'void') NOT NULL DEFAULT 'active',
    voided_by VARCHAR(36),
    voided_at DATETIME,
    created_at DATETIME NOT NULL,

    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (voided_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES untuk performa
-- ============================================
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_paid_at ON transactions(paid_at);
CREATE INDEX idx_transactions_console_id ON transactions(console_id);
CREATE INDEX idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_status ON transaction_items(status);
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
-- STORED PROCEDURES (Opsional)
-- ============================================

DELIMITER //

-- Procedure untuk mendapatkan laporan harian
CREATE PROCEDURE get_daily_report(IN report_date DATE)
BEGIN
    SELECT
        COUNT(t.id) as total_transactions,
        SUM(t.total_price) as total_revenue,
        SUM(t.base_price) as ps_revenue,
        SUM(t.total_price - t.base_price) as fnb_revenue
    FROM transactions t
    WHERE DATE(t.paid_at) = report_date
    AND t.status = 'completed';
END //

-- Procedure untuk void item F&B
CREATE PROCEDURE void_transaction_item(
    IN item_id VARCHAR(36),
    IN voided_by_user VARCHAR(36)
)
BEGIN
    UPDATE transaction_items
    SET status = 'void',
        voided_by = voided_by_user,
        voided_at = NOW()
    WHERE id = item_id;

    -- Kembalikan stok produk
    UPDATE products p
    INNER JOIN transaction_items ti ON p.id = ti.product_id
    SET p.stock = p.stock + ti.qty
    WHERE ti.id = item_id AND ti.status = 'void';
END //

DELIMITER ;

-- ============================================
-- TRIGGERS untuk auto-update
-- ============================================

-- Trigger untuk update status console saat transaksi aktif
DELIMITER //

CREATE TRIGGER update_console_status_on_transaction
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'active' THEN
        UPDATE consoles SET status = 'busy' WHERE id = NEW.console_id;
    END IF;
END //

CREATE TRIGGER update_console_status_on_transaction_complete
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    IF OLD.status = 'active' AND NEW.status = 'completed' THEN
        UPDATE consoles SET status = 'available' WHERE id = NEW.console_id;
    END IF;
END //

DELIMITER ;

-- ============================================
-- VIEWS untuk reporting
-- ============================================

-- View untuk laporan transaksi lengkap
CREATE VIEW transaction_report AS
SELECT
    t.id,
    t.customer_name,
    c.name as console_name,
    c.type as console_type,
    p.name as package_name,
    p.duration,
    t.start_time,
    t.end_time,
    t.base_price,
    t.total_price,
    t.paid_at,
    u.name as created_by_name,
    TIMESTAMPDIFF(MINUTE, t.start_time, t.end_time) as actual_duration
FROM transactions t
LEFT JOIN consoles c ON t.console_id = c.id
LEFT JOIN packages p ON t.package_id = p.id
LEFT JOIN users u ON t.created_by = u.id
WHERE t.status = 'completed';

-- View untuk laporan F&B
CREATE VIEW fnb_report AS
SELECT
    ti.product_name,
    p.category,
    SUM(ti.qty) as total_qty,
    SUM(ti.price * ti.qty) as total_revenue,
    COUNT(DISTINCT ti.transaction_id) as transactions_count
FROM transaction_items ti
INNER JOIN products p ON ti.product_id = p.id
WHERE ti.status = 'active'
GROUP BY ti.product_name, p.category
ORDER BY total_revenue DESC;

-- ============================================
-- PERMISSIONS
-- ============================================

-- Buat user database (sesuaikan password)
-- GRANT ALL PRIVILEGES ON ginova_rental_ps.* TO 'ginova_user'@'localhost' IDENTIFIED BY 'password_anda';
-- FLUSH PRIVILEGES;

-- ============================================
-- END OF SCHEMA
-- ============================================