-- ============================================
-- GINOVA RENTAL PS - Database Verification
-- Script untuk verifikasi setup database
-- ============================================

USE ginova_rental_ps;

-- Cek semua tabel
SHOW TABLES;

-- Hitung record di setiap tabel
SELECT 'Users' as Table_Name, COUNT(*) as Total_Records FROM users
UNION ALL
SELECT 'Consoles' as Table_Name, COUNT(*) as Total_Records FROM consoles
UNION ALL
SELECT 'Packages' as Table_Name, COUNT(*) as Total_Records FROM packages
UNION ALL
SELECT 'Products' as Table_Name, COUNT(*) as Total_Records FROM products
UNION ALL
SELECT 'Transactions' as Table_Name, COUNT(*) as Total_Records FROM transactions
UNION ALL
SELECT 'Transaction_Items' as Table_Name, COUNT(*) as Total_Records FROM transaction_items;

-- Cek data sample
SELECT 'Users Sample:' as Info;
SELECT id, name, username, role FROM users LIMIT 5;

SELECT 'Consoles Sample:' as Info;
SELECT id, name, type, status FROM consoles LIMIT 5;

SELECT 'Packages Sample:' as Info;
SELECT id, name, duration, price FROM packages LIMIT 5;

SELECT 'Products Sample:' as Info;
SELECT id, name, category, stock, price FROM products LIMIT 5;

-- Cek koneksi aplikasi (jalankan di aplikasi)
-- SELECT 'Database connection test successful!' as Status;