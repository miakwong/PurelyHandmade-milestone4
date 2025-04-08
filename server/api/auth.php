<?php
/**
 * Authentication API
 * Handles user registration, login, and logout
 */

require_once '../includes/config.php';
require_once '../includes/db.php';
require_once '../includes/functions.php';

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

/**
 * Handle user login
 */
function handleLogin() {
    // Only accept POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, 'Method not allowed', null, 405);
    }
    
    // Get JSON data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (!isset($data['username']) || !isset($data['password'])) {
        jsonResponse(false, 'Username and password are required', null, 400);
    }
    
    $username = sanitizeInput($data['username']);
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
}

/**
 * Handle user registration
 */
function handleRegister() {
    // Only accept POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, 'Method not allowed', null, 405);
    }
    
    // Get JSON data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
        jsonResponse(false, 'Username, email, and password are required', null, 400);
    }
    
    $username = sanitizeInput($data['username']);
    $email = sanitizeInput($data['email']);
    $password = $data['password'];
    $firstName = sanitizeInput($data['firstName'] ?? '');
    $lastName = sanitizeInput($data['lastName'] ?? '');
    
    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, 'Invalid email format', null, 400);
    }
    
    // Validate password length
    if (strlen($password) < 6) {
        jsonResponse(false, 'Password must be at least 6 characters', null, 400);
    }
    
    // Check if username or email already exists
    $conn = getConnection();
    $sql = "SELECT id FROM users WHERE username = ? OR email = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $username, $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        jsonResponse(false, 'Username or email already exists', null, 409);
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
        
        jsonResponse(true, 'Registration successful', [
            'id' => $userId,
            'username' => $username
        ]);
    } else {
        jsonResponse(false, 'Registration failed', null, 500);
    }
}

/**
 * Handle user logout
 */
function handleLogout() {
    // Clear session
    session_unset();
    session_destroy();
    
    jsonResponse(true, 'Logout successful');
}

/**
 * Handle user status check
 */
function handleStatus() {
    if (isLoggedIn()) {
        jsonResponse(true, 'User is logged in', [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'isAdmin' => $_SESSION['is_admin']
        ]);
    } else {
        jsonResponse(false, 'User is not logged in', null, 401);
    }
} 