<?php
// Aktifkan error reporting hanya untuk debugging di localhost
if ($_SERVER['REMOTE_ADDR'] === '127.0.0.1' || $_SERVER['REMOTE_ADDR'] === '::1') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

/**
 * GINOVA - Rental PS Management System
 * Database Configuration (MySQL)
 * 
 * Host: localhost
 * Database: ginova_rental_ps
 * Charset: utf8
 */

if ($_SERVER['REMOTE_ADDR'] === '127.0.0.1' || $_SERVER['REMOTE_ADDR'] === '::1') {
    // Konfigurasi LOKAL (XAMPP)
    define('DB_HOST', 'localhost');
    define('DB_USER', 'root');
    define('DB_PASS', '');
    define('DB_NAME', 'ginova_rental_ps');
} else {
    // Konfigurasi SERVER (Production)
    define('DB_HOST', 'localhost'); // Biasanya tetap localhost di cPanel
    define('DB_USER', 'ginova_user_prod'); 
    define('DB_PASS', 'password_produksi_anda');
    define('DB_NAME', 'ginova_rental_ps');
}
define('DB_CHARSET', 'utf8');

/**
 * Membuat koneksi PDO ke MySQL
 * @return PDO
 */
function getDB() {
    static $db = null;
    
    if ($db === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $db = new PDO($dsn, DB_USER, DB_PASS);
            $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $db->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            die(json_encode(['status' => 'error', 'message' => 'Koneksi Database Gagal: ' . $e->getMessage()]));
        }
    }
    
    return $db;
}

/**
 * Helper: Response JSON
 */
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    
    // Izinkan akses dari berbagai origin lokal untuk pengembangan
    header('Access-Control-Allow-Origin: *'); 
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json; charset=utf-8');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Helper: Cek autentikasi Bearer Token (untuk API)
 */
function authCheck() {
    // Fallback untuk getallheaders()
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    } else {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
    }
    $headers = array_change_key_case($headers, CASE_LOWER);
    $auth = isset($headers['authorization']) ? $headers['authorization'] : '';
    
    if (!preg_match('/Bearer\s+(\S+)/', $auth, $matches)) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    
    // TODO: Verifikasi token JWT atau session
    return $matches[1];
}

/**
 * Helper: Logging ke error_log PHP
 */
function gn_log(string $message, string $level = 'ERROR') {
    $timestamp = date('Y-m-d H:i:s');
    error_log("[GINOVA {$level}] {$timestamp} — {$message}");
}
