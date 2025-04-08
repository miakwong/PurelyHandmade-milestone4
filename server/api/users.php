<?php
/**
 * Users API
 * Handles user listing, retrieval, update, and deletion
 */

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
$action = isset($_GET['action']) ? sanitizeInput($_GET['action']) : '';

// Handle request methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if ($userId) {
            getUser($userId);
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
        checkAuth(); // Require authentication
        
        // Handle specific actions
        if ($action === 'delete') {
            checkAdmin(); // Only admin can delete users
            if (!$userId) {
                jsonResponse(false, 'User ID is required', null, 400);
            }
            deleteUser($userId);
        } else if ($action === 'toggle_status') {
            checkAdmin(); // Only admin can change user status
            if (!$userId) {
                jsonResponse(false, 'User ID is required', null, 400);
            }
            toggleUserStatus($userId);
        } else if ($action === 'make_admin') {
            checkAdmin(); // Only admin can make other users admin
            if (!$userId) {
                jsonResponse(false, 'User ID is required', null, 400);
            }
            toggleAdminStatus($userId, true);
        } else if ($action === 'remove_admin') {
            checkAdmin(); // Only admin can remove admin status
            if (!$userId) {
                jsonResponse(false, 'User ID is required', null, 400);
            }
            toggleAdminStatus($userId, false);
        } else if ($action === 'upload_image') {
            // Check if user is updating their own profile or is admin
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

/**
 * Get all users (admin only)
 * Optional filters: search, limit, offset
 */
function getUsers() {
    $search = isset($_GET['search']) ? sanitizeInput($_GET['search']) : null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    
    // Base query
    $sql = "SELECT id, username, email, first_name, last_name, image_path, is_admin, is_active, created_at 
            FROM users 
            WHERE 1=1";
    $params = [];
    $types = "";
    
    // Add search filter
    if ($search) {
        $sql .= " AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)";
        $searchParam = "%" . $search . "%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $types .= "ssss";
    }
    
    // Add sorting
    $sql .= " ORDER BY created_at DESC";
    
    // Add limit and offset
    $sql .= " LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";
    
    // Execute query
    $conn = getConnection();
    $stmt = $conn->prepare($sql);
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
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
    $countTypes = "";
    
    if ($search) {
        $countSql .= " AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)";
        $searchParam = "%" . $search . "%";
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countTypes .= "ssss";
    }
    
    $countStmt = $conn->prepare($countSql);
    
    if (!empty($countParams)) {
        $countStmt->bind_param($countTypes, ...$countParams);
    }
    
    $countStmt->execute();
    $countResult = $countStmt->get_result();
    $totalCount = $countResult->fetch_assoc()['total'];
    
    jsonResponse(true, 'Users retrieved successfully', [
        'users' => $users,
        'pagination' => [
            'total' => (int)$totalCount,
            'limit' => $limit,
            'offset' => $offset
        ]
    ]);
}

/**
 * Get a single user by ID
 * @param int $userId User ID
 */
function getUser($userId) {
    // Check if user is retrieving their own profile or is admin
    if ($userId != $_SESSION['user_id'] && !isAdmin()) {
        jsonResponse(false, 'You are not authorized to view this user', null, 403);
    }
    
    $conn = getConnection();
    $sql = "SELECT id, username, email, first_name, last_name, image_path, is_admin, is_active, created_at 
            FROM users 
            WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($user = $result->fetch_assoc()) {
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

/**
 * Update user profile
 * @param int $userId User ID
 */
function updateUser($userId) {
    // Get JSON data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (empty($data)) {
        jsonResponse(false, 'No data provided', null, 400);
    }
    
    // Check if user exists
    $conn = getConnection();
    $checkSql = "SELECT id FROM users WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $userId);
    $checkStmt->execute();
    
    if ($checkStmt->get_result()->num_rows === 0) {
        jsonResponse(false, 'User not found', null, 404);
    }
    
    // Build update query
    $updateFields = [];
    $params = [];
    $types = "";
    
    // Only allow admin to update username and email
    if (isAdmin()) {
        if (isset($data['username'])) {
            $username = sanitizeInput($data['username']);
            
            // Check if username is already taken
            $checkUsernameSql = "SELECT id FROM users WHERE username = ? AND id != ?";
            $checkUsernameStmt = $conn->prepare($checkUsernameSql);
            $checkUsernameStmt->bind_param("si", $username, $userId);
            $checkUsernameStmt->execute();
            
            if ($checkUsernameStmt->get_result()->num_rows > 0) {
                jsonResponse(false, 'Username already taken', null, 409);
            }
            
            $updateFields[] = "username = ?";
            $params[] = $username;
            $types .= "s";
        }
        
        if (isset($data['email'])) {
            $email = sanitizeInput($data['email']);
            
            // Validate email
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                jsonResponse(false, 'Invalid email format', null, 400);
            }
            
            // Check if email is already taken
            $checkEmailSql = "SELECT id FROM users WHERE email = ? AND id != ?";
            $checkEmailStmt = $conn->prepare($checkEmailSql);
            $checkEmailStmt->bind_param("si", $email, $userId);
            $checkEmailStmt->execute();
            
            if ($checkEmailStmt->get_result()->num_rows > 0) {
                jsonResponse(false, 'Email already taken', null, 409);
            }
            
            $updateFields[] = "email = ?";
            $params[] = $email;
            $types .= "s";
        }
    }
    
    // Allow users to update their profile information
    if (isset($data['first_name'])) {
        $updateFields[] = "first_name = ?";
        $params[] = sanitizeInput($data['first_name']);
        $types .= "s";
    }
    
    if (isset($data['last_name'])) {
        $updateFields[] = "last_name = ?";
        $params[] = sanitizeInput($data['last_name']);
        $types .= "s";
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
        $types .= "s";
    }
    
    if (empty($updateFields)) {
        jsonResponse(false, 'No fields to update', null, 400);
    }
    
    // Add user ID to params
    $params[] = $userId;
    $types .= "i";
    
    // Execute update
    $sql = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        jsonResponse(true, 'User updated successfully');
    } else {
        jsonResponse(false, 'Failed to update user', null, 500);
    }
}

