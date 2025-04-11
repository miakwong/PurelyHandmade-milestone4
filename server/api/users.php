<?php
// Users API
// Initialize error handling - move error logging setup to the very top of the file
ini_set('display_errors', 0); // Change to 0 to prevent errors from being sent to output
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php_errors.log');
error_reporting(E_ALL);

// Ensure no whitespace or BOM marks at the start of the file
// Start output buffering to catch any unexpected output
ob_start();

require_once '../includes/config.php';
require_once '../includes/db.php';
require_once '../includes/functions.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Get user ID if provided
$userId = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = isset($_GET['action']) ? sanitize($_GET['action']) : '';

// Ensure session is started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Debug info
error_log("Request method: " . $_SERVER['REQUEST_METHOD']);
error_log("User ID from GET: " . $userId);
error_log("Action: " . $action);
error_log("Session user ID: " . ($_SESSION['user_id'] ?? 'not set'));

// Handle request methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if ($userId) {
            checkAuth();
            // Allow users to view their own profile or admin to view any profile
            if ($userId != $_SESSION['user_id'] && !isset($_SESSION['is_admin'])) {
                jsonResponse(false, 'You are not authorized to view this user', null, 403);
                exit;
            }
            getUser($userId);
        } else if ($action === 'check_email') {
            checkEmail();
        } else if ($action === 'check_username') {
            checkUsername();
        } else {
            // Admin access required for listing all users
            checkAuth();
            
            if (!isAdmin()) {
                jsonResponse(false, 'Admin privileges required', null, 403);
                exit;
            }
            
            getUsers();
        }
        break;
        
    case 'PUT':
        checkAuth(); // Require authentication
        
        error_log("DEBUG - Session info: " . json_encode([
            'session_id' => session_id(),
            'logged_in_user_id' => $_SESSION['user_id'] ?? 'not set',
            'is_admin' => isset($_SESSION['is_admin']) ? ($_SESSION['is_admin'] ? 'true' : 'false') : 'not set',
            'requested_user_id' => $userId,
            'session_data' => $_SESSION
        ]));
        
        if (!$userId) {
            jsonResponse(false, 'User ID is required', null, 400);
            exit;
        }
        
        // Only allow users to update their own profile or admin to update any profile
        if ($userId != $_SESSION['user_id'] && !isAdmin()) {
            // 添加详细错误信息
            error_log("Access denied: User " . ($_SESSION['user_id'] ?? 'unknown') . " trying to update user $userId. Is admin: " . (isset($_SESSION['is_admin']) && $_SESSION['is_admin'] ? 'yes' : 'no'));
            jsonResponse(false, 'You are not authorized to update this user', null, 403);
            exit;
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
            if ($userId != $_SESSION['user_id'] && !isAdmin()) {
                jsonResponse(false, 'You are not authorized to update this user', null, 403);
            }
            uploadProfileImage($userId);
        } else if ($action === 'change_password') {
            checkAuth(); // 需要用户已登录
            changePassword();
        } else if ($action === 'update_profile') {
            // 新增处理个人资料更新的逻辑
            checkAuth();
            
            // 获取请求体数据
            $data = json_decode(file_get_contents('php://input'), true);
            $profileUserId = $data['user_id'] ?? $userId;
            
            if (!$profileUserId) {
                jsonResponse(false, 'User ID is required', null, 400);
                exit;
            }
            
            error_log("POST update_profile: Updating user $profileUserId by user " . ($_SESSION['user_id'] ?? 'unknown'));
            
            // 权限检查
            if ($profileUserId != $_SESSION['user_id'] && !isAdmin()) {
                error_log("Access denied: User " . ($_SESSION['user_id'] ?? 'unknown') . " trying to update user $profileUserId. Is admin: " . (isset($_SESSION['is_admin']) && $_SESSION['is_admin'] ? 'yes' : 'no'));
                jsonResponse(false, 'You are not authorized to update this user', null, 403);
                exit;
            }
            
            // 调用更新用户函数
            updateUser($profileUserId);
        } else {
            jsonResponse(false, 'Invalid action', null, 400);
        }
        break;
        
    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

