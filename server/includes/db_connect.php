<?php
/**
 * Database Connection
 * Creates a PDO connection to the MySQL database
 */

// Include database credentials
require_once __DIR__ . '/db_credentials.php';

try {
    // Set DSN (Data Source Name)
    $dsn = 'mysql:';
    
    // If socket connection is defined, use it
    if (defined('DB_SOCKET') && !empty(DB_SOCKET)) {
        $dsn .= "unix_socket=" . DB_SOCKET;
    } else {
        // Otherwise use standard TCP connection
        $dsn .= "host=" . DB_HOST;
        
        // Add port if specified
        if (defined('DB_PORT') && !empty(DB_PORT)) {
            $dsn .= ";port=" . DB_PORT;
        }
    }
    
    // Add database name
    $dsn .= ";dbname=" . DB_NAME;
    
    // Add charset
    if (defined('DB_CHARSET')) {
        $dsn .= ";charset=" . DB_CHARSET;
    } else {
        $dsn .= ";charset=utf8mb4";
    }
    
    // Create PDO connection
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ];
    
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    
    // Return the connection
    return $pdo;
} catch (PDOException $e) {
    // Log the error to a file rather than displaying it directly
    error_log('Database Connection Error: ' . $e->getMessage(), 0);
    
    // Return a user-friendly error
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed. Please try again later.']);
    exit;
} 