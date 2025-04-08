<?php
/**
 * Application Configuration
 * 
 * Contains environment-specific configuration settings
 */

// Environment detection
$isProduction = (strpos($_SERVER['HTTP_HOST'] ?? '', 'cosc360.ok.ubc.ca') !== false);

// Base configuration settings
$config = [
    'production' => $isProduction,
    'base_url' => $isProduction ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade' : '',
    'site_name' => 'Purely Handmade',
    'debug' => !$isProduction,
    
    // File paths
    'server_root' => dirname(dirname(__FILE__)), // server directory
    'project_root' => dirname(dirname(dirname(__FILE__))), // project root
    'uploads_path' => dirname(dirname(__FILE__)) . '/uploads',
    'images_path' => dirname(dirname(__FILE__)) . '/uploads/images',
    
    // URLs
    'api_url' => $isProduction ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade/server/api' : '/server/api',
    'uploads_url' => $isProduction ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade/server/uploads' : '/server/uploads',
    'images_url' => $isProduction ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade/server/uploads/images' : '/server/uploads/images',
    'public_url' => $isProduction ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade/public' : '/public',
    
    // Data storage
    'data_path' => dirname(dirname(__FILE__)) . '/data',
    
    // Security
    'hash_cost' => 10,
    'session_name' => 'purely_handmade_session',
    'session_lifetime' => 60 * 60 * 24 // 24 hours
];

return $config; 