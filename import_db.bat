@echo off
REM ============================================
REM GINOVA RENTAL PS - Database Import Script
REM Untuk Windows - Import otomatis database
REM ============================================

echo ============================================
echo    GINOVA RENTAL PS - SETUP DATABASE
echo ============================================
echo.

REM Cek apakah MySQL tersedia
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: MySQL client tidak ditemukan!
    echo Pastikan MySQL sudah terinstall dan ada di PATH
    pause
    exit /b 1
)

echo MySQL client ditemukan.
echo.

REM Minta input kredensial
set /p DB_USER="Masukkan username MySQL (default: root): "
if "%DB_USER%"=="" set DB_USER=root

set /p DB_PASS="Masukkan password MySQL: "
if "%DB_PASS%"=="" (
    echo Menggunakan koneksi tanpa password...
    set MYSQL_CMD=mysql -u %DB_USER%
) else (
    set MYSQL_CMD=mysql -u %DB_USER% -p%DB_PASS%
)

echo.
echo Testing koneksi database...
%MYSQL_CMD% -e "SELECT VERSION();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Gagal koneksi ke MySQL!
    echo Periksa kredensial Anda.
    pause
    exit /b 1
)

echo Koneksi berhasil!
echo.

REM Buat user database
echo Membuat user database...
%MYSQL_CMD% < create_user_ginova.sql
if %errorlevel% neq 0 (
    echo ERROR: Gagal membuat user database!
    pause
    exit /b 1
)

echo User database berhasil dibuat.
echo.

REM Import schema database
echo Importing database schema...
%MYSQL_CMD% < ginova_db.sql
if %errorlevel% neq 0 (
    echo ERROR: Gagal import database!
    pause
    exit /b 1
)

echo.
echo ============================================
echo    DATABASE BERHASIL DI-SETUP!
echo ============================================
echo.
echo User database: ginova_user
echo Database: ginova_rental_ps
echo.
echo JANGAN LUPA UPDATE api/config.php dengan:
echo - DB_USER: ginova_user
echo - DB_PASS: [password yang Anda set]
echo - DB_NAME: ginova_rental_ps
echo.
echo Default login aplikasi:
echo Admin: admin / admin123
echo Kasir: kasir / kasir123
echo.
pause