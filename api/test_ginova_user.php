<?php
/**
 * Test koneksi dengan user GiNova
 */

require_once 'config.php';

try {
    $db = getDB();
    echo "<h2>✅ TEST USER GiNova - BERHASIL!</h2>";
    echo "<p>Username: GiNova</p>";
    echo "<p>Database: ginova_rental_ps</p>";
    echo "<p>Status: Koneksi berhasil!</p>";
    
    $stmt = $db->query("SELECT COUNT(*) as total FROM users");
    $result = $stmt->fetch();
    echo "<p>Total Users: {$result['total']}</p>";
    
} catch (Exception $e) {
    echo "<h2>❌ TEST GAGAL</h2>";
    echo "<p>Error: " . $e->getMessage() . "</p>";
}

