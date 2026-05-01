<?php
// Pastikan tidak ada output error PHP yang merusak JSON
error_reporting(0);
ini_set('display_errors', 0);

// Buffer output untuk menangkap output tak terduga
ob_start();

// Set header JSON sejak awal
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';

function tableExists(PDO $db, string $tableName): bool {
    $stmt = $db->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :table');
    $stmt->execute([':table' => $tableName]);
    return (int)$stmt->fetchColumn() > 0;
}

try {
    $db = getDB();
    $orderTable = tableExists($db, 'detail_order_fnb') ? 'detail_order_fnb' : 'transaction_items';

    $unitsSql = "SELECT
        c.id,
        c.name,
        c.type,
        c.status,
        COALESCE(t.id, '') AS transaction_id,
        COALESCE(t.customer_name, '') AS customer_name,
        COALESCE(t.start_time, '') AS start_time,
        COALESCE(t.end_time, '') AS end_time,
        COALESCE(t.base_price, 0) AS base_price,
        COALESCE(f.fnb_total, 0) AS fnb_total
    FROM consoles c
    LEFT JOIN transactions t ON t.console_id = c.id AND t.status = 'active'
    LEFT JOIN (
        SELECT transaction_id, SUM(price * qty) AS fnb_total
        FROM {$orderTable}
        WHERE status = 'active'
        GROUP BY transaction_id
    ) f ON f.transaction_id = t.id
    ORDER BY c.name";

    $stmt = $db->query($unitsSql);
    $units = $stmt->fetchAll();

    $fnbSql = "SELECT
        d.id,
        d.transaction_id,
        t.console_id,
        c.name AS console_name,
        t.customer_name,
        d.product_id,
        d.product_name,
        d.qty,
        d.price,
        (d.qty * d.price) AS total_price,
        d.status,
        d.created_at
    FROM {$orderTable} d
    INNER JOIN transactions t ON t.id = d.transaction_id AND t.status = 'active'
    LEFT JOIN consoles c ON c.id = t.console_id
    ORDER BY d.created_at DESC";

    $stmt = $db->query($fnbSql);
    $activeFnbOrders = $stmt->fetchAll();

$revenueSql = "SELECT
        COALESCE(SUM(t.total_price), 0) AS total_revenue,
        COALESCE(SUM(t.base_price + COALESCE(t.extended_amount, 0)), 0) AS rental_revenue,
        COUNT(*) AS today_transactions_count
    FROM transactions t
    WHERE t.status = 'completed'
      AND DATE(t.paid_at) = CURDATE()";

    $stmt = $db->query($revenueSql);
    $revenue = $stmt->fetch();

    $fnbRevenueSql = "SELECT
        COALESCE(SUM(CASE WHEN d.status = 'active' THEN d.qty * d.price ELSE 0 END), 0) AS fnb_revenue
    FROM {$orderTable} d
    INNER JOIN transactions t ON t.id = d.transaction_id AND t.status = 'completed'
    WHERE DATE(t.paid_at) = CURDATE()";

    $stmt = $db->query($fnbRevenueSql);
    $fnbRevenue = $stmt->fetchColumn();

    $todayTxCount = (int)$revenue['today_transactions_count'];

    jsonResponse([
        'status' => 'success',
        'data' => [
            'units' => $units,
            'active_fnb_orders' => $activeFnbOrders,
'revenue_today' => [
                'total' => (float)$revenue['total_revenue'],
                'rental' => (float)$revenue['rental_revenue'],
                'fnb' => (float)$fnbRevenue,
                'today_transactions_count' => $todayTxCount
            ],
            'today_transactions_count' => $todayTxCount
        ]
    ]);

} catch (PDOException $e) {
    gn_log('PDOException in get_dashboard: ' . $e->getMessage(), 'ERROR');
    ob_end_clean();
    jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
}
