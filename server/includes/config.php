<?php
/**
 * Configuration File
 * Contains all global configuration settings
 */

// Environment Detection
$isProduction = (strpos($_SERVER['HTTP_HOST'] ?? '', 'cosc360.ok.ubc.ca') !== false);

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root'); // Change in production
define('DB_PASS', '');     // Change in production
define('DB_NAME', 'purely_handmade');

// Path Configuration
if ($isProduction) {
    define('BASE_URL', 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade');
} else {
    define('BASE_URL', '');  // Empty for local development with relative paths
}

define('SITE_ROOT', dirname(dirname(__FILE__))); // Points to server directory
define('PROJECT_ROOT', dirname(SITE_ROOT));     // Points to project root
define('UPLOAD_PATH', SITE_ROOT . '/uploads');
define('IMAGES_PATH', UPLOAD_PATH . '/images');
define('API_PATH', '/api');

// Frontend paths
define('ASSETS_URL', BASE_URL . '/src/assets');
define('UPLOADS_URL', BASE_URL . '/server/uploads');
define('API_URL', BASE_URL . API_PATH);

// Session Configuration
define('SESSION_NAME', 'purely_handmade_session');
define('SESSION_LIFETIME', 60 * 60 * 24); // 24 hours

// Security Configuration
define('PASSWORD_COST', 12); // For password_hash 