/**
 * Delete a user (admin only)
 * @param int $userId User ID
 */
function deleteUser($userId) {
    // Admin cannot delete their own account
    if ($userId == $_SESSION['user_id']) {
        jsonResponse(false, 'You cannot delete your own admin account', null, 400);
    }
    
    $conn = getConnection();
    $sql = "DELETE FROM users WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        jsonResponse(true, 'User deleted successfully');
    } else {
        jsonResponse(false, 'User not found or could not be deleted', null, 404);
    }
}

/**
 * Toggle user active status (admin only)
 * @param int $userId User ID
 */
function toggleUserStatus($userId) {
    // Admin cannot disable their own account
    if ($userId == $_SESSION['user_id']) {
        jsonResponse(false, 'You cannot disable your own admin account', null, 400);
    }
    
    $conn = getConnection();
    
    // Get current status
    $sql = "SELECT is_active FROM users WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        jsonResponse(false, 'User not found', null, 404);
    }
    
    $user = $result->fetch_assoc();
    $newStatus = $user['is_active'] ? 0 : 1;
    
    // Update status
    $updateSql = "UPDATE users SET is_active = ? WHERE id = ?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param("ii", $newStatus, $userId);
    
    if ($updateStmt->execute()) {
        jsonResponse(true, 'User status updated successfully', [
            'is_active' => (bool)$newStatus
        ]);
    } else {
        jsonResponse(false, 'Failed to update user status', null, 500);
    }
}

/**
 * Toggle user admin status (admin only)
 * @param int $userId User ID
 * @param bool $isAdmin Whether to make the user an admin
 */
function toggleAdminStatus($userId, $isAdmin) {
    $conn = getConnection();
    
    // Check if user exists
    $sql = "SELECT id FROM users WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    
    if ($stmt->get_result()->num_rows === 0) {
        jsonResponse(false, 'User not found', null, 404);
    }
    
    // Update admin status
    $updateSql = "UPDATE users SET is_admin = ? WHERE id = ?";
    $updateStmt = $conn->prepare($updateSql);
    $adminStatus = $isAdmin ? 1 : 0;
    $updateStmt->bind_param("ii", $adminStatus, $userId);
    
    if ($updateStmt->execute()) {
        jsonResponse(true, 'User admin status updated successfully', [
            'is_admin' => (bool)$adminStatus
        ]);
    } else {
        jsonResponse(false, 'Failed to update user admin status', null, 500);
    }
}

/**
 * Upload user profile image
 * @param int $userId User ID
 */
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
        $conn = getConnection();
        $sql = "UPDATE users SET image_path = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("si", $filename, $userId);
        
        if ($stmt->execute()) {
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