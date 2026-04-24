<?php
/**
 * GINOVA - Rental PS Management System
 * Database Configuration (MySQL)
 * 
 * Host: localhost
 * Database: ginova_rental_ps
 * Charset: utf8
 */

define('DB_HOST', 'localhost');
define('DB_USER', 'GiNova');
define('DB_PASS', 'Cepot034');
define('DB_NAME', 'ginova_rental_ps');
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
            die(json_encode(['error' => 'Koneksi database gagal: ' . $e->getMessage()]));
        }
    }
    
    return $db;
}

/**
 * Helper: Response JSON
 */
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Helper: Cek autentikasi Bearer Token (untuk API)
 */
function authCheck() {
    $headers = getallheaders();
    $auth = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (!preg_match('/Bearer\s+(\S+)/', $auth, $matches)) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    
    // TODO: Verifikasi token JWT atau session
    return $matches[1];
}

