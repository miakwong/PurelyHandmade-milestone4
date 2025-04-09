<?php
/**
 * Authentication API
 * Handles user registration, login, and logout
 */



// Create a custom error log function
function authErrorLog($message, $level = 'ERROR') {
    $logPath = __DIR__ . '/../logs/auth_errors.log';
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] [$level] $message" . PHP_EOL;
    
    // Append to log file (create if doesn't exist)
    file_put_contents($logPath, $logMessage, FILE_APPEND);
}

// Log the start of execution
authErrorLog("Auth API call started. Action: " . ($_GET['action'] ?? 'none'), 'INFO');

// Set up custom error handler
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    $errorType = match($errno) {
        E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR => 'FATAL',
        E_WARNING, E_CORE_WARNING, E_COMPILE_WARNING, E_USER_WARNING => 'WARNING',
        E_NOTICE, E_USER_NOTICE => 'NOTICE',
        default => 'UNKNOWN'
    };
    
    authErrorLog("PHP $errorType: $errstr in $errfile on line $errline", $errorType);
    
    // Don't execute PHP's internal error handler
    return true;
});

// Register shutdown function to catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR])) {
        authErrorLog("FATAL ERROR: {$error['message']} in {$error['file']} on line {$error['line']}", 'FATAL');
    }
    authErrorLog("Auth API call completed", 'INFO');
});

// Ensure session is started
if (session_status() === PHP_SESSION_NONE) {
    try {
        session_start();
        authErrorLog("Session started successfully", 'INFO');
    } catch (Exception $e) {
        authErrorLog("Session start failed: " . $e->getMessage(), 'ERROR');
    }
}

