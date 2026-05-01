<?php
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['transaction_id'], $data['product_id'], $data['qty'])) {
    jsonResponse(['status' => 'error', 'message' => 'Data tidak lengkap'], 400);
}

try {
    $db = getDB();
    
    // 1. Cek stok produk
    $stmt = $db->prepare("SELECT name, stock, price FROM products WHERE id = ?");
    $stmt->execute([$data['product_id']]);
    $product = $stmt->fetch();

    if (!$product || $product['stock'] < $data['qty']) {
        jsonResponse(['status' => 'error', 'message' => 'Stok tidak mencukupi atau produk tidak ada'], 400);
    }

    // 2. Insert item (is_synced = 1 karena ini langsung masuk ke server)
    $itemId = uniqid('fnb_');
    $stmt = $db->prepare("INSERT INTO transaction_items (id, transaction_id, product_id, product_name, qty, price, status, is_synced, created_at) VALUES (?, ?, ?, ?, ?, ?, 'active', 1, NOW())");
    $stmt->execute([$itemId, $data['transaction_id'], $data['product_id'], $product['name'], $data['qty'], $product['price']]);

    // 3. Update Stok
    $stmt = $db->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
    $stmt->execute([$data['qty'], $data['product_id']]);

    jsonResponse([
        'status' => 'success', 
        'message' => 'F&B berhasil ditambahkan dan disinkronkan',
        'item_id' => $itemId
    ]);
} catch (Exception $e) {
    jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
}