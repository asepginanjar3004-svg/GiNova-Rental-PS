@echo off
cd /d "C:\xampplite\mysql\bin"
mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS ginova_rental_ps CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql.exe -u root ginova_rental_ps < "C:\Users\User\Desktop\rental-ps-dashboard\ginova_db.sql"
if %errorlevel% neq 0 (
    echo Gagal import. Mencoba dengan password root...
    mysql.exe -u root -proot -e "CREATE DATABASE IF NOT EXISTS ginova_rental_ps CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql.exe -u root -proot ginova_rental_ps < "C:\Users\User\Desktop\rental-ps-dashboard\ginova_db.sql"
)
if %errorlevel% equ 0 (
    echo Import berhasil!
) else (
    echo Import gagal. Silakan periksa password root MySQL.
)
pause

