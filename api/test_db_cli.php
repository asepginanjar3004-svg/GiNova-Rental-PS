<?php
require_once 'config.php';

try {
    $db = getDB();
    
    echo "========================================\n";
    echo "  GINOVA - TEST DATABASE MYSQL\n";
    echo "========================================\n\n";
    
    echo "[OK] Koneksi ke database ginova_rental_ps berhasil!\n\n";
    
    echo "--- DAFTAR TABEL ---\n";
    $stmt = $db->query("SHOW TABLES");
    $i = 1;
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        echo "  $i. {$row[0]}\n";
        $i++;
    }
    
    echo "\n--- DATA USERS (Login) ---\n";
    $stmt = $db->query("SELECT id, username, name, role FROM users");
    while ($row = $stmt->fetch()) {
        echo "  ID:{$row['id']} | User:{$row['username']} | Nama:{$row['name']} | Role:{$row['role']}\n";
    }
    
    echo "\n--- DATA CONSOLES ---\n";
    $stmt = $db->query("SELECT id, name, type, status FROM consoles");
    while ($row = $stmt->fetch()) {
        echo "  {$row['id']} | {$row['name']} | {$row['type']} | {$row['status']}\n";
    }
    
    echo "\n--- DATA PACKAGES ---\n";
    $stmt = $db->query("SELECT name, duration, price FROM packages");
    while ($row = $stmt->fetch()) {
        $dur = $row['duration'] > 0 ? $row['duration'].' menit' : 'Reguler';
        echo "  {$row['name']} | Durasi:$dur | Harga:Rp " . number_format($row['price'],0,',','.') . "\n";
    }
    
    echo "\n--- DATA PRODUCTS ---\n";
    $stmt = $db->query("SELECT name, category, stock, price FROM products");
    while ($row = $stmt->fetch()) {
        echo "  {$row['name']} | {$row['category']} | Stok:{$row['stock']} | Harga:Rp " . number_format($row['price'],0,',','.') . "\n";
    }
    
    echo "\n========================================\n";
    echo "  SEMUA TEST BERHASIL! \n";
    echo "========================================\n";
    
} catch (Exception $e) {
    echo "[ERROR] " . $e->getMessage() . "\n";
}

