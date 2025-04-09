<?php
/**
 * Database Connection
 * Handles connection to MySQL database
 */

require_once 'config.php';

/**
 * Get a database connection
 * @return PDO The database connection
 */
function getConnection() {
    static $pdo = null;
    
    // If connection already exists, return it
    if ($pdo !== null) {
        return $pdo;
    }
    
    try {
        // Create DSN
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        
        // Create new connection
        $pdo = new PDO($dsn, DB_USER, DB_PASS, DB_OPTIONS);
        
        return $pdo;
    } catch (PDOException $e) {
        // Log the error but don't expose details to user
        error_log("Database Connection Failed: " . $e->getMessage());
        die("Database connection failed. Please try again later.");
    }
}

/**
 * Close the database connection
 */
function closeConnection() {
    // PDO handles closing connections automatically
    // This function remains for compatibility
    return true;
}

/**
 * Execute a query and return the result
 * @param string $sql The SQL query
 * @param array $params Parameters for prepared statement
 * @param string $types Types of parameters (optional, for compatibility)
 * @return mixed PDOStatement object or false on failure
 */
function executeQuery($sql, $params = [], $types = "") {
    $pdo = getConnection();
    
    try {
        $stmt = $pdo->prepare($sql);
        
        // Execute with parameters
        if (!empty($params)) {
            $stmt->execute($params);
        } else {
            $stmt->execute();
        }
        
        return $stmt;
    } catch (PDOException $e) {
        error_log("Query execution failed: " . $e->getMessage());
        return false;
    }
}

/**
 * Execute a query and fetch all results
 * @param string $sql The SQL query
 * @param array $params Parameters for prepared statement
 * @return array|false Array of results or false on failure
 */
function fetchAll($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    
    if ($stmt) {
        return $stmt->fetchAll();
    }
    
    return false;
}

/**
 * Execute a query and fetch a single row
 * @param string $sql The SQL query
 * @param array $params Parameters for prepared statement
 * @return array|false Single row or false on failure
 */
function fetchOne($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    
    if ($stmt) {
        return $stmt->fetch();
    }
    
    return false;
}

/**
 * Execute an INSERT, UPDATE or DELETE query and return affected rows
 * @param string $sql The SQL query
 * @param array $params Parameters for prepared statement
 * @return int|false Number of affected rows or false on failure
 */
function executeNonQuery($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    
    if ($stmt) {
        return $stmt->rowCount();
    }
    
    return false;
}

/**
 * Get the ID of the last inserted row
 * @return string|false Last inserted ID or false on failure
 */
function getLastInsertId() {
    $pdo = getConnection();
    return $pdo->lastInsertId();
} 