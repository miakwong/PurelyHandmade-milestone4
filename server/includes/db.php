<?php
/**
 * Database Connection
 * Handles connection to MySQL database
 */

require_once 'config.php';

/**
 * Get a database connection
 * @return mysqli The database connection
 */
function getConnection() {
    static $conn = null;
    
    // If connection already exists, return it
    if ($conn !== null) {
        return $conn;
    }
    
    // Create new connection
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    // Check connection
    if ($conn->connect_error) {
        error_log("Database Connection Failed: " . $conn->connect_error);
        die("Connection failed: " . $conn->connect_error);
    }
    
    // Set charset
    $conn->set_charset("utf8mb4");
    
    return $conn;
}

/**
 * Close the database connection
 */
function closeConnection() {
    global $conn;
    if ($conn) {
        $conn->close();
    }
}

/**
 * Execute a query and return the result
 * @param string $sql The SQL query
 * @param array $params Parameters for prepared statement
 * @param string $types Types of parameters (e.g., 'ssi' for string, string, int)
 * @return mysqli_result|bool Query result or false on failure
 */
function executeQuery($sql, $params = [], $types = "") {
    $conn = getConnection();
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        error_log("Query preparation failed: " . $conn->error);
        return false;
    }
    
    if (!empty($params)) {
        if (empty($types)) {
            // Auto-detect parameter types if not specified
            $types = str_repeat("s", count($params));
        }
        
        $stmt->bind_param($types, ...$params);
    }
    
    $result = $stmt->execute();
    
    if (!$result) {
        error_log("Query execution failed: " . $stmt->error);
        return false;
    }
    
    $result = $stmt->get_result();
    $stmt->close();
    
    return $result;
} 