@echo off
echo ========================================
echo GINOVA - Development Servers Sync
echo Backend (PHP): localhost:8000 ^| Frontend (Live Server): localhost:5500
echo ========================================
echo.

REM Check if PHP is available
php -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PHP not found. Install PHP or use XAMPP.
    echo Full instructions: https://www.php.net/manual/en/install.windows.manual.php
    pause
    exit /b 1
)

REM Check if MySQL (XAMPP) is running on port 3306
echo [0/3] Checking MySQL Connection...
netstat -ano | findstr :3306 >nul
if %errorlevel% neq 0 (
    echo ERROR: MySQL (XAMPP) BELUM AKTIF!
    echo Silakan buka XAMPP Control Panel dan klik "Start" pada MySQL.
    pause
    exit /b 1
)
echo [OK] MySQL is running.

REM Kill existing PHP servers on port 8000 (optional safety)
echo Stopping any existing PHP server on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    if not "%%a"=="0" taskkill /F /PID %%a
)

echo.
echo [1/3] Starting PHP Backend Server on http://localhost:5500
echo Open dashboard: http://localhost:5500/dashboard.html
start "PHP Backend 5500" /min cmd /k "cd /d \"%CD%\" && php -S localhost:5500 -t ."

echo.
echo [2/3] Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Opening Frontend Live Server (port 5500) in VS Code...
echo All set! Open dashboard.html in Live Server ^(Ctrl+Shift+P → "Live Server: Open" after VSCode opens^)
code . --reuse-window

echo.
echo ========================================
echo [OK] Backend: http://localhost:8000
echo [OK] Frontend: Klik "Go Live" di VS Code (Port 5500)
echo.
echo Gunakan port 5500 untuk pengembangan (Auto Refresh)
echo ========================================
echo Login: kasir/kasir123 ^| admin/admin123
echo Press any key to close...
pause >nul
