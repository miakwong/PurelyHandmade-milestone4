<?php
/**
 * Authentication API
 * Handles user registration, login, and logout
 */

// Enable error reporting and logging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Set error logging
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../logs/php_errors.log');

// Ensure session is started
if (session_status() === PHP_SESSION_NONE) {
    try {
        session_start();
        error_log("Session started successfully");
    } catch (Exception $e) {
        error_log("Session start failed: " . $e->getMessage());
        jsonResponse(false, 'Session start failed', null, 500);
        exit;
    }
}

// Log the session start
error_log("Session started", 0);

try {
    // Include necessary files
    require_once __DIR__ . '/../includes/db_credentials.php';
    require_once __DIR__ . '/../includes/db.php';
    require_once __DIR__ . '/../includes/functions.php';
    
    error_log("Required files loaded successfully");
} catch (Exception $e) {
    error_log("Failed to load required files: " . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Failed to load required files: ' . $e->getMessage()]);
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
            error_log("Invalid action: " . $action);
            jsonResponse(false, 'Invalid action', null, 400);
    }
} catch (Exception $e) {
    error_log("Unhandled exception: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    jsonResponse(false, 'Internal server error: ' . $e->getMessage(), null, 500);
}

/**
 * Handle user login
 */
function handleLogin() {
    // Only accept POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        error_log("Invalid request method for login: " . $_SERVER['REQUEST_METHOD']);
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
        error_log("JSON decode error: " . $e->getMessage());
        jsonResponse(false, 'Invalid JSON input', null, 400);
    }
    
    // Validate input
    if (!isset($data['username']) || !isset($data['password'])) {
        error_log("Missing username or password in login request");
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
            $sql = "SELECT id, username, password, role FROM users WHERE email = ?";
        } else {
            $sql = "SELECT id, username, password, role FROM users WHERE username = ?";
        }
        
        // Execute query using PDO
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in login");
            jsonResponse(false, 'Database connection failed', null, 500);
            return;
        }

        error_log("Executing SQL: " . $sql . " with parameter: " . $username);
        
        $stmt = $pdo->prepare($sql);
        if (!$stmt) {
            error_log("Failed to prepare statement: " . print_r($pdo->errorInfo(), true));
            jsonResponse(false, 'Failed to prepare statement', null, 500);
            return;
        }

        if (!$stmt->execute([$username])) {
            error_log("Failed to execute query: " . print_r($stmt->errorInfo(), true));
            jsonResponse(false, 'Failed to execute query', null, 500);
            return;
        }

        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            // Debug user info
            error_log("Found user: " . print_r($user, true));
            
            // Verify password
            if (password_verify($password, $user['password'])) {
                // Set session variables
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['is_admin'] = ($user['role'] === 'admin');
                
                // Return success response
                jsonResponse(true, 'Login successful', [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'isAdmin' => ($user['role'] === 'admin')
                ]);
            } else {
                error_log("Password verification failed for user: " . $username);
                jsonResponse(false, 'Invalid password', null, 401);
            }
        } else {
            error_log("No user found with username/email: " . $username);
            jsonResponse(false, 'User not found', null, 401);
        }
    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        jsonResponse(false, 'Login processing error: ' . $e->getMessage(), null, 500);
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
    $name = trim($firstName . ' ' . $lastName); // Combine first and last name
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

    $pdo = getConnection();

    // Check if username or email exists
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $checkStmt->execute([$username, $email]);
    if ($checkStmt->fetch()) {
        jsonResponse(false, 'Username or email already exists', null, 409);
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT, ['cost' => PASSWORD_COST]);

    // Insert new user
    $insertStmt = $pdo->prepare("INSERT INTO users (username, email, password, name, avatar, birthday, gender, role)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    if (!$insertStmt->execute([$username, $email, $passwordHash, $name, $avatarBlob, $birthday, $gender, $role])) {
        error_log("Failed to insert user: " . print_r($insertStmt->errorInfo(), true));
        jsonResponse(false, 'Registration failed', null, 500);
    }

    $userId = $pdo->lastInsertId();

    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $username;
    $_SESSION['is_admin'] = false;

    jsonResponse(true, 'Registration successful', [
        'id' => $userId,
        'username' => $username
    ], 201);
}

/**
 * Handle user status check
 */
function handleStatus() {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(true, 'Not logged in', ['isLoggedIn' => false]);
        return;
    }

    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in status check");
            jsonResponse(false, 'Database connection failed', null, 500);
            return;
        }

        $stmt = $pdo->prepare("SELECT id, username, email, name, avatar, birthday, gender, role, created_at FROM users WHERE id = ?");
        if (!$stmt->execute([$_SESSION['user_id']])) {
            error_log("Failed to execute query: " . print_r($stmt->errorInfo(), true));
            jsonResponse(false, 'Failed to fetch user data', null, 500);
            return;
        }

        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            session_destroy();
            jsonResponse(true, 'User not found', ['isLoggedIn' => false]);
            return;
        }

        // Convert avatar blob to base64 if exists
        if ($user['avatar']) {
            $user['avatar'] = base64_encode($user['avatar']);
        }

        jsonResponse(true, 'User is logged in', [
            'isLoggedIn' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'name' => $user['name'],
                'avatar' => $user['avatar'],
                'birthday' => $user['birthday'],
                'gender' => $user['gender'],
                'isAdmin' => ($user['role'] === 'admin'),
                'joinDate' => $user['created_at']
            ]
        ]);
    } catch (Exception $e) {
        error_log("Status check error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        jsonResponse(false, 'Status check failed', null, 500);
    }
}

/**
 * Handle user logout
 */
function handleLogout() {
    // Clear session data
    $_SESSION = array();
    
    // Destroy the session
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
    
    // Clear session cookie
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    jsonResponse(true, 'Logout successful');
}

