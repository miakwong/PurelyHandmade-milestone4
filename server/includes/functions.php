<?php
/**
 * Common Functions
 * 
 * Contains helper functions used throughout the application
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Load application configuration
$config = require_once __DIR__ . '/../config/app.php';
$db_config = require_once __DIR__ . '/../config/database.php';

/**
 * Return JSON response
 * 
 * @param array $data Data to return
 * @param int $status HTTP status code
 * @return void
 */
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

/**
 * Return error response
 * 
 * @param string $message Error message
 * @param int $status HTTP status code
 * @return void
 */
function errorResponse($message, $status = 400) {
    jsonResponse(['error' => $message], $status);
}

/**
 * Check if user is logged in
 * 
 * @return bool True if logged in
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

/**
 * Check if user is admin
 * 
 * @return bool True if admin
 */
function isAdmin() {
    return isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;
}

/**
 * Require user to be logged in
 * 
 * @return void
 */
function requireLogin() {
    if (!isLoggedIn()) {
        errorResponse('Authentication required', 401);
    }
}

/**
 * Require user to be admin
 * 
 * @return void
 */
function requireAdmin() {
    requireLogin();
    if (!isAdmin()) {
        errorResponse('Admin privileges required', 403);
    }
}

/**
 * Get current user ID
 * 
 * @return int|null User ID or null if not logged in
 */
function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get JSON data from request body
 * 
 * @return array Parsed JSON data
 */
function getJsonInput() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        errorResponse('Invalid JSON input', 400);
    }
    
    return $data;
}

/**
 * Sanitize input data
 * 
 * @param string $data Data to sanitize
 * @return string Sanitized data
 */
function sanitize($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

/**
 * Validate required fields
 * 
 * @param array $data Data to validate
 * @param array $fields Required fields
 * @return void
 */
function validateRequired($data, $fields) {
    foreach ($fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            errorResponse("Field '{$field}' is required", 400);
        }
    }
}

/**
 * Load data from JSON file
 * 
 * @param string $file JSON file path
 * @return array Data from file
 */
function loadJsonData($file) {
    if (!file_exists($file)) {
        return [];
    }
    
    $json = file_get_contents($file);
    $data = json_decode($json, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        errorResponse('Error reading data file', 500);
    }
    
    return $data;
}

/**
 * Save data to JSON file
 * 
 * @param string $file JSON file path
 * @param array $data Data to save
 * @return bool True if successful
 */
function saveJsonData($file, $data) {
    $json = json_encode($data, JSON_PRETTY_PRINT);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        return false;
    }
    
    return file_put_contents($file, $json) !== false;
}

/**
 * Generate a unique ID
 * 
 * @param array $existingIds Existing IDs to avoid
 * @return int New unique ID
 */
function generateId($existingIds) {
    if (empty($existingIds)) {
        return 1;
    }
    
    return max($existingIds) + 1;
}

/**
 * Get base URL
 * 
 * @return string Base URL
 */
function getBaseUrl() {
    global $config;
    return $config['base_url'];
}

/**
 * Get full URL for a path
 * 
 * @param string $path Path to append to base URL
 * @return string Full URL
 */
function url($path) {
    return rtrim(getBaseUrl(), '/') . '/' . ltrim($path, '/');
}

/**
 * Sanitize input data
 * @param string $data Data to sanitize
 * @return string Sanitized data
 */
function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

/**
 * Upload file to server
 * @param array $file File from $_FILES
 * @param string $destination Destination directory
 * @param array $allowedTypes Allowed MIME types
 * @param int $maxSize Maximum file size in bytes
 * @return string|false File path on success, false on failure
 */
function uploadFile($file, $destination, $allowedTypes = [], $maxSize = 2097152) {
    // Check for upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        error_log("File upload error: " . $file['error']);
        return false;
    }
    
    // Check file size
    if ($file['size'] > $maxSize) {
        error_log("File too large: " . $file['size']);
        return false;
    }
    
    // Check file type
    if (!empty($allowedTypes)) {
        $fileType = mime_content_type($file['tmp_name']);
        if (!in_array($fileType, $allowedTypes)) {
            error_log("Invalid file type: " . $fileType);
            return false;
        }
    }
    
    // Generate unique filename
    $filename = uniqid() . '_' . basename($file['name']);
    $targetPath = $destination . '/' . $filename;
    
    // Move file to destination
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        error_log("Failed to move uploaded file");
        return false;
    }
    
    return $filename;
} 