<?php
//Config file for db

// Environment Detection
$isProduction = (strpos($_SERVER['HTTP_HOST'] ?? '', 'cosc360.ok.ubc.ca') !== false);

// Database Configuration 
// In production, update these values accordingly
if (file_exists(__DIR__ . '/db_credentials.php')) {
    require_once __DIR__ . '/db_credentials.php';
} else {
    // Default database name
    define('DB_HOST', 'localhost');
    define('DB_NAME', 'miakuang');
    
    // Display warning about missing credentials file
    trigger_error('Database credentials file not found. Please create db_credentials.php', E_USER_NOTICE);
}


// Path Configuration
if ($isProduction) {
    define('BASE_URL', 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade');
} else {
    define('BASE_URL', '');  // Empty for local development with relative paths
}

define('SITE_ROOT', dirname(dirname(__FILE__))); 
define('PROJECT_ROOT', dirname(SITE_ROOT));     
define('UPLOAD_PATH', SITE_ROOT . '/uploads');
define('IMAGES_PATH', UPLOAD_PATH . '/images');
define('ASSETS_PATH', UPLOAD_PATH . '/assets');
define('API_PATH', '/api');

// Frontend paths
define('PUBLIC_URL', BASE_URL . '/public');
define('JS_URL', PUBLIC_URL . '/js');
define('CSS_URL', PUBLIC_URL . '/css');
define('VIEWS_URL', PUBLIC_URL . '/views');
define('UPLOADS_URL', BASE_URL . '/server/uploads');
define('IMAGES_URL', UPLOADS_URL . '/images');
define('ASSETS_URL', UPLOADS_URL . '/assets');
define('API_URL', BASE_URL . '/server/api');

// Session Configuration
define('SESSION_NAME', 'purely_handmade_session');
define('SESSION_LIFETIME', 60 * 60 * 24); // 24 hours