// Get all users admin only
function getUsers() {
    try {
        $search = isset($_GET['search']) ? sanitize($_GET['search']) : null;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        
        // Base query - 使用正确的列名
        $sql = "SELECT id, username, email, name, avatar, birthday, gender, role, created_at 
                FROM users 
                WHERE 1=1";
        $params = [];
        
        // Add search filter
        if ($search) {
            $sql .= " AND (username LIKE ? OR email LIKE ? OR name LIKE ?)";
            $searchParam = "%" . $search . "%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        // Add sorting
        $sql .= " ORDER BY created_at DESC";
        
        // Add limit and offset - using integers, not string placeholders
        $sql .= " LIMIT " . $limit . " OFFSET " . $offset;
        
        // Execute query
        $pdo = getConnection();
        if (!$pdo) {
            throw new Exception("Database connection failed");
        }
        
        $stmt = $pdo->prepare($sql);
        if (!$stmt) {
            throw new Exception("Failed to prepare statement: " . print_r($pdo->errorInfo(), true));
        }
        
        // Debug log the SQL query and params
        error_log("Users SQL Query: " . $sql);
        error_log("Users SQL Params: " . print_r($params, true));
        
        if (!$stmt->execute($params)) {
            throw new Exception("Failed to execute query: " . print_r($stmt->errorInfo(), true));
        }
        
        $users = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // 添加first_name和last_name字段
            if (isset($row['name'])) {
                $nameParts = explode(' ', $row['name'], 2);
                $row['first_name'] = $nameParts[0];
                $row['last_name'] = isset($nameParts[1]) ? $nameParts[1] : '';
            } else {
                $row['first_name'] = '';
                $row['last_name'] = '';
            }
            
            // 处理头像URL
            if (!empty($row['avatar'])) {
                $row['image_url'] = $row['avatar'];
            } else {
                $row['image_url'] = ASSETS_URL . '/img/default-avatar.png';
            }
            
            // 处理is_admin兼容性
            $row['is_admin'] = (strtolower($row['role']) === 'admin');
            $row['is_active'] = true; // 假设所有用户都是活跃的
            
            // Remove sensitive fields
            unset($row['password']);
            
            $users[] = $row;
        }
        
        // Count total users for pagination
        $countSql = "SELECT COUNT(*) as total FROM users WHERE 1=1";
        $countParams = [];
        
        if ($search) {
            $countSql .= " AND (username LIKE ? OR email LIKE ? OR name LIKE ?)";
            $searchParam = "%" . $search . "%";
            $countParams[] = $searchParam;
            $countParams[] = $searchParam;
            $countParams[] = $searchParam;
        }
        
        $countStmt = $pdo->prepare($countSql);
        if (!$countStmt->execute($countParams)) {
            throw new Exception("Failed to execute count query: " . print_r($countStmt->errorInfo(), true));
        }
        
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Clear any output buffer before sending JSON
        if (ob_get_length()) {
            ob_clean();
        }
        
        jsonResponse(true, 'Users retrieved successfully', [
            'users' => $users,
            'pagination' => [
                'total' => (int)$totalCount,
                'limit' => $limit,
                'offset' => $offset
            ]
        ]);
    } catch (Exception $e) {
        error_log("Error in getUsers function: " . $e->getMessage());
        // Clear any output buffer before sending JSON error
        if (ob_get_length()) {
            ob_clean();
        }
        jsonResponse(false, 'Error retrieving users: ' . $e->getMessage(), null, 500);
    }
}

