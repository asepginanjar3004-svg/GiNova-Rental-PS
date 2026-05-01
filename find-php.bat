@echo off
REM ============================================
REM GINOVA - PHP Auto-Detector & Setup
REM Cari PHP di semua lokasi umum + test DB
REM ============================================

echo 🚀 GINOVA PHP Auto-Setup ^> Memindai PHP...

REM 1. CEK PATH SUDAH ADA
php --version >nul 2>&1
if %errorlevel%==0 (
    echo ✅ PHP sudah di PATH!
    goto :test_db
)

REM 2. XAMPP LOCATIONS (paling umum)
set XAMPP_PATHS="C:\xampp\php\php.exe" "C:\xammp\php\php.exe" "D:\xampp\php\php.exe"

for %%p in (%XAMPP_PATHS%) do (
    if exist %%p (
        echo ✅ PHP ditemukan: %%p
        set PHP_PATH=%%p
        goto :use_php
    )
)

REM 3. PHP FOLDERS UMUM
set PHP_FOLDERS="C:\php\php.exe" "C:\php8\php.exe" "C:\Program Files\php\php.exe"

for %%p in (%PHP_FOLDERS%) do (
    if exist %%p (
        echo ✅ PHP ditemukan: %%p
        set PHP_PATH=%%p
        goto :use_php
    )
)

REM 4. FULL SCAN (lambat tapi pasti)
echo 🔍 Scanning Program Files...
for /r "C:\Program Files" %%f in (php.exe) do (
    echo   Found: %%f
    set PHP_PATH=%%f
    goto :use_php
)

echo ⚠️ PHP tidak ditemukan!
echo 📥 Download XAMPP: https://www.apachefriends.org/download.html
echo atau PHP: https://windows.php.net/download/
pause
exit /b 1

:use_php
echo 🎉 Menggunakan PHP: %PHP_PATH%

REM Test PHP
echo.
echo 📊 Testing PHP version:
"%PHP_PATH%" --version
if %errorlevel% neq 0 (
    echo ❌ PHP test gagal!
    pause
    exit /b 1
)

:test_db
echo.
echo 🧪 Testing database koneksi:
"%PHP_PATH%" api/test_db.php
if %errorlevel% neq 0 (
    echo ⚠️ DB test gagal - jalankan import_db.bat dulu!
)

REM Setup TEMP PATH
set PATH_TMP=%PATH%;%~dp0
setx PATH "%PATH_TMP%" /M >nul 2>&1

echo.
echo ✅ Setup selesai!
echo 🔄 Restart VSCode terminal untuk PHP di PATH
echo.
echo Next steps:
echo 1. ./import_db.bat
echo 2. php api/test_db.php  
echo 3. Live Server ^> index.html
pause

