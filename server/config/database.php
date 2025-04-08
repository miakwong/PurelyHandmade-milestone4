<?php
/**
 * Database Configuration
 * 
 * For simplicity, we're using JSON files for data storage initially.
 * This can be extended to use MySQL or another database system.
 */

// Get global application config
$app_config = require_once __DIR__ . '/app.php';

// Create data directory if it doesn't exist
if (!file_exists($app_config['data_path'])) {
    mkdir($app_config['data_path'], 0755, true);
}

// Define data files
$config = [
    'use_json' => true, // Set to false to use MySQL
    
    // JSON file paths
    'json_path' => $app_config['data_path'],
    'files' => [
        'products' => $app_config['data_path'] . '/products.json',
        'categories' => $app_config['data_path'] . '/categories.json',
        'users' => $app_config['data_path'] . '/users.json',
        'carts' => $app_config['data_path'] . '/carts.json'
    ],
    
    // MySQL configuration (for future use)
    'mysql' => [
        'host' => 'localhost',
        'db' => 'purely_handmade',
        'user' => 'root',
        'pass' => '', // Update for production
        'charset' => 'utf8mb4',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    ]
];

return $config; 