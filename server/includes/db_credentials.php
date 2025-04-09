<?php
/**
 * Database Credentials
 * Direct definition of database connection settings
 */

// Set database connection constants
define('DB_HOST', 'localhost');
define('DB_USER', 'miakuang');
define('DB_PASS', 'miakuang');
define('DB_NAME', 'miakuang');
define('DB_PORT', '3306');
define('DB_SOCKET', '/opt/homebrew/var/mysql/mysql.sock'); // macOS Homebrew MySQL socket path
define('DB_CHARSET', 'utf8mb4');

// Password encryption settings
define('PASSWORD_COST', 10); // Default cost for password_hash 