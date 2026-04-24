<?php
/**
 * GINOVA - Security Audit & Penetration Testing
 * Memeriksa kerentanan umum pada aplikasi
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🔒 GINOVA SECURITY AUDIT REPORT</h1>";
echo "<hr>";

$issues = [];
$warnings = [];
$passed = [];

// ============================================
// 1. CEK KONFIGURASI DATABASE
// ============================================
echo "<h2>1. Database Configuration</h2>";

if (file_exists('../api/config.php')) {
    $config = file_get_contents('../api/config.php');
    
    // Cek password default/hardcoded
    if (strpos($config, "'bcava'") !== false || strpos($config, "'root'") !== false && strpos($config, "'GiNova'") === false) {
        $issues[] = "Password database masih menggunakan default (root/bcava)";
        echo "<p style='color:red'>❌ ISSUE: Password database masih default</p>";
    } else {
        $passed[] = "Password database sudah diubah dari default";
        echo "<p style='color:green'>✅ PASS: Password database sudah diubah</p>";
    }
    
    // Cek PDO prepared statements
    if (strpos($config, 'PDO::ATTR_EMULATE_PREPARES') !== false && strpos($config, 'false') !== false) {
        $passed[] = "PDO prepared statements dinonaktifkan (aman dari SQL injection)";
        echo "<p style='color:green'>✅ PASS: PDO prepared statements aktif</p>";
    } else {
        $warnings[] = "PDO prepared statements mungkin tidak dikonfigurasi dengan benar";
        echo "<p style='color:orange'>⚠️ WARNING: Cek konfigurasi PDO</p>";
    }
} else {
    $issues[] = "File config.php tidak ditemukan";
    echo "<p style='color:red'>❌ ISSUE: config.php tidak ditemukan</p>";
}

// ============================================
// 2. CEK AUTHENTICATION
// ============================================
echo "<h2>2. Authentication & Authorization</h2>";

$authFiles = ['../js/auth.js', '../index.html', '../dashboard.html', '../admin.html'];
foreach ($authFiles as $file) {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        
        // Cek Auth.protect
        if (strpos($content, 'Auth.protect') !== false) {
            $passed[] = basename($file) . " memiliki proteksi Auth";
            echo "<p style='color:green'>✅ PASS: " . basename($file) . " - Proteksi Auth ditemukan</p>";
        } else if ($file == '../index.html') {
            $passed[] = basename($file) . " adalah halaman login (tidak perlu proteksi)";
            echo "<p style='color:green'>✅ PASS: " . basename($file) . " - Halaman login</p>";
        } else {
            $issues[] = basename($file) . " TIDAK memiliki proteksi Auth";
            echo "<p style='color:red'>❌ ISSUE: " . basename($file) . " - Tidak ada proteksi!</p>";
        }
    } else {
        $issues[] = basename($file) . " tidak ditemukan";
        echo "<p style='color:red'>❌ ISSUE: " . basename($file) . " tidak ditemukan</p>";
    }
}

// ============================================
// 3. CEK LOCALSTORAGE SECURITY
// ============================================
echo "<h2>3. LocalStorage Security</h2>";

$appJs = file_get_contents('../js/app.js');
if (strpos($appJs, 'localStorage') !== false) {
    $warnings[] = "Aplikasi menggunakan LocalStorage - data tersimpan di client";
    echo "<p style='color:orange'>⚠️ WARNING: Menggunakan LocalStorage (data di client/browser)</p>";
    echo "<p><small>Rekomendasi: Untuk produksi, gunakan session storage atau backend database dengan enkripsi</small></p>";
} else {
    $passed[] = "Tidak menggunakan LocalStorage";
    echo "<p style='color:green'>✅ PASS: Tidak menggunakan LocalStorage</p>";
}

// Cek password plaintext di localStorage
if (strpos($appJs, "password: 'admin123'") !== false || strpos($appJs, "password: 'kasir123'") !== false) {
    $issues[] = "Password default plaintext ditemukan di app.js";
    echo "<p style='color:red'>❌ ISSUE: Password default plaintext di kode!</p>";
} else {
    $passed[] = "Tidak ada password plaintext di app.js";
    echo "<p style='color:green'>✅ PASS: Tidak ada password plaintext</p>";
}

// ============================================
// 4. CEK XSS VULNERABILITIES
// ============================================
echo "<h2>4. XSS (Cross-Site Scripting) Protection</h2>";

$dashboardJs = file_get_contents('../js/dashboard.js');
$adminJs = file_get_contents('../js/admin.js');

// Cek innerHTML usage (bisa XSS)
$xssPatterns = ['innerHTML', 'document.write', 'eval('];
$xssFound = false;
foreach ($xssPatterns as $pattern) {
    if (strpos($dashboardJs, $pattern) !== false || strpos($adminJs, $pattern) !== false) {
        $xssFound = true;
        break;
    }
}

if ($xssFound) {
    $warnings[] = "innerHTML digunakan - potensi XSS jika input tidak di-sanitize";
    echo "<p style='color:orange'>⚠️ WARNING: innerHTML digunakan. Pastikan semua input di-escape.</p>";
} else {
    $passed[] = "Tidak ada penggunaan innerHTML yang berbahaya";
    echo "<p style='color:green'>✅ PASS: Tidak ada innerHTML berbahaya</p>";
}

// ============================================
// 5. CEK HTTPS / SSL
// ============================================
echo "<h2>5. HTTPS / SSL</h2>";

if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    $passed[] = "HTTPS aktif";
    echo "<p style='color:green'>✅ PASS: HTTPS aktif</p>";
} else {
    $warnings[] = "HTTPS tidak aktif - data dikirim via HTTP (plaintext)";
    echo "<p style='color:orange'>⚠️ WARNING: HTTPS tidak aktif. Untuk produksi, gunakan SSL/TLS.</p>";
}

// ============================================
// 6. CEK FILE PERMISSIONS
// ============================================
echo "<h2>6. File Permissions</h2>";

$sensitiveFiles = [
    '../api/config.php',
    '../ginova_db.sql',
    '../create_user_ginova.sql',
    '../create_user_ginova_v2.sql'
];

foreach ($sensitiveFiles as $file) {
    if (file_exists($file)) {
        $perms = fileperms($file);
        $permString = substr(sprintf('%o', $perms), -4);
        
        if ($perms & 0x0004 || $perms & 0x0002) { // World readable/writable
            $warnings[] = basename($file) . " bisa diakses publik (chmod $permString)";
            echo "<p style='color:orange'>⚠️ WARNING: " . basename($file) . " chmod $permString - bisa diakses publik</p>";
        } else {
            $passed[] = basename($file) . " permission aman";
            echo "<p style='color:green'>✅ PASS: " . basename($file) . " permission aman ($permString)</p>";
        }
    }
}

// ============================================
// 7. CEK DIRECT ACCESS PROTECTION
// ============================================
echo "<h2>7. Direct Access Protection</h2>";

$htaccess = '../.htaccess';
if (file_exists($htaccess)) {
    $passed[] = "File .htaccess ditemukan";
    echo "<p style='color:green'>✅ PASS: .htaccess ditemukan</p>";
} else {
    $warnings[] = "File .htaccess tidak ditemukan - direktori bisa di-listing";
    echo "<p style='color:orange'>⚠️ WARNING: .htaccess tidak ditemukan. Buat file .htaccess untuk mencegah directory listing.</p>";
}

// ============================================
// 8. CEK SQL INJECTION PADA PHP FILES
// ============================================
echo "<h2>8. SQL Injection Prevention</h2>";

$phpFiles = glob('../api/*.php');
$sqlInjectionRisk = false;
foreach ($phpFiles as $phpFile) {
    $content = file_get_contents($phpFile);
    // Cek penggunaan query langsung tanpa prepare
    if (preg_match('/mysql_query\s*\(/i', $content) || preg_match('/mysqli_query\s*\(/i', $content)) {
        $sqlInjectionRisk = true;
        echo "<p style='color:orange'>⚠️ WARNING: " . basename($phpFile) . " menggunakan query langsung</p>";
    }
}

if (!$sqlInjectionRisk) {
    $passed[] = "Tidak ditemukan SQL injection risk pada PHP files";
    echo "<p style='color:green'>✅ PASS: Tidak ada SQL injection risk terdeteksi</p>";
}

// ============================================
// SUMMARY
// ============================================
echo "<hr><h2>📊 RINGKASAN AUDIT</h2>";

echo "<h3 style='color:green'>✅ Passed (" . count($passed) . ")</h3>";
foreach ($passed as $pass) {
    echo "<p style='color:green'>✓ $pass</p>";
}

echo "<h3 style='color:orange'>⚠️ Warnings (" . count($warnings) . ")</h3>";
foreach ($warnings as $warning) {
    echo "<p style='color:orange'>⚠ $warning</p>";
}

echo "<h3 style='color:red'>❌ Issues (" . count($issues) . ")</h3>";
foreach ($issues as $issue) {
    echo "<p style='color:red'>❌ $issue</p>";
}

echo "<hr>";
$total = count($passed) + count($warnings) + count($issues);
$score = round((count($passed) / $total) * 100);
echo "<h2>Security Score: $score%</h2>";

if (count($issues) == 0) {
    echo "<p style='color:green;font-size:20px'><strong>🛡️ Sistem relatif aman. Tidak ada issue kritis!</strong></p>";
} else {
    echo "<p style='color:red;font-size:20px'><strong>⚠️ Perhatian! Ada " . count($issues) . " issue yang perlu diperbaiki.</strong></p>";
}

// Rekomendasi
echo "<h2>📝 Rekomendasi Keamanan</h2>";
echo "<ol>";
echo "<li>Gunakan HTTPS/SSL untuk enkripsi data</li>";
echo "<li>Tambahkan file .htaccess untuk mencegah directory listing</li>";
echo "<li>Implementasi CSRF token untuk form submissions</li>";
echo "<li>Enkripsi data sensitif di LocalStorage</li>";
echo "<li>Rate limiting untuk login attempts</li>";
echo "<li>Validasi input di server-side (PHP)</li>";
echo "<li>Update password secara berkala</li>";
echo "</ol>";


