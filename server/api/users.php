<?php
// Users API
// Initialize error handling
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php_errors.log');
error_reporting(E_ALL);

require_once '../includes/config.php';
require_once '../includes/db.php';
require_once '../includes/functions.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Get user ID if provided
$userId = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = isset($_GET['action']) ? sanitize($_GET['action']) : '';

// Handle request methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if ($userId) {
            checkAuth();
            getUser($userId);
        } else if ($action === 'check_email') {
            checkEmail();
        } else if ($action === 'check_username') {
            checkUsername();
        } else {
            // Admin access required for listing all users
            checkAuth();
            checkAdmin();
            getUsers();
        }
        break;
        
    case 'PUT':
        checkAuth(); // Require authentication
        if (!$userId) {
            jsonResponse(false, 'User ID is required', null, 400);
        }
        
        // Only allow users to update their own profile or admin to update any profile
        if ($userId != $_SESSION['user_id'] && !$_SESSION['is_admin']) {
            jsonResponse(false, 'You are not authorized to update this user', null, 403);
        }
        
        updateUser($userId);
        break;
        
    case 'POST':
        // Handle specific actions
        if ($action === 'delete') {
            checkAuth(); // Only admin can delete users
            checkAdmin();
            if (!$userId) {
                jsonResponse(false, 'User ID is required', null, 400);
            }
            deleteUser($userId);
        } else if ($action === 'toggle_status') {
            checkAuth(); // Only admin can change user status
            checkAdmin();
            if (!$userId) {
                jsonResponse(false, 'User ID is required', null, 400);
            }
            toggleUserStatus($userId);
        } else if ($action === 'make_admin') {
            checkAuth(); // Only admin can make other users admin
            checkAdmin();
            if (!$userId) {
                jsonResponse(false, 'User ID is required', null, 400);
            }
            toggleAdminStatus($userId, true);
        } else if ($action === 'remove_admin') {
            checkAuth(); // Only admin can remove admin status
            checkAdmin();
            if (!$userId) {
                jsonResponse(false, 'User ID is required', null, 400);
            }
            toggleAdminStatus($userId, false);
        } else if ($action === 'upload_image') {
            checkAuth(); // Check if user is updating their own profile or is admin
            if ($userId != $_SESSION['user_id'] && !$_SESSION['is_admin']) {
                jsonResponse(false, 'You are not authorized to update this user', null, 403);
            }
            uploadProfileImage($userId);
        } else {
            jsonResponse(false, 'Invalid action', null, 400);
        }
        break;
        
    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

// Get all users admin only
function getUsers() {
    $search = isset($_GET['search']) ? sanitize($_GET['search']) : null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    
    // Base query
    $sql = "SELECT id, username, email, first_name, last_name, image_path, is_admin, is_active, created_at 
            FROM users 
            WHERE 1=1";
    $params = [];
    
    // Add search filter
    if ($search) {
        $sql .= " AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)";
        $searchParam = "%" . $search . "%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    // Add sorting
    $sql .= " ORDER BY created_at DESC";
    
    // Add limit and offset
    $sql .= " LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    // Execute query
    $pdo = getConnection();
    $stmt = $pdo->prepare($sql);
    
    $stmt->execute($params);
    
    $users = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Add image URL if exists
        if ($row['image_path']) {
            $row['image_url'] = UPLOADS_URL . '/images/' . $row['image_path'];
        } else {
            $row['image_url'] = ASSETS_URL . '/img/default-avatar.png';
        }
        
        // Remove sensitive fields
        unset($row['password_hash']);
        
        $users[] = $row;
    }
    
    // Count total users for pagination
    $countSql = "SELECT COUNT(*) as total FROM users WHERE 1=1";
    $countParams = [];
    
    if ($search) {
        $countSql .= " AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)";
        $searchParam = "%" . $search . "%";
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
    }
    
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($countParams);
    $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    jsonResponse(true, 'Users retrieved successfully', [
        'users' => $users,
        'pagination' => [
            'total' => (int)$totalCount,
            'limit' => $limit,
            'offset' => $offset
        ]
    ]);
}

//get user by ID
function getUser($userId) {
    // Check if user is retrieving their own profile or is admin
    if ($userId != $_SESSION['user_id'] && !isAdmin()) {
        jsonResponse(false, 'You are not authorized to view this user', null, 403);
    }
    
    $pdo = getConnection();
    $sql = "SELECT id, username, email, first_name, last_name, image_path, is_admin, is_active, created_at 
            FROM users 
            WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId]);
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        // Add image URL if exists
        if ($user['image_path']) {
            $user['image_url'] = UPLOADS_URL . '/images/' . $user['image_path'];
        } else {
            $user['image_url'] = ASSETS_URL . '/img/default-avatar.png';
        }
        
        jsonResponse(true, 'User retrieved successfully', $user);
    } else {
        jsonResponse(false, 'User not found', null, 404);
    }
}

