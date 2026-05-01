<?php
/**
 * GINOVA - Sync API
 * Menangani sinkronisasi pesanan F&B dari local storage ke server
 * also handles auto-sync when connection is available
 */

ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/config.php';

/**
 * jsonResponse helper
 */
function jsonResp($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Logging helper
 */
function gn_log($msg, $level = 'INFO') {
    error_log("[GINOVA SYNC {$level}] " . date('Y-m-d H:i:s') . " - {$msg}");
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $db = getDB();
    
    if ($method === 'GET') {
        // ============================================
        // GET: Check pending items (sync status)
        // ============================================
        
        // Check for unsynced F&B items
        $stmt = $db->prepare("
            SELECT ti.*, t.customer_name, t.console_id
            FROM transaction_items ti
            LEFT JOIN transactions t ON ti.transaction_id = t.id
            WHERE ti.is_synced = 0 AND ti.status = 'active'
            ORDER BY ti.created_at DESC
            LIMIT 50
        ");
        $stmt->execute();
        $pendingItems = $stmt->fetchAll();
        
        $count = count($pendingItems);
        
        jsonResp([
            'status' => 'success',
            'message' => $count . ' items pending sync',
            'data' => [
                'pending_count' => $count,
                'items' => $pendingItems,
                'server_time' => date('Y-m-d H:i:s')
            ]
        ]);
        
    } elseif ($method === 'POST') {
        // ============================================
        // POST: Sync one or multiple F&B orders
        // ============================================
        
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        if (!is_array($input)) {
            jsonResp(['status' => 'error', 'message' => 'Invalid JSON payload'], 400);
        }
        
        // Support single item or array of items
        $items = isset($input['items']) ? $input['items'] : [$input];
        $syncedResults = [];
        $failedResults = [];
        
        $db->beginTransaction();
        
        foreach ($items as $item) {
            try {
                $itemId = isset($item['item_id']) ? $item['item_id'] : null;
                $transactionId = isset($item['transaction_id']) ? $item['transaction_id'] : null;
                $productId = isset($item['product_id']) ? $item['product_id'] : null;
                $qty = isset($item['qty']) ? intval($item['qty']) : 1;
                
                // Validation
                if (!$transactionId || !$productId) {
                    $failedResults[] = ['item' => $item, 'error' => 'Missing required fields'];
                    continue;
                }
                
                // Get product info for price
                $stmt = $db->prepare("SELECT name, price, stock FROM products WHERE id = ?");
                $stmt->execute([$productId]);
                $product = $stmt->fetch();
                
                if (!$product) {
                    $failedResults[] = ['item' => $item, 'error' => 'Product not found'];
                    continue;
                }
                
                // Check stock
                if ($product['stock'] < $qty) {
                    $failedResults[] = [
                        'item' => $item, 
                        'error' => 'Insufficient stock', 
                        'available' => $product['stock']
                    ];
                    continue;
                }
                
                // Generate item ID if not provided
                if (!$itemId) {
                    $itemId = 'fnb_' . uniqid();
                }
                
                // Check if item already exists (for deduplication)
                $stmt = $db->prepare("SELECT id FROM transaction_items WHERE id = ?");
                $stmt->execute([$itemId]);
                $existing = $stmt->fetch();
                
                if ($existing) {
                    // Item alreadyexists, just mark as synced
                    $stmt = $db->prepare("
                        UPDATE transaction_items 
                        SET is_synced = 1, last_sync_at = NOW(), sync_attempts = sync_attempts + 1
                        WHERE id = ?
                    ");
                    $stmt->execute([$itemId]);
                } else {
                    // Insert new item
                    $stmt = $db->prepare("
                        INSERT INTO transaction_items 
                        (id, transaction_id, product_id, product_name, price, qty, status, is_synced, sync_attempts, last_sync_at, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'active', 1, 1, NOW(), NOW())
                    ");
                    $stmt->execute([
                        $itemId,
                        $transactionId,
                        $productId,
                        $product['name'],
                        $product['price'],
                        $qty
                    ]);
                }
                
                // Reduce stock
                $stmt = $db->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
                $stmt->execute([$qty, $productId]);
                
                $syncedResults[] = [
                    'item_id' => $itemId,
                    'transaction_id' => $transactionId,
                    'product_id' => $productId,
                    'status' => 'synced'
                ];
                
            } catch (Exception $e) {
                $failedResults[] = ['item' => $item, 'error' => $e->getMessage()];
                gn_log("Sync error for item: " . json_encode($item) . " - " . $e->getMessage(), 'ERROR');
            }
        }
        
        $db->commit();
        
        // Return results
        if (count($failedResults) > 0 && count($syncedResults) === 0) {
            jsonResp([
                'status' => 'error',
                'message' => 'Failed to sync all items',
                'data' => [
                    'synced' => $syncedResults,
                    'failed' => $failedResults
                ]
            ], 400);
        }
        
        jsonResp([
            'status' => 'success',
            'message' => count($syncedResults) . ' items synced successfully',
            'data' => [
                'synced' => $syncedResults,
                'failed' => $failedResults,
                'synced_at' => date('Y-m-d H:i:s')
            ]
        ]);
        
    } else {
        jsonResp(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
    
} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    gn_log("PDOException in sync: " . $e->getMessage(), 'ERROR');
    jsonResp(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()], 500);
} catch (Throwable $e) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }
    gn_log("Throwable in sync: " . $e->getMessage(), 'ERROR');
    jsonResp(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()], 500);
}
