@echo off
setlocal enabledelayedexpansion
echo === GiNova Git Push Tool ===
set PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\Git\mingw64\bin

REM 1. Cek inisialisasi Git
if not exist .git (
    echo [INFO] Menginisialisasi repositori Git lokal...
    git init
    git branch -M main
)

REM 2. Cek remote origin
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [PERHATIAN] Remote origin belum diatur.
    set /p REPO_URL="Masukkan URL Repositori GitHub Anda (contoh: https://github.com/user/repo.git): "
    if not "!REPO_URL!"=="" (
        git remote add origin !REPO_URL!
    ) else (
        echo ERROR: URL tidak boleh kosong.
        pause
        exit /b 1
    )
)

echo [1/3] Menambahkan file ke staging...
git add .

echo [2/3] Membuat commit...
git commit -m "Finalize GiNova Production Audit and CI/CD Setup" || echo [INFO] Tidak ada perubahan baru.

echo [3/3] Mengunggah ke GitHub (Push)...
echo Sedang mengirim data ke GitHub...
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Gagal mengunggah! Kemungkinan penyebab:
    echo 1. Anda belum login ke GitHub di komputer ini.
    echo 2. URL Repositori salah.
    echo 3. Token akses (PAT) diperlukan jika menggunakan HTTPS.
    echo.
    echo Tips: Jalankan 'git push -u origin main' secara manual di CMD untuk melihat pesan error detail.
) else (
    echo.
    echo BERHASIL: File telah terunggah ke branch main.
)
pause
