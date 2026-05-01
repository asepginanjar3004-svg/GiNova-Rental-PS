-- ============================================
-- GINOVA RENTAL PS - Database User Setup
-- Script untuk membuat user database
-- ============================================

-- Jalankan sebagai root/admin MySQL

-- Membuat user database untuk aplikasi
CREATE DATABASE IF NOT EXISTS ginova_rental_ps;

DROP USER IF EXISTS 'ginova_user'@'localhost';
CREATE USER IF NOT EXISTS 'ginova_user'@'localhost' IDENTIFIED BY 'password_anda';

-- Grant semua privileges untuk database ginova_rental_ps
GRANT ALL PRIVILEGES ON ginova_rental_ps.* TO 'ginova_user'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verifikasi user
SELECT User, Host FROM mysql.user WHERE User = 'ginova_user';

-- ============================================
-- CATATAN PENTING:
-- ============================================
-- 1. Ganti 'password_anda' dengan password yang kuat
-- 2. Untuk hosting/production, sesuaikan host (bukan 'localhost')
-- 3. Pastikan user memiliki privileges yang cukup
-- 4. Jalankan script ini SEBELUM import ginova_db.sql