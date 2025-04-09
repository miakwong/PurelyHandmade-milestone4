<?php
/**
 * Authentication API
 * Handles user registration, login, and logout
 */

ini_set('display_errors', 1); // 显示错误
ini_set('display_startup_errors', 1); // 显示启动错误
error_reporting(E_ALL); // 显示所有错误

// Ensure session is started
if (session_status() === PHP_SESSION_NONE) {
    try {
        session_start();
    } catch (Exception $e) {
        jsonResponse(false, 'Session start failed', null, 500);
        exit;
    }
}

// Log the session start
error_log("Session started", 0);

try {
    // Include necessary files
    // require_once '../includes/config.php';
    require_once '../includes/db.php';
    require_once '../includes/functions.php';
} catch (Exception $e) {
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

// Determine action based on request parameter
$action = $_GET['action'] ?? '';
error_log("Action received: " . $action, 0); // Debug action received

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
            jsonResponse(false, 'Invalid action', null, 400);
    }
} catch (Exception $e) {
    jsonResponse(false, 'Internal server error', null, 500);
}

/**
 * Handle user login
 */
function handleLogin() {
    // Only accept POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, 'Method not allowed', null, 405);
    }
    
    // Get JSON data
    try {
        $jsonInput = file_get_contents('php://input');
        error_log("Login Request: " . $jsonInput, 0); // Debug the incoming request
        $data = json_decode($jsonInput, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("JSON decode error: " . json_last_error_msg());
        }
    } catch (Exception $e) {
        jsonResponse(false, 'Invalid JSON input', null, 400);
    }
    
    // Validate input
    if (!isset($data['username']) || !isset($data['password'])) {
        jsonResponse(false, 'Username and password are required', null, 400);
    }
    
    try {
        $username = sanitize($data['username']);
        $password = $data['password'];
        
        // Debug the sanitized input
        error_log("Sanitized username: $username", 0);
        
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
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            // Debug user info
            error_log("Found user: " . print_r($user, true), 0);
            
            // Verify password
            if (password_verify($password, $user['password_hash'])) {
                // Set session variables
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['is_admin'] = $user['is_admin'] ? true : false;
                
                // Return success response
                jsonResponse(true, 'Login successful', [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'isAdmin' => $user['is_admin'] ? true : false
                ]);
            }
        }
        // Invalid credentials
        jsonResponse(false, 'Invalid username or password', null, 401);
    } catch (Exception $e) {
        jsonResponse(false, 'Login processing error', null, 500);
    }
}

/**
 * Handle user registration
 */
function handleRegister() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, 'Method not allowed', null, 405);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    error_log("Register Request Data: " . print_r($data, true), 0); // Debug the incoming registration data

    if (!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
        jsonResponse(false, 'Username, email, and password are required', null, 400);
    }

    $avatarBlob = null;
    if (!empty($data['avatar'])) {
        $avatarBlob = base64_decode($data['avatar']);
        if ($avatarBlob === false) {
            $avatarBlob = null;
        }
    }
    
    $username = sanitize($data['username']);
    $email = sanitize($data['email']);
    $password = $data['password'];
    $firstName = sanitize($data['firstName'] ?? '');
    $lastName = sanitize($data['lastName'] ?? '');
    $birthday = sanitize($data['birthday'] ?? null);
    $gender = sanitize($data['gender'] ?? null);
    $role = sanitize($data['role'] ?? 'user');
    
    // Debug sanitized input
    error_log("Sanitized data: username=$username, email=$email, role=$role", 0);
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, 'Invalid email format', null, 400);
    }

    if (strlen($password) < 6) {
        jsonResponse(false, 'Password must be at least 6 characters', null, 400);
    }

    $conn = getConnection();

    // Check if username or email exists
    $checkStmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $checkStmt->execute([$username, $email]);
    if ($checkStmt->fetch()) {
        jsonResponse(false, 'Username or email already exists', null, 409);
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT, ['cost' => PASSWORD_COST]);

    // Insert new user
    $insertStmt = $conn->prepare("INSERT INTO users (username, email, password_hash, first_name, last_name, avatar, birthday, gender, role)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if (!$insertStmt->execute([$username, $email, $passwordHash, $firstName, $lastName, $avatarBlob, $birthday, $gender, $role])) {
        jsonResponse(false, 'Registration failed', null, 500);
    }

    $userId = $conn->lastInsertId();

    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $username;
    $_SESSION['is_admin'] = false;

    jsonResponse(true, 'Registration successful', [
        'id' => $userId,
        'username' => $username
    ], 201);
}

