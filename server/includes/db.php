<?php
//Database Connection
//Handles connection to MySQL database


require_once 'config.php';

//Get a database connection
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
        die("Database connection failed. Please try again later.");
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

// Fetch all rows from a quer
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