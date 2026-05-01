<?php
/**
 * GINOVA - API Simpan Transaksi Final
 * Update status transaksi setelah pembayaran
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

$db = null;

try {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if (!is_array($input)) {
        ob_end_clean();
        jsonResponse(['status' => 'error', 'message' => 'Payload JSON tidak valid.'], 400);
    }

    $transactionId = isset($input['transaction_id']) ? trim($input['transaction_id']) : null;
    $paidAmount = isset($input['paid_amount']) ? (float)$input['paid_amount'] : 0;
    $changeAmount = isset($input['change_amount']) ? (float)$input['change_amount'] : 0;
    $paymentMethod = isset($input['payment_method']) ? trim($input['payment_method']) : 'cash';
    $totalPrice = isset($input['total_price']) ? (float)$input['total_price'] : 0;
    $status = isset($input['status']) ? trim($input['status']) : 'completed';
    $paidAt = isset($input['paid_at']) ? $input['paid_at'] : date('Y-m-d H:i:s');

    if (!$transactionId) {
        ob_end_clean();
        jsonResponse(['status' => 'error', 'message' => 'ID transaksi diperlukan.'], 400);
    }

    $db = getDB();

    $stmt = $db->prepare('
        UPDATE transactions 
        SET 
            status = :status,
            paid_amount = :paid_amount,
            change_amount = :change_amount,
            payment_method = :payment_method,
            total_price = :total_price,
            paid_at = :paid_at,
            updated_at = NOW()
        WHERE id = :id
    ');

    $stmt->execute([
        ':id' => $transactionId,
        ':status' => $status,
        ':paid_amount' => $paidAmount,
        ':change_amount' => $changeAmount,
        ':payment_method' => $paymentMethod,
        ':total_price' => $totalPrice,
        ':paid_at' => $paidAt
    ]);

    if ($stmt->rowCount() === 0) {
        ob_end_clean();
        jsonResponse(['status' => 'error', 'message' => 'Transaksi tidak ditemukan.'], 404);
    }

    // Update console status to available
    $stmt = $db->prepare('SELECT console_id FROM transactions WHERE id = :id');
    $stmt->execute([':id' => $transactionId]);
    $tx = $stmt->fetch();

    if ($tx && $tx['console_id']) {
        $stmt = $db->prepare('UPDATE consoles SET status = :status, updated_at = NOW() WHERE id = :id');
        $stmt->execute([':status' => 'available', ':id' => $tx['console_id']]);
    }

    ob_end_clean();
    jsonResponse([
        'status' => 'success',
        'message' => 'Transaksi berhasil diselesaikan',
        'data' => [
            'transaction_id' => $transactionId,
            'paid_amount' => $paidAmount,
            'change_amount' => $changeAmount,
            'payment_method' => $paymentMethod,
            'total_price' => $totalPrice
        ]
    ]);

} catch (PDOException $e) {
    if ($db !== null && $db->inTransaction()) {
        $db->rollBack();
    }
    gn_log('PDOException in save_transaction: ' . $e->getMessage(), 'ERROR');
    ob_end_clean();
    jsonResponse(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()], 500);
} catch (Throwable $e) {
    if ($db !== null && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }
    gn_log('Throwable in save_transaction: ' . $e->getMessage(), 'ERROR');
    ob_end_clean();
    jsonResponse(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()], 500);
}
