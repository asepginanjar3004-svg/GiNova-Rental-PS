-- Hapus user GiNova jika sudah ada (untuk menghindari duplicate)
DROP USER IF EXISTS 'GiNova'@'localhost';

-- Buat user GiNova untuk database ginova_rental_ps
CREATE USER 'GiNova'@'localhost' IDENTIFIED BY 'Cepot034';

-- Berikan hak akses penuh ke database ginova_rental_ps
GRANT ALL PRIVILEGES ON ginova_rental_ps.* TO 'GiNova'@'localhost';

-- Berikan hak akses untuk melihat database lain (phpMyAdmin)
GRANT SELECT ON mysql.* TO 'GiNova'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verifikasi user dibuat
SELECT User, Host FROM mysql.user WHERE User = 'GiNova';

