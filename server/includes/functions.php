<?php
//Common Functions
//Contains helper functions


// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// application configuration
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

// jsonResponse function
function jsonResponse($success, $message, $data = null, $status = 200) {
    http_response_code((int)$status);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

// errorResponse function
function errorResponse($message, $status = 400) {
    jsonResponse(['error' => $message], $status);
}

// login status check function
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

// admin status check function
function isAdmin() {
    return isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;
}

// require for login function
function requireLogin() {
    if (!isLoggedIn()) {
        errorResponse('Authentication required', 401);
    }
}

//admin requirement function
function requireAdmin() {
    requireLogin();
    if (!isAdmin()) {
        errorResponse('Admin privileges required', 403);
    }
}

// get current user ID function
function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

// json input function
function getJsonInput() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        errorResponse('Invalid JSON input', 400);
    }

    return $data;
}

//sanitize input function
function sanitize($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

//vlidate required fields function
function validateRequired($data, $fields) {
    foreach ($fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            errorResponse("Field '{$field}' is required", 400);
        }
    }
}

//load json data function
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

//save json data function
function saveJsonData($file, $data) {
    $json = json_encode($data, JSON_PRETTY_PRINT);

    if (json_last_error() !== JSON_ERROR_NONE) {
        return false;
    }

    return file_put_contents($file, $json) !== false;
}

//generate unique ID function
function generateId($existingIds) {
    if (empty($existingIds)) {
        return 1;
    }

    return max($existingIds) + 1;
}

//return base URL
function getBaseUrl() {
    return BASE_URL;
}

//Get full URL for a path

function url($path) {
    return rtrim(getBaseUrl(), '/') . '/' . ltrim($path, '/');
}

//Upload file to server

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

//check auth function
function checkAuth() {
    if (!isLoggedIn()) {
        jsonResponse(['error' => 'Authentication required'], 401);
    }
}

//check admin function
function checkAdmin() {
    if (!isAdmin()) {
        jsonResponse(['error' => 'Admin privileges required'], 403);
    }
}