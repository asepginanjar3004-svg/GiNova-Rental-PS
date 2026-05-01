<?php
/**
 * GINOVA - Update Status API
 * Menangani update status transaksi (pembayaran, selesai, dll)
 * Digunakan oleh tombol "Bayar" dan "Selesai & Bayar"
 */

ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
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
    error_log("[GINOVA UPDATE {$level}] " . date('Y-m-d H:i:s') . " - {$msg}");
}

try {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    
    if (!is_array($input)) {
        jsonResp(['status' => 'error', 'message' => 'Invalid JSON payload'], 400);
    }
    
    $action = isset($input['action']) ? trim($input['action']) : '';
    
    // Validate required fields based on action
    if (!$action) {
        jsonResp(['status' => 'error', 'message' => 'Action is required'], 400);
    }
    
    $db = getDB();
    $db->beginTransaction();
    
    switch ($action) {
        // ============================================
        // ACTION: complete_payment (Bayar / Selesai & Bayar)
        // ============================================
        case 'complete_payment':
            $transactionId = isset($input['transaction_id']) ? trim($input['transaction_id']) : '';
            $paidAmount = isset($input['paid_amount']) ? floatval($input['paid_amount']) : 0;
            $changeAmount = isset($input['change_amount']) ? floatval($input['change_amount']) : 0;
            $paymentMethod = isset($input['payment_method']) ? trim($input['payment_method']) : 'cash';
            $totalPrice = isset($input['total_price']) ? floatval($input['total_price']) : 0;
            $paidAt = isset($input['paid_at']) ? trim($input['paid_at']) : date('Y-m-d H:i:s');
            
            if (!$transactionId) {
                jsonResp(['status' => 'error', 'message' => 'Transaction ID is required'], 400);
            }
            
            // Check if transaction exists
            $stmt = $db->prepare("SELECT id, status, console_id FROM transactions WHERE id = ?");
            $stmt->execute([$transactionId]);
            $transaction = $stmt->fetch();
            
            if (!$transaction) {
                jsonResp(['status' => 'error', 'message' => 'Transaction not found'], 404);
            }
            
            if ($transaction['status'] === 'completed') {
                jsonResp(['status' => 'error', 'message' => 'Transaction already completed'], 400);
            }
            
            // Update transaction with payment info
            $stmt = $db->prepare("
                UPDATE transactions 
                SET status = 'completed',
                    paid_amount = :paid_amount,
                    change_amount = :change_amount,
                    payment_method = :payment_method,
                    total_price = :total_price,
                    paid_at = :paid_at,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $transactionId,
                ':paid_amount' => $paidAmount,
                ':change_amount' => $changeAmount,
                ':payment_method' => $paymentMethod,
                ':total_price' => $totalPrice,
                ':paid_at' => $paidAt
            ]);
            
            // Update console status to available
            if ($transaction['console_id']) {
                $stmt = $db->prepare("
                    UPDATE consoles 
                    SET status = 'available', 
                        updated_at = NOW() 
                    WHERE id = :id
                ");
                $stmt->execute([':id' => $transaction['console_id']]);
            }
            
            gn_log("Payment completed for transaction: {$transactionId}, amount: {$paidAmount}", 'INFO');
            
            $db->commit();
            
            jsonResp([
                'status' => 'success',
                'message' => 'Pembayaran berhasil diselesaikan',
                'data' => [
                    'transaction_id' => $transactionId,
                    'paid_amount' => $paidAmount,
                    'change_amount' => $changeAmount,
                    'payment_method' => $paymentMethod,
                    'total_price' => $totalPrice,
                    'paid_at' => $paidAt
                ]
            ]);
            break;
            
        // ============================================
        // ACTION: cancel_transaction (Batal Transaksi)
        // ============================================
        case 'cancel_transaction':
            $transactionId = isset($input['transaction_id']) ? trim($input['transaction_id']) : '';
            $cancelReason = isset($input['reason']) ? trim($input['reason']) : '';
            
            if (!$transactionId) {
                jsonResp(['status' => 'error', 'message' => 'Transaction ID is required'], 400);
            }
            
            // Check transaction
            $stmt = $db->prepare("SELECT id, status, console_id FROM transactions WHERE id = ?");
            $stmt->execute([$transactionId]);
            $transaction = $stmt->fetch();
            
            if (!$transaction) {
                jsonResp(['status' => 'error', 'message' => 'Transaction not found'], 404);
            }
            
            // Update status to cancelled
            $stmt = $db->prepare("
                UPDATE transactions 
                SET status = 'cancelled',
                    updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$transactionId]);
            
            // Restore console to available if was busy
            if ($transaction['console_id']) {
                $stmt = $db->prepare("UPDATE consoles SET status = 'available' WHERE id = ?");
                $stmt->execute([$transaction['console_id']]);
            }
            
            // Restore F&B stock (void active items)
            $stmt = $db->prepare("
                UPDATE products p
                INNER JOIN transaction_items ti ON p.id = ti.product_id
                SET p.stock = p.stock + ti.qty
                WHERE ti.transaction_id = ? AND ti.status = 'active'
            ");
            $stmt->execute([$transactionId]);
            
            $db->commit();
            
            jsonResp([
                'status' => 'success',
                'message' => 'Transaksi dibatalkan',
                'data' => ['transaction_id' => $transactionId]
            ]);
            break;
            
        // ============================================
        // ACTION: extend_time (Perpanjang Waktu)
        // ============================================
        case 'extend_time':
            $transactionId = isset($input['transaction_id']) ? trim($input['transaction_id']) : '';
            $additionalMinutes = isset($input['additional_minutes']) ? intval($input['additional_minutes']) : 0;
            $additionalCost = isset($input['additional_cost']) ? floatval($input['additional_cost']) : 0;
            
            if (!$transactionId || $additionalMinutes <= 0) {
                jsonResp(['status' => 'error', 'message' => 'Transaction ID and additional minutes required'], 400);
            }
            
            // Get current transaction
            $stmt = $db->prepare("SELECT id, end_time, base_price, extended_amount FROM transactions WHERE id = ?");
            $stmt->execute([$transactionId]);
            $transaction = $stmt->fetch();
            
            if (!$transaction) {
                jsonResp(['status' => 'error', 'message' => 'Transaction not found'], 404);
            }
            
            // Calculate new end time
            $currentEnd = $transaction['end_time'] ? new DateTime($transaction['end_time']) : new DateTime();
            $currentEnd->add(new DateInterval("PT{$additionalMinutes}M"));
            $newEndTime = $currentEnd->format('Y-m-d H:i:s');
            
            // Update transaction
            $newBasePrice = floatval($transaction['base_price']) + $additionalCost;
            $newExtendedAmount = floatval($transaction['extended_amount']) + $additionalCost;
            
            $stmt = $db->prepare("
                UPDATE transactions 
                SET end_time = :end_time,
                    base_price = :base_price,
                    extended_amount = :extended_amount,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $transactionId,
                ':end_time' => $newEndTime,
                ':base_price' => $newBasePrice,
                ':extended_amount' => $newExtendedAmount
            ]);
            
            $db->commit();
            
            jsonResp([
                'status' => 'success',
                'message' => 'Waktu berhasil diperpanjang',
                'data' => [
                    'transaction_id' => $transactionId,
                    'new_end_time' => $newEndTime,
                    'additional_minutes' => $additionalMinutes,
                    'additional_cost' => $additionalCost
                ]
            ]);
            break;
            
        // ============================================
        // ACTION: void_item (Void F&B)
        // ============================================
        case 'void_item':
            $itemId = isset($input['item_id']) ? trim($input['item_id']) : '';
            $voidedBy = isset($input['voided_by']) ? trim($input['voided_by']) : null;
            
            if (!$itemId) {
                jsonResp(['status' => 'error', 'message' => 'Item ID is required'], 400);
            }
            
            // Get item and product
            $stmt = $db->prepare("
                SELECT ti.id, ti.product_id, ti.qty, ti.status
                FROM transaction_items ti
                WHERE ti.id = ?
            ");
            $stmt->execute([$itemId]);
            $item = $stmt->fetch();
            
            if (!$item) {
                jsonResp(['status' => 'error', 'message' => 'Item not found'], 404);
            }
            
            if ($item['status'] === 'void') {
                jsonResp(['status' => 'error', 'message' => 'Item already voided'], 400);
            }
            
            // Update item status to void
            $stmt = $db->prepare("
                UPDATE transaction_items 
                SET status = 'void',
                    voided_by = :voided_by,
                    voided_at = NOW()
                WHERE id = :id
            ");
            $stmt->execute([':id' => $itemId, ':voided_by' => $voidedBy]);
            
            // Restore stock
            $stmt = $db->prepare("UPDATE products SET stock = stock + :qty WHERE id = :id");
            $stmt->execute([':id' => $item['product_id'], ':qty' => $item['qty']]);
            
            $db->commit();
            
            jsonResp([
                'status' => 'success',
                'message' => 'Item berhasil di-void',
                'data' => ['item_id' => $itemId]
            ]);
            break;
            
        default:
            jsonResp(['status' => 'error', 'message' => 'Unknown action: ' . $action], 400);
    }
    
} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    gn_log("PDOException in update_status: " . $e->getMessage(), 'ERROR');
    jsonResp(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()], 500);
} catch (Throwable $e) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }
    gn_log("Throwable in update_status: " . $e->getMessage(), 'ERROR');
    jsonResp(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()], 500);
}
