<?php
/**
 * GINOVA - Database Connection Test
 * Test koneksi dan struktur database
 */

require_once 'config.php';

echo "========================================\n";
echo "GINOVA RENTAL PS - DATABASE TEST\n";
echo "========================================\n\n";

try {
    $db = getDB();
    echo "✅ Koneksi database berhasil!\n\n";

    // Test query sederhana
    $stmt = $db->query("SELECT VERSION() as version");
    $result = $stmt->fetch();
    echo "📊 MySQL Version: " . $result['version'] . "\n\n";

    // Cek tabel-tabel
    echo "📋 Cek Tabel Database:\n";
    $tables = ['users', 'consoles', 'packages', 'products', 'transactions', 'transaction_items'];

    foreach ($tables as $table) {
        $stmt = $db->query("SELECT COUNT(*) as count FROM `$table`");
        $result = $stmt->fetch();
        $status = $result['count'] > 0 ? '✅' : '⚠️';
        echo "  $status $table: {$result['count']} records\n";
    }

    echo "\n🔍 Data Sample:\n";

    // Users
    $stmt = $db->query("SELECT name, username, role FROM users LIMIT 2");
    echo "👥 Users:\n";
    while ($row = $stmt->fetch()) {
        echo "  - {$row['name']} ({$row['username']}) - {$row['role']}\n";
    }

    // Consoles
    $stmt = $db->query("SELECT name, type, status FROM consoles LIMIT 3");
    echo "\n🕹️ Consoles:\n";
    while ($row = $stmt->fetch()) {
        echo "  - {$row['name']} ({$row['type']}) - {$row['status']}\n";
    }

    // Products
    $stmt = $db->query("SELECT name, category, stock FROM products LIMIT 3");
    echo "\n🍔 Products:\n";
    while ($row = $stmt->fetch()) {
        echo "  - {$row['name']} ({$row['category']}) - Stock: {$row['stock']}\n";
    }

    echo "\n========================================\n";
    echo "🎉 DATABASE TEST SELESAI - READY TO USE!\n";
    echo "========================================\n";

    echo "\n📝 Next Steps:\n";
    echo "1. Akses index.html untuk login\n";
    echo "2. Default login: admin/admin123 atau kasir/kasir123\n";
    echo "3. Setup lengkap! 🚀\n";

} catch (PDOException $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n\n";
    echo "🔧 Troubleshooting:\n";
    echo "1. Cek kredensial di config.php\n";
    echo "2. Pastikan database 'ginova_rental_ps' ada\n";
    echo "3. Pastikan user 'ginova_user' punya privileges\n";
    echo "4. Jalankan import_db.bat jika belum\n";
}
?>