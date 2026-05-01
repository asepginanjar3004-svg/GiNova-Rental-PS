<?php
/**
 * GINOVA - API Laporan Omzet Bulanan
 * Digunakan untuk grafik pada Admin Panel
 */

require_once __DIR__ . '/config.php';

// Pastikan hanya user terautentikasi yang bisa mengakses
// authCheck(); 

try {
    $db = getDB();

    /**
     * Query untuk mengambil data 12 bulan terakhir
     * Mengelompokkan berdasarkan bulan dan tahun
     */
    $sql = "SELECT 
                DATE_FORMAT(paid_at, '%Y-%m') as month_key,
                DATE_FORMAT(paid_at, '%M %Y') as month_label,
                SUM(total_price) as total_revenue,
                SUM(base_price + IFNULL(extended_amount, 0)) as ps_revenue,
                SUM(total_price - (base_price + IFNULL(extended_amount, 0))) as fnb_revenue,
                COUNT(id) as transaction_count
            FROM transactions 
            WHERE status = 'completed' 
              AND paid_at IS NOT NULL 
              AND paid_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY month_key
            ORDER BY month_key ASC";

    $stmt = $db->query($sql);
    $reports = $stmt->fetchAll();

    // Jika data kosong, berikan array kosong agar Chart.js tidak error
    if (!$reports) {
        $reports = [];
    }

    jsonResponse([
        'status' => 'success',
        'message' => 'Data laporan bulanan berhasil dimuat',
        'data' => $reports
    ]);

} catch (PDOException $e) {
    gn_log('Error in get_reports.php: ' . $e->getMessage());
    jsonResponse([
        'status' => 'error', 
        'message' => 'Gagal mengambil data laporan dari server.'
    ], 500);
}