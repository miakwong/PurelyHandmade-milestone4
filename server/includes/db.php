<?php
//Database Connection
//Handles connection to MySQL database

require_once 'db_credentials.php';
require_once 'config.php';

//Get a database connection
function getConnection() {
    static $pdo = null;

    // If connection already exists, return it
    if ($pdo !== null) {
        return $pdo;
    }

    try {
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ];

        // Force TCP connection for server environment
        $dsn = "mysql:host=" . DB_HOST;
        if (defined('DB_PORT') && !empty(DB_PORT)) {
            $dsn .= ";port=" . DB_PORT;
        }

        // Create initial connection
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);

        // Select database
        $pdo->exec("USE " . DB_NAME);

        return $pdo;
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        return false;
    }
}

//Close the db connection
function closeConnection() {
    return true;
}

//Execute a query and return the result
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

// Fetch all rows from a query
function fetchAll($sql, $params = []) {
    $stmt = executeQuery($sql, $params);

    if ($stmt) {
        return $stmt->fetchAll();
    }

    return false;
}

// Fetch a single row from a query
function fetchOne($sql, $params = []) {
    $stmt = executeQuery($sql, $params);

    if ($stmt) {
        return $stmt->fetch();
    }

    return false;
}

// Execute a non-query (INSERT, UPDATE, DELETE)
function executeNonQuery($sql, $params = []) {
    $stmt = executeQuery($sql, $params);

    if ($stmt) {
        return $stmt->rowCount();
    }

    return false;
}

// Get the last inserted ID
function getLastInsertId() {
    $pdo = getConnection();
    return $pdo->lastInsertId();
}