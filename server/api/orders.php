<?php
// Orders API

// Initialize error handling
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php_errors.log');
error_reporting(E_ALL);

// Include common files
require_once __DIR__ . '/../includes/db_credentials.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/functions.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Get the HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// Get action from query parameters
$action = isset($_GET['action']) ? $_GET['action'] : '';
$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;

// Handle request based on HTTP method and action
try {
    switch ($method) {
        case 'GET':
            if ($userId) {
                // Get orders for a specific user
                getOrdersByUser($userId);
            } else {
                errorResponse('User ID is required', 400);
            }
            break;
            
        case 'POST':
            if ($action === 'create') {
                // Create a new order
                createOrder();
            } else {
                errorResponse('Invalid action', 400);
            }
            break;
            
        default:
            // Method not allowed
            errorResponse('Method not allowed', 405);
            break;
    }
} catch (Exception $e) {
    error_log("Orders API Error: " . $e->getMessage());
    jsonResponse(false, "Server error occurred. Please try again later.", null, 500);
}

/**
 * Create a new order from cart items
 */
function createOrder() {
    // Require login for creating orders
    requireLogin();
    
    // Get JSON input data
    $data = getJsonInput();
    
    // Validate required fields
    validateRequired($data, ['items', 'total_amount']);
    
    // Get user ID from session
    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        errorResponse('User not authenticated', 401);
    }
    
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in order creation");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Start transaction
        $pdo->beginTransaction();
        
        // Generate order number
        $orderNumber = 'ORD-' . date('YmdHis') . '-' . substr(uniqid(), -5);
        
        // Create order
        $stmt = $pdo->prepare("INSERT INTO orders (user_id, order_number, total_amount, status) 
                              VALUES (?, ?, ?, 'pending')");
        $result = $stmt->execute([
            $userId,
            $orderNumber,
            (float)$data['total_amount']
        ]);
        
        if (!$result) {
            $pdo->rollBack();
            errorResponse('Failed to create order', 500);
        }
        
        $orderId = $pdo->lastInsertId();
        
        // Insert order items
        $insertItemStmt = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) 
                                        VALUES (?, ?, ?, ?)");
        
        foreach ($data['items'] as $item) {
            validateRequired($item, ['id', 'quantity', 'price']);
            
            $result = $insertItemStmt->execute([
                $orderId,
                (int)$item['id'],
                (int)$item['quantity'],
                (float)$item['price']
            ]);
            
            if (!$result) {
                $pdo->rollBack();
                errorResponse('Failed to add order item', 500);
            }
        }
        
        // Commit transaction
        $pdo->commit();
        
        // Return success response
        jsonResponse(true, "Order created successfully", [
            'order_id' => $orderId,
            'order_number' => $orderNumber
        ], 201);
    } catch (PDOException $e) {
        // Roll back transaction on error
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        error_log("Database Error: " . $e->getMessage());
        errorResponse('Failed to create order: ' . $e->getMessage(), 500);
    }
}

/**
 * Get orders for a specific user
 * 
 * @param int $userId User ID
 */
function getOrdersByUser($userId) {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in orders retrieval");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Get orders for the user
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
        $orders = $stmt->fetchAll();
        
        // Get items for each order
        foreach ($orders as &$order) {
            $itemsStmt = $pdo->prepare("SELECT oi.*, p.name, p.image 
                                       FROM order_items oi 
                                       JOIN products p ON oi.product_id = p.id 
                                       WHERE oi.order_id = ?");
            $itemsStmt->execute([$order['id']]);
            $order['items'] = $itemsStmt->fetchAll();
        }
        
        jsonResponse(true, "Orders loaded", $orders, 200);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        errorResponse('Failed to load orders', 500);
    }
} 