// Get user by ID
function getUser($userId) {
    // Check if user is retrieving their own profile or is admin
    if ($userId != $_SESSION['user_id'] && !isAdmin()) {
        jsonResponse(false, 'You are not authorized to view this user', null, 403);
    }
    
    $pdo = getConnection();
    // 修改SQL查询，使用正确的列名
    $sql = "SELECT id, username, email, name, avatar, birthday, gender, role, created_at 
            FROM users 
            WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId]);
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        // 确保name字段存在，即使为NULL也转换为空字符串
        $user['name'] = isset($user['name']) ? $user['name'] : '';
        
        // 如果name存在，拆分为first_name和last_name
        if (!empty($user['name'])) {
            $nameParts = explode(' ', $user['name'], 2);
            $user['first_name'] = $nameParts[0];
            $user['last_name'] = isset($nameParts[1]) ? $nameParts[1] : '';
        } else {
            // 如果name不存在或为空，设置为空字符串
            $user['first_name'] = '';
            $user['last_name'] = '';
            
            // 如果name为空但有username，使用username作为name
            if (!empty($user['username'])) {
                $user['name'] = $user['username'];
                $user['first_name'] = $user['username'];
            }
        }
        
        // 不处理头像URL，保持avatar字段原样
        // 不再添加image_url字段
        
        // 处理is_admin兼容性
        $user['is_admin'] = (strtolower($user['role']) === 'admin');
        
        // 记录返回的用户数据用于调试
        error_log('User data being returned: ' . json_encode($user));
        
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
    
    // 记录请求数据用于调试
    error_log('Update user request data: ' . json_encode($data));
    
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
        
        // Admin can update role
        if (isset($data['role'])) {
            $role = sanitize($data['role']);
            if ($role === 'admin' || $role === 'user') {
                $updateFields[] = "role = ?";
                $params[] = $role;
            }
        }
    }
    
    // Process and update name field
    if (isset($data['name'])) {
        $name = sanitize($data['name']);
        if (!empty($name)) {
            $updateFields[] = "name = ?";
            $params[] = $name;
        }
    } else if ((isset($data['first_name']) || isset($data['last_name']))) {
        // Combine first_name and last_name into name
        $firstName = isset($data['first_name']) ? sanitize($data['first_name']) : '';
        $lastName = isset($data['last_name']) ? sanitize($data['last_name']) : '';
        $name = trim($firstName . ' ' . $lastName);
        
        if (!empty($name)) {
            $updateFields[] = "name = ?";
            $params[] = $name;
        }
    }
    
    // Process avatar field - can be base64 or URL
    if (isset($data['avatar'])) {
        error_log('Avatar field found in request data. Processing...');
        // 直接保存base64图像数据
        $avatar = $data['avatar'];
        
        // 确保avatar字段不为null
        if (!empty($avatar)) {
            error_log('Avatar data found, saving directly to database');
            $updateFields[] = "avatar = ?";
            $params[] = $avatar;
        } else {
            error_log('Avatar data is empty');
        }
    } else {
        error_log('No avatar field found in request data.');
    }
    
    // Update birthday if provided
    if (isset($data['birthday'])) {
        $birthday = sanitize($data['birthday']);
        // Validate date format (YYYY-MM-DD)
        if (empty($birthday) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthday)) {
            $updateFields[] = "birthday = ?";
            $params[] = $birthday ? $birthday : null;
        }
    }
    
    // Update gender if provided
    if (isset($data['gender'])) {
        $gender = sanitize($data['gender']);
        if (in_array($gender, ['male', 'female', 'other', ''])) {
            $updateFields[] = "gender = ?";
            $params[] = $gender ?: null;
        }
    }
    
    // Update password if provided
    if (isset($data['password']) && !empty($data['password'])) {
        $password = $data['password'];
        
        // Validate password length
        if (strlen($password) < 6) {
            jsonResponse(false, 'Password must be at least 6 characters', null, 400);
        }
        
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $updateFields[] = "password = ?";
        $params[] = $passwordHash;
    }
    
    if (empty($updateFields)) {
        jsonResponse(false, 'No fields to update', null, 400);
    }
    
    // Add user ID to params
    $params[] = $userId;
    
    // Execute update
    $sql = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = ?";
    error_log("SQL update query: " . $sql);
    error_log("SQL parameters: " . json_encode($params));
    
    $stmt = $pdo->prepare($sql);
    
    if ($stmt->execute($params)) {
        // 获取更新后的用户数据并返回
        $getUserSql = "SELECT id, username, email, name, avatar, birthday, gender, role, created_at FROM users WHERE id = ?";
        $getUserStmt = $pdo->prepare($getUserSql);
        $getUserStmt->execute([$userId]);
        $updatedUser = $getUserStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($updatedUser) {
            // 处理返回数据，确保name字段存在
            $updatedUser['name'] = isset($updatedUser['name']) ? $updatedUser['name'] : '';
            
            // 拆分name为first_name和last_name
            if (!empty($updatedUser['name'])) {
                $nameParts = explode(' ', $updatedUser['name'], 2);
                $updatedUser['first_name'] = $nameParts[0];
                $updatedUser['last_name'] = isset($nameParts[1]) ? $nameParts[1] : '';
            } else {
                $updatedUser['first_name'] = '';
                $updatedUser['last_name'] = '';
            }
            
            // 保持avatar字段直接使用数据库中存储的值
            // 不再处理image_url，始终使用avatar字段
            
            // 处理is_admin兼容性
            $updatedUser['is_admin'] = (strtolower($updatedUser['role']) === 'admin');
            
            jsonResponse(true, 'User updated successfully', $updatedUser);
        } else {
            jsonResponse(true, 'User updated successfully');
        }
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
        $imageUrl = UPLOADS_URL . '/images/' . $filename;
        
        // save the image URL to the avatar field   
        $pdo = getConnection();
        $sql = "UPDATE users SET avatar = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        
        if ($stmt->execute([$imageUrl, $userId])) {
            jsonResponse(true, 'Profile image uploaded successfully', [
                'avatar' => $imageUrl,
                'image_url' => $imageUrl
            ]);
        } else {
            jsonResponse(false, 'Failed to update user image', null, 500);
        }
    } else {
        jsonResponse(false, 'Failed to upload image', null, 500);
    }
}