// Update user profile
function updateUser($userId) {
    // Get JSON data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (empty($data)) {
        jsonResponse(false, 'No data provided', null, 400);
    }
    
    // Check if user exists
    $pdo = getConnection();
    $checkSql = "SELECT id FROM users WHERE id = ?";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([$userId]);
    
    if ($checkStmt->rowCount() === 0) {
        jsonResponse(false, 'User not found', null, 404);
    }
    
    // Build update query
    $updateFields = [];
    $params = [];
    
    // Only allow admin to update username and email
    if (isAdmin()) {
        if (isset($data['username'])) {
            $username = sanitize($data['username']);
            
            // Check if username is already taken
            $checkUsernameSql = "SELECT id FROM users WHERE username = ? AND id != ?";
            $checkUsernameStmt = $pdo->prepare($checkUsernameSql);
            $checkUsernameStmt->execute([$username, $userId]);
            
            if ($checkUsernameStmt->rowCount() > 0) {
                jsonResponse(false, 'Username already taken', null, 409);
            }
            
            $updateFields[] = "username = ?";
            $params[] = $username;
        }
        
        if (isset($data['email'])) {
            $email = sanitize($data['email']);
            
            // Validate email
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                jsonResponse(false, 'Invalid email format', null, 400);
            }
            
            // Check if email is already taken
            $checkEmailSql = "SELECT id FROM users WHERE email = ? AND id != ?";
            $checkEmailStmt = $pdo->prepare($checkEmailSql);
            $checkEmailStmt->execute([$email, $userId]);
            
            if ($checkEmailStmt->rowCount() > 0) {
                jsonResponse(false, 'Email already taken', null, 409);
            }
            
            $updateFields[] = "email = ?";
            $params[] = $email;
        }
    }
    
    // Allow users to update their profile information
    if (isset($data['first_name'])) {
        $updateFields[] = "first_name = ?";
        $params[] = sanitize($data['first_name']);
    }
    
    if (isset($data['last_name'])) {
        $updateFields[] = "last_name = ?";
        $params[] = sanitize($data['last_name']);
    }
    
    // Update password if provided
    if (isset($data['password'])) {
        $password = $data['password'];
        
        // Validate password length
        if (strlen($password) < 6) {
            jsonResponse(false, 'Password must be at least 6 characters', null, 400);
        }
        
        $passwordHash = password_hash($password, PASSWORD_DEFAULT, ['cost' => PASSWORD_COST]);
        $updateFields[] = "password_hash = ?";
        $params[] = $passwordHash;
    }
    
    if (empty($updateFields)) {
        jsonResponse(false, 'No fields to update', null, 400);
    }
    
    // Add user ID to params
    $params[] = $userId;
    
    // Execute update
    $sql = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    
    if ($stmt->execute($params)) {
        jsonResponse(true, 'User updated successfully');
    } else {
        jsonResponse(false, 'Failed to update user', null, 500);
    }
}

//delete user (admin only)
function deleteUser($userId) {
    // Admin cannot delete their own account
    if ($userId == $_SESSION['user_id']) {
        jsonResponse(false, 'You cannot delete your own admin account', null, 400);
    }
    
    $pdo = getConnection();
    $sql = "DELETE FROM users WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    
    if ($stmt->execute([$userId]) && $stmt->rowCount() > 0) {
        jsonResponse(true, 'User deleted successfully');
    } else {
        jsonResponse(false, 'User not found or could not be deleted', null, 404);
    }
}

// Toggle user status (active/inactive) admin only
function toggleUserStatus($userId) {
    // Admin cannot disable their own account
    if ($userId == $_SESSION['user_id']) {
        jsonResponse(false, 'You cannot disable your own admin account', null, 400);
    }
    
    $pdo = getConnection();
    
    // Get current status
    $sql = "SELECT is_active FROM users WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId]);
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        jsonResponse(false, 'User not found', null, 404);
    }
    
    $newStatus = $user['is_active'] ? 0 : 1;
    
    // Update status
    $updateSql = "UPDATE users SET is_active = ? WHERE id = ?";
    $updateStmt = $pdo->prepare($updateSql);
    
    if ($updateStmt->execute([$newStatus, $userId])) {
        jsonResponse(true, 'User status updated successfully', [
            'is_active' => (bool)$newStatus
        ]);
    } else {
        jsonResponse(false, 'Failed to update user status', null, 500);
    }
}

// Toggle user admin status admin only
function toggleAdminStatus($userId, $isAdmin) {
    $pdo = getConnection();
    
    // Check if user exists
    $sql = "SELECT id FROM users WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId]);
    
    if ($stmt->rowCount() === 0) {
        jsonResponse(false, 'User not found', null, 404);
    }
    
    // Update admin status
    $updateSql = "UPDATE users SET is_admin = ? WHERE id = ?";
    $updateStmt = $pdo->prepare($updateSql);
    $adminStatus = $isAdmin ? 1 : 0;
    
    if ($updateStmt->execute([$adminStatus, $userId])) {
        jsonResponse(true, 'User admin status updated successfully', [
            'is_admin' => (bool)$adminStatus
        ]);
    } else {
        jsonResponse(false, 'Failed to update user admin status', null, 500);
    }
}

