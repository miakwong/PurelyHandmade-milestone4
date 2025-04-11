<?php
// Orders API

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
$orderId = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Handle request based on HTTP method and action
try {
    switch ($method) {
        case 'GET':
            if ($action === 'count') {
                // Get total order count
                getTotalOrderCount();
            } else if ($userId) {
                // Get orders for a specific user
                getOrdersByUser($userId);
            } else {
                // Check if user is logged in and is admin
                session_start();
                if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
                    errorResponse('Admin access required', 403);
                    return;
                }
                
                // Get all orders for admin
                getAllOrders();
            }
            break;
            
        case 'POST':
            if ($action === 'create') {
                // Create a new order
                createOrder();
            } else if ($action === 'update' && $orderId) {
                updateOrderStatus($orderId);
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

//Create a new order from cart items
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

// Get orders for a specific user
function getOrdersByUser($userId) {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in orders retrieval");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Get orders for the user with explicit fetch mode
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($orders)) {
            // Return empty array if no orders found
            jsonResponse(true, "No orders found", [], 200);
            return;
        }
        
        // Get items for each order with explicit fetch mode
        foreach ($orders as &$order) {
            $itemsStmt = $pdo->prepare("SELECT oi.*, p.name, p.image 
                                       FROM order_items oi 
                                       LEFT JOIN products p ON oi.product_id = p.id 
                                       WHERE oi.order_id = ?");
            $itemsStmt->execute([$order['id']]);
            $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
            $order['items'] = $items ?: []; // Ensure 'items' is always an array
        }
        
        jsonResponse(true, "Orders loaded", $orders, 200);
    } catch (PDOException $e) {
        error_log("Database Error in getOrdersByUser: " . $e->getMessage());
        jsonResponse(false, "Failed to load orders: " . $e->getMessage(), null, 500);
    }
}

/**
 * Get total count of orders
 */
function getTotalOrderCount() {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in order count");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM orders");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            jsonResponse(true, "Total order count", $result['count'], 200);
        } else {
            jsonResponse(true, "Total order count", 0, 200);
        }
    } catch (PDOException $e) {
        error_log("Database Error in getTotalOrderCount: " . $e->getMessage());
        jsonResponse(false, "Failed to get order count", null, 500);
    }
}

/**
 * Get all orders (Admin feature)
 */
function getAllOrders() {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in orders retrieval");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Get pagination parameters
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $status = isset($_GET['status']) ? $_GET['status'] : null;
        $search = isset($_GET['search']) ? $_GET['search'] : null;
        $sort = isset($_GET['sort']) ? $_GET['sort'] : 'newest';
        
        // First count total orders
        $countSql = "SELECT COUNT(*) as count FROM orders o LEFT JOIN users u ON o.user_id = u.id";
        $whereConditions = [];
        $whereParams = [];
        
        if ($status) {
            $whereConditions[] = "o.status = ?";
            $whereParams[] = $status;
        }
        
        if ($search) {
            $whereConditions[] = "(o.order_number LIKE ? OR u.name LIKE ? OR u.username LIKE ?)";
            $searchParam = "%" . $search . "%";
            $whereParams[] = $searchParam;
            $whereParams[] = $searchParam;
            $whereParams[] = $searchParam;
        }
        
        if (!empty($whereConditions)) {
            $countSql .= " WHERE " . implode(" AND ", $whereConditions);
        }
        
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($whereParams);
        $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
        $totalOrders = (int)$countResult['count'];
        
        // Now get the actual data
        $query = "SELECT o.*, u.username, u.name as user_name 
                 FROM orders o 
                 LEFT JOIN users u ON o.user_id = u.id";
                 
        if (!empty($whereConditions)) {
            $query .= " WHERE " . implode(" AND ", $whereConditions);
        }
        
        // Add sorting
        switch ($sort) {
            case 'oldest':
                $query .= " ORDER BY o.created_at ASC";
                break;
            case 'amount_desc':
                $query .= " ORDER BY o.total_amount DESC";
                break;
            case 'amount_asc':
                $query .= " ORDER BY o.total_amount ASC";
                break;
            case 'newest':
            default:
                $query .= " ORDER BY o.created_at DESC";
                break;
        }
        
        // Add pagination using direct values instead of placeholders for LIMIT/OFFSET
        $query .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($whereParams);
        
        $orders = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Get order items
            $itemsQuery = "SELECT oi.*, p.name, p.image as image 
                         FROM order_items oi 
                         LEFT JOIN products p ON oi.product_id = p.id 
                         WHERE oi.order_id = ?";
            $itemsStmt = $pdo->prepare($itemsQuery);
            $itemsStmt->execute([$row['id']]);
            
            $items = [];
            while ($item = $itemsStmt->fetch(PDO::FETCH_ASSOC)) {
                $items[] = $item;
            }
            
            $row['items'] = $items;
            
            $orders[] = $row;
        }
        
        $pagination = [
            'total' => $totalOrders,
            'limit' => $limit,
            'offset' => $offset,
            'pages' => ceil($totalOrders / $limit)
        ];
        
        jsonResponse(true, "All orders loaded", [
            'orders' => $orders,
            'pagination' => $pagination
        ], 200);
        
    } catch (PDOException $e) {
        error_log("Database Error in getAllOrders: " . $e->getMessage());
        jsonResponse(false, "Failed to load orders: " . $e->getMessage(), null, 500);
    }
}

/**
 * Update order status
 */
function updateOrderStatus($orderId) {
    try {
        // Check if user is admin
        if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
            errorResponse('Admin access required', 403);
            return;
        }
        
        // Get request data
        $data = getJsonInput();
        if (!isset($data['status'])) {
            errorResponse('Status is required', 400);
            return;
        }
        
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in order update");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Check if order exists
        $checkStmt = $pdo->prepare("SELECT id FROM orders WHERE id = ?");
        $checkStmt->execute([$orderId]);
        $order = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            errorResponse('Order not found', 404);
            return;
        }
        
        // Update order status
        $updateStmt = $pdo->prepare("UPDATE orders SET status = ?, admin_notes = ?, updated_at = NOW() WHERE id = ?");
        $status = $data['status'];
        $adminNotes = $data['admin_notes'] ?? '';
        
        $result = $updateStmt->execute([$status, $adminNotes, $orderId]);
        
        if (!$result) {
            errorResponse('Failed to update order', 500);
            return;
        }
        
        jsonResponse(true, "Order updated successfully", null, 200);
        
    } catch (PDOException $e) {
        error_log("Database Error in updateOrderStatus: " . $e->getMessage());
        jsonResponse(false, "Failed to update order: " . $e->getMessage(), null, 500);
    }
} 