// Avatar processing
function processAvatar($base64Image) {
    if (empty($base64Image)) {
        return null;
    }
    
    // check if it is a complete base64 encoded image or already a URL
    if (strpos($base64Image, 'http') === 0) {
        // already a URL, return it
        return $base64Image;
    }
    
    // 直接保存完整的base64字符串到数据库
    if (strpos($base64Image, ';base64,') !== false) {
        return $base64Image;
    }
    
    // 如果不是base64也不是URL，则返回null
    return null;
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

// 添加修改密码的功能
function changePassword() {
    // 获取JSON数据
    $data = json_decode(file_get_contents('php://input'), true);
    
    // 验证输入
    if (empty($data)) {
        jsonResponse(false, 'No data provided', null, 400);
    }
    
    // 检查必要的字段
    if (!isset($data['current_password']) || !isset($data['new_password'])) {
        jsonResponse(false, 'Current password and new password are required', null, 400);
    }
    
    $currentPassword = $data['current_password'];
    $newPassword = $data['new_password'];
    
    // 验证新密码长度
    if (strlen($newPassword) < 8) {
        jsonResponse(false, 'New password must be at least 8 characters', null, 400);
    }
    
    // 获取用户ID (使用当前登录用户)
    $userId = $_SESSION['user_id'];
    if (!$userId) {
        jsonResponse(false, 'User not authenticated', null, 401);
    }
    
    try {
        // connect to database
        $pdo = getConnection();
        
        $sql = "SELECT password FROM users WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            jsonResponse(false, 'User not found', null, 404);
        }
        
        // verify current password
        if (!password_verify($currentPassword, $user['password'])) {
            jsonResponse(false, 'Current password is incorrect', null, 400);
        }
        
        // generate new password hash
        $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        
        // update password
        $updateSql = "UPDATE users SET password = ? WHERE id = ?";
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute([$newPasswordHash, $userId]);
        
        if ($updateStmt->rowCount() > 0) {
            jsonResponse(true, 'Password changed successfully');
        } else {
            jsonResponse(false, 'Failed to update password', null, 500);
        }
    } catch (Exception $e) {
        error_log('Error changing password: ' . $e->getMessage());
        jsonResponse(false, 'An error occurred while changing password', null, 500);
    }
} 