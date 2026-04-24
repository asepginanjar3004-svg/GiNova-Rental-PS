<?php
/**
 * GINOVA - Test Koneksi Database MySQL
 * Jalankan di browser: http://localhost/rental-ps-dashboard/api/test_db.php
 */

require_once 'config.php';

try {
    $db = getDB();
    
    echo "<h2>✅ GiNova - Test Koneksi Database MySQL</h2>";
    echo "<hr>";
    
    // Test 1: Koneksi
    echo "<h3>1. Koneksi Database</h3>";
    echo "<p style='color:green'>✓ Koneksi ke database <strong>ginova_rental_ps</strong> berhasil!</p>";
    
    // Test 2: List Tabel
    echo "<h3>2. Daftar Tabel</h3>";
    $stmt = $db->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "<ul>";
    foreach ($tables as $table) {
        echo "<li>✓ $table</li>";
    }
    echo "</ul>";
    
    // Test 3: Data Users
    echo "<h3>3. Data Users (Login)</h3>";
    $stmt = $db->query("SELECT id, username, name, role FROM users");
    $users = $stmt->fetchAll();
    echo "<table border='1' cellpadding='8' style='border-collapse:collapse'>";
    echo "<tr style='background:#198754;color:white'><th>ID</th><th>Username</th><th>Nama</th><th>Role</th></tr>";
    foreach ($users as $user) {
        echo "<tr>";
        echo "<td>{$user['id']}</td>";
        echo "<td>{$user['username']}</td>";
        echo "<td>{$user['name']}</td>";
        echo "<td>{$user['role']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // Test 4: Data Consoles
    echo "<h3>4. Data Unit PS (Consoles)</h3>";
    $stmt = $db->query("SELECT id, name, type, status FROM consoles");
    $consoles = $stmt->fetchAll();
    echo "<table border='1' cellpadding='8' style='border-collapse:collapse'>";
    echo "<tr style='background:#198754;color:white'><th>ID</th><th>Nama</th><th>Tipe</th><th>Status</th></tr>";
    foreach ($consoles as $c) {
        $statusColor = $c['status'] === 'available' ? 'green' : 'orange';
        echo "<tr>";
        echo "<td>{$c['id']}</td>";
        echo "<td>{$c['name']}</td>";
        echo "<td>{$c['type']}</td>";
        echo "<td style='color:$statusColor;font-weight:bold'>{$c['status']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // Test 5: Data Packages
    echo "<h3>5. Data Paket Billing</h3>";
    $stmt = $db->query("SELECT name, duration, price, description FROM packages");
    $packages = $stmt->fetchAll();
    echo "<table border='1' cellpadding='8' style='border-collapse:collapse'>";
    echo "<tr style='background:#198754;color:white'><th>Nama Paket</th><th>Durasi</th><th>Harga</th><th>Deskripsi</th></tr>";
    foreach ($packages as $p) {
        $duration = $p['duration'] > 0 ? $p['duration'] . ' menit' : 'Reguler';
        echo "<tr>";
        echo "<td>{$p['name']}</td>";
        echo "<td>$duration</td>";
        echo "<td>Rp " . number_format($p['price'], 0, ',', '.') . "</td>";
        echo "<td>{$p['description']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // Test 6: Data Products
    echo "<h3>6. Data Produk F&B</h3>";
    $stmt = $db->query("SELECT name, category, stock, price FROM products");
    $products = $stmt->fetchAll();
    echo "<table border='1' cellpadding='8' style='border-collapse:collapse'>";
    echo "<tr style='background:#198754;color:white'><th>Nama</th><th>Kategori</th><th>Stok</th><th>Harga</th></tr>";
    foreach ($products as $p) {
        echo "<tr>";
        echo "<td>{$p['name']}</td>";
        echo "<td>{$p['category']}</td>";
        echo "<td>{$p['stock']}</td>";
        echo "<td>Rp " . number_format($p['price'], 0, ',', '.') . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    echo "<hr>";
    echo "<p style='color:green;font-size:18px'><strong>✅ Semua test berhasil! Database MySQL siap digunakan.</strong></p>";
    
} catch (Exception $e) {
    echo "<h2 style='color:red'>❌ Test Gagal</h2>";
    echo "<p>Error: " . $e->getMessage() . "</p>";
}

