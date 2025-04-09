<?php
/**
 * Database connection handler
 */

// Load database configuration parameters
if (file_exists(__DIR__ . '/../includes/db_credentials.php')) {
    require_once __DIR__ . '/../includes/db_credentials.php';
} else {
    die("Error: Database credentials file not found. Please create server/includes/db_credentials.php.");
}

/**
 * Get database connection
 * 
 * @return PDO Database connection object
 */
function getDbConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        // Log detailed error but return generic message to user
        error_log("Database Connection Error: " . $e->getMessage());
        throw new Exception("Database connection failed. Please try again later.");
    }
}

// Get global application config
$app_config = require_once __DIR__ . '/app.php';

// Create data directory if it doesn't exist
if (!file_exists($app_config['data_path'])) {
    mkdir($app_config['data_path'], 0755, true);
}

// Define data files
$config = [
    'use_json' => false, // Use MySQL instead of JSON files
    
    // JSON file paths (for backup or initial data only)
    'json_path' => $app_config['data_path'],
    'files' => [
        'products' => $app_config['data_path'] . '/products.json',
        'categories' => $app_config['data_path'] . '/categories.json',
        'users' => $app_config['data_path'] . '/users.json',
        'carts' => $app_config['data_path'] . '/carts.json'
    ]
];

return $config; 