try {
    authErrorLog("Loading required files", 'INFO');
    require_once '../includes/config.php';
    require_once '../includes/db.php';
    require_once '../includes/functions.php';
    authErrorLog("Required files loaded successfully", 'INFO');
} catch (Exception $e) {
    authErrorLog("Failed to load required files: " . $e->getMessage(), 'ERROR');
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Failed to load required files']);
    exit;
}

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Custom response function with logging
function customJsonResponse($success, $message, $data = null, $status = 200) {
    authErrorLog("Sending response: success=$success, message=$message, status=$status", 'INFO');
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

// Determine action based on request parameter
$action = $_GET['action'] ?? '';
authErrorLog("Processing action: $action", 'INFO');

try {
    switch ($action) {
        case 'login':
            handleLogin();
            break;
            
        case 'register':
            handleRegister();
            break;
            
        case 'logout':
            handleLogout();
            break;
            
        case 'status':
            handleStatus();
            break;
            
        default:
            customJsonResponse(false, 'Invalid action', null, 400);
    }
} catch (Exception $e) {
    authErrorLog("Exception in main handler: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'ERROR');
    customJsonResponse(false, 'Internal server error', null, 500);
}

/**
 * Handle user login
 */
function handleLogin() {
    authErrorLog("Login handler started", 'INFO');
    
    // Only accept POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        customJsonResponse(false, 'Method not allowed', null, 405);
    }
    
    // Get JSON data
    try {
        $jsonInput = file_get_contents('php://input');
        authErrorLog("Received JSON: $jsonInput", 'DEBUG');
        $data = json_decode($jsonInput, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("JSON decode error: " . json_last_error_msg());
        }
    } catch (Exception $e) {
        authErrorLog("JSON parsing error: " . $e->getMessage(), 'ERROR');
        customJsonResponse(false, 'Invalid JSON input', null, 400);
    }
    
    // Validate input
    if (!isset($data['username']) || !isset($data['password'])) {
        customJsonResponse(false, 'Username and password are required', null, 400);
    }
    
    try {
        $username = sanitize($data['username']);
        $password = $data['password'];
        
        // Check if username is an email
        $isEmail = filter_var($username, FILTER_VALIDATE_EMAIL);
        
        // Prepare query based on whether username is an email
        if ($isEmail) {
            $sql = "SELECT id, username, password_hash, is_admin FROM users WHERE email = ? AND is_active = TRUE";
        } else {
            $sql = "SELECT id, username, password_hash, is_admin FROM users WHERE username = ? AND is_active = TRUE";
        }
        
        // Execute query
        $conn = getConnection();
        authErrorLog("Database connection established", 'INFO');
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($user = $result->fetch_assoc()) {
            // Verify password
            if (password_verify($password, $user['password_hash'])) {
                // Set session variables
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['is_admin'] = $user['is_admin'] ? true : false;
                
                authErrorLog("User {$user['username']} logged in successfully", 'INFO');
                
                // Return success response
                customJsonResponse(true, 'Login successful', [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'isAdmin' => $user['is_admin'] ? true : false
                ]);
            }
        }
        
        authErrorLog("Login failed for username: $username", 'WARN');
        // Invalid credentials
        customJsonResponse(false, 'Invalid username or password', null, 401);
    } catch (Exception $e) {
        authErrorLog("Login exception: " . $e->getMessage(), 'ERROR');
        customJsonResponse(false, 'Login processing error', null, 500);
    }
}

/**
 * Handle user registration
 */
function handleRegister() {
    authErrorLog("Registration handler started", 'INFO');
    // Only accept POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        customJsonResponse(false, 'Method not allowed', null, 405);
    }
    
    // Get JSON data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
        customJsonResponse(false, 'Username, email, and password are required', null, 400);
    }
    
    $username = sanitize($data['username']);
    $email = sanitize($data['email']);
    $password = $data['password'];
    $firstName = sanitize($data['firstName'] ?? '');
    $lastName = sanitize($data['lastName'] ?? '');
    
    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        customJsonResponse(false, 'Invalid email format', null, 400);
    }
    
    // Validate password length
    if (strlen($password) < 6) {
        customJsonResponse(false, 'Password must be at least 6 characters', null, 400);
    }
    
    // Check if username or email already exists
    $conn = getConnection();
    $sql = "SELECT id FROM users WHERE username = ? OR email = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $username, $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        customJsonResponse(false, 'Username or email already exists', null, 409);
    }
    
    // Hash password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT, ['cost' => PASSWORD_COST]);
    
    // Insert new user
    $sql = "INSERT INTO users (username, email, password_hash, first_name, last_name) 
            VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssss", $username, $email, $passwordHash, $firstName, $lastName);
    
    if ($stmt->execute()) {
        $userId = $conn->insert_id;
        
        // Set session variables
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['is_admin'] = false;
        
        customJsonResponse(true, 'Registration successful', [
            'id' => $userId,
            'username' => $username
        ]);
    } else {
        customJsonResponse(false, 'Registration failed', null, 500);
    }
}

/**
 * Handle user logout
 */
function handleLogout() {
    authErrorLog("Logout handler started", 'INFO');
    
    // Clear session
    try {
        session_unset();
        session_destroy();
        authErrorLog("Session destroyed successfully", 'INFO');
    } catch (Exception $e) {
        authErrorLog("Session destruction error: " . $e->getMessage(), 'ERROR');
    }
    
    customJsonResponse(true, 'Logout successful', null);
}

/**
 * Handle user status check
 */
function handleStatus() {
    authErrorLog("Status check handler started", 'INFO');
    
    try {
        // Validate session data exists
        authErrorLog("Session data: " . json_encode($_SESSION), 'DEBUG');
        
        if (isset($_SESSION['user_id'])) {
            authErrorLog("User is logged in: {$_SESSION['username']}", 'INFO');
            customJsonResponse(true, 'User is logged in', [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'isAdmin' => $_SESSION['is_admin'] ?? false
            ]);
        } else {
            authErrorLog("User is not logged in", 'INFO');
            customJsonResponse(false, 'User is not logged in', null, 401);
        }
    } catch (Exception $e) {
        authErrorLog("Status check exception: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'ERROR');
        customJsonResponse(false, 'Error checking login status', null, 500);
    }
} 