// Upload profile image
function uploadProfileImage($userId) {
    if (!isset($_FILES['image'])) {
        jsonResponse(false, 'No image provided', null, 400);
    }
    
    // Allowed image types
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    // Upload the file
    $filename = uploadFile($_FILES['image'], IMAGES_PATH, $allowedTypes, 2 * 1024 * 1024); // 2MB limit
    
    if ($filename) {
        // Update user with image path
        $pdo = getConnection();
        $sql = "UPDATE users SET image_path = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        
        if ($stmt->execute([$filename, $userId])) {
            jsonResponse(true, 'Profile image uploaded successfully', [
                'image_path' => $filename,
                'image_url' => UPLOADS_URL . '/images/' . $filename
            ]);
        } else {
            jsonResponse(false, 'Failed to update user image', null, 500);
        }
    } else {
        jsonResponse(false, 'Failed to upload image', null, 500);
    }
}

// Check if username is available
function checkUsername() {
    try {
        // Log the start of the function
        error_log("Starting username check...");
        
        // Get username from GET parameters
        $username = isset($_GET['username']) ? sanitize($_GET['username']) : null;
        error_log("Checking username: " . $username);
        
        if (!$username) {
            error_log("Username is empty");
            jsonResponse(false, 'Username is required', null, 400);
            return;
        }
        
        // Validate username format
        if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
            error_log("Invalid username format: " . $username);
            jsonResponse(false, 'Username must be 3-20 characters long and contain only letters, numbers, and underscores', null, 400);
            return;
        }
        
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed");
            jsonResponse(false, 'Database connection failed', null, 500);
            return;
        }

        $sql = "SELECT id FROM users WHERE username = ?";
        error_log("Preparing SQL: " . $sql);
        
        $stmt = $pdo->prepare($sql);
        if (!$stmt) {
            error_log("Failed to prepare statement: " . $pdo->errorInfo()[2]);
            jsonResponse(false, 'Failed to prepare statement: ' . $pdo->errorInfo()[2], null, 500);
            return;
        }

        if (!$stmt->execute([$username])) {
            error_log("Failed to execute query: " . $stmt->errorInfo()[2]);
            jsonResponse(false, 'Failed to execute query: ' . $stmt->errorInfo()[2], null, 500);
            return;
        }

        $isAvailable = $stmt->rowCount() === 0;
        error_log("Username availability check result: " . ($isAvailable ? "available" : "taken"));
        
        jsonResponse(true, 'Username check completed', [
            'available' => $isAvailable,
            'message' => $isAvailable ? 'Username is available' : 'Username is already taken'
        ]);
    } catch (Exception $e) {
        error_log("Username check error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        jsonResponse(false, 'Internal server error: ' . $e->getMessage(), null, 500);
    }
}

// Check if email is available
function checkEmail() {
    try {
        // Log the start of the function
        error_log("Starting email check...");
        
        // Get email from GET parameters
        $email = isset($_GET['email']) ? sanitize($_GET['email']) : null;
        error_log("Checking email: " . $email);
        
        if (!$email) {
            error_log("Email is empty");
            jsonResponse(false, 'Email is required', null, 400);
            return;
        }
        
        // Validate email format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            error_log("Invalid email format: " . $email);
            jsonResponse(false, 'Invalid email format', null, 400);
            return;
        }
        
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed");
            jsonResponse(false, 'Database connection failed', null, 500);
            return;
        }

        $sql = "SELECT id FROM users WHERE email = ?";
        error_log("Preparing SQL: " . $sql);
        
        $stmt = $pdo->prepare($sql);
        if (!$stmt) {
            error_log("Failed to prepare statement: " . $pdo->errorInfo()[2]);
            jsonResponse(false, 'Failed to prepare statement: ' . $pdo->errorInfo()[2], null, 500);
            return;
        }

        if (!$stmt->execute([$email])) {
            error_log("Failed to execute query: " . $stmt->errorInfo()[2]);
            jsonResponse(false, 'Failed to execute query: ' . $stmt->errorInfo()[2], null, 500);
            return;
        }

        $isAvailable = $stmt->rowCount() === 0;
        error_log("Email availability check result: " . ($isAvailable ? "available" : "taken"));
        
        jsonResponse(true, 'Email check completed', [
            'available' => $isAvailable,
            'message' => $isAvailable ? 'Email is available' : 'Email is already registered'
        ]);
    } catch (Exception $e) {
        error_log("Email check error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        jsonResponse(false, 'Internal server error: ' . $e->getMessage(), null, 500);
    }
} 