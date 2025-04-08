<?php
/**
 * Helper Functions
 * Contains utility functions used throughout the application
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_start();
}

/**
 * Check if user is logged in
 * @return bool True if user is logged in, false otherwise
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

/**
 * Check if user is admin
 * @return bool True if user is admin, false otherwise
 */
function isAdmin() {
    return isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;
}

/**
 * Check if user is authenticated
 * Redirects to login page if not authenticated
 */
function checkAuth() {
    if (!isLoggedIn()) {
        header('HTTP/1.1 401 Unauthorized');
        exit('Not authorized');
    }
}

/**
 * Check if user is admin
 * Redirects with error if not admin
 */
function checkAdmin() {
    if (!isAdmin()) {
        header('HTTP/1.1 403 Forbidden');
        exit('Admin access required');
    }
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
 * Generate JSON response
 * @param bool $success Whether the request was successful
 * @param string $message Message to include in response
 * @param mixed $data Data to include in response
 * @param int $status HTTP status code
 */
function jsonResponse($success, $message = '', $data = null, $status = 200) {
    header('Content-Type: application/json');
    http_response_code($status);
    
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit;
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