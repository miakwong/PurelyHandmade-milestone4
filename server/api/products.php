<?php
/**
 * Products API
 * Handles product listing, retrieval, creation, and update
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

// Get product ID if provided
$productId = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Handle request methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if ($productId) {
            getProduct($productId);
        } else {
            getProducts();
        }
        break;
        
    case 'POST':
        checkAuth(); // Require authentication
        checkAdmin(); // Require admin access
        createProduct();
        break;
        
    case 'PUT':
        checkAuth(); // Require authentication
        checkAdmin(); // Require admin access
        if (!$productId) {
            jsonResponse(false, 'Product ID is required', null, 400);
        }
        updateProduct($productId);
        break;
        
    case 'DELETE':
        checkAuth(); // Require authentication
        checkAdmin(); // Require admin access
        if (!$productId) {
            jsonResponse(false, 'Product ID is required', null, 400);
        }
        deleteProduct($productId);
        break;
        
    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

/**
 * Get all products
 * Optional filters: category_id, search, limit, offset
 */
function getProducts() {
    $categoryId = isset($_GET['category']) ? (int)$_GET['category'] : null;
    $search = isset($_GET['search']) ? sanitizeInput($_GET['search']) : null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    
    // Base query
    $sql = "SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1";
    $params = [];
    $types = "";
    
    // Add category filter
    if ($categoryId) {
        $sql .= " AND p.category_id = ?";
        $params[] = $categoryId;
        $types .= "i";
    }
    
    // Add search filter
    if ($search) {
        $sql .= " AND (p.name LIKE ? OR p.description LIKE ?)";
        $searchParam = "%" . $search . "%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $types .= "ss";
    }
    
    // Add sorting
    $sql .= " ORDER BY p.created_at DESC";
    
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
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        // Get product images
        $row['images'] = getProductImages($row['id']);
        $products[] = $row;
    }
    
    // Count total products for pagination
    $countSql = "SELECT COUNT(*) as total FROM products WHERE 1=1";
    $countParams = [];
    $countTypes = "";
    
    if ($categoryId) {
        $countSql .= " AND category_id = ?";
        $countParams[] = $categoryId;
        $countTypes .= "i";
    }
    
    if ($search) {
        $countSql .= " AND (name LIKE ? OR description LIKE ?)";
        $searchParam = "%" . $search . "%";
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countTypes .= "ss";
    }
    
    $countStmt = $conn->prepare($countSql);
    
    if (!empty($countParams)) {
        $countStmt->bind_param($countTypes, ...$countParams);
    }
    
    $countStmt->execute();
    $countResult = $countStmt->get_result();
    $totalCount = $countResult->fetch_assoc()['total'];
    
    jsonResponse(true, 'Products retrieved successfully', [
        'products' => $products,
        'pagination' => [
            'total' => (int)$totalCount,
            'limit' => $limit,
            'offset' => $offset
        ]
    ]);
}

/**
 * Get a single product by ID
 * @param int $productId Product ID
 */
function getProduct($productId) {
    $conn = getConnection();
    $sql = "SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($product = $result->fetch_assoc()) {
        // Get product images
        $product['images'] = getProductImages($product['id']);
        
        // Get product comments
        $product['comments'] = getProductComments($product['id']);
        
        jsonResponse(true, 'Product retrieved successfully', $product);
    } else {
        jsonResponse(false, 'Product not found', null, 404);
    }
}

/**
 * Create a new product
 */
function createProduct() {
    // Get JSON data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (!isset($data['name']) || !isset($data['price'])) {
        jsonResponse(false, 'Name and price are required', null, 400);
    }
    
    $name = sanitizeInput($data['name']);
    $price = (float)$data['price'];
    $description = sanitizeInput($data['description'] ?? '');
    $categoryId = isset($data['category_id']) ? (int)$data['category_id'] : null;
    $stock = isset($data['stock']) ? (int)$data['stock'] : 0;
    
    // Insert product
    $conn = getConnection();
    $sql = "INSERT INTO products (name, description, price, category_id, stock) 
            VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssdii", $name, $description, $price, $categoryId, $stock);
    
    if ($stmt->execute()) {
        $productId = $conn->insert_id;
        
        // Handle image upload if provided
        if (isset($_FILES['image'])) {
            $imagePath = uploadProductImage($productId, $_FILES['image']);
            
            if ($imagePath) {
                // Update product with image path
                $updateSql = "UPDATE products SET image_path = ? WHERE id = ?";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param("si", $imagePath, $productId);
                $updateStmt->execute();
            }
        }
        
        jsonResponse(true, 'Product created successfully', [
            'id' => $productId,
            'name' => $name
        ]);
    } else {
        jsonResponse(false, 'Failed to create product', null, 500);
    }
}

/**
 * Update an existing product
 * @param int $productId Product ID
 */
function updateProduct($productId) {
    // Get JSON data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (empty($data)) {
        jsonResponse(false, 'No data provided', null, 400);
    }
    
    // Check if product exists
    $conn = getConnection();
    $checkSql = "SELECT id FROM products WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $productId);
    $checkStmt->execute();
    
    if ($checkStmt->get_result()->num_rows === 0) {
        jsonResponse(false, 'Product not found', null, 404);
    }
    
    // Build update query
    $updateFields = [];
    $params = [];
    $types = "";
    
    if (isset($data['name'])) {
        $updateFields[] = "name = ?";
        $params[] = sanitizeInput($data['name']);
        $types .= "s";
    }
    
    if (isset($data['description'])) {
        $updateFields[] = "description = ?";
        $params[] = sanitizeInput($data['description']);
        $types .= "s";
    }
    
    if (isset($data['price'])) {
        $updateFields[] = "price = ?";
        $params[] = (float)$data['price'];
        $types .= "d";
    }
    
    if (isset($data['category_id'])) {
        $updateFields[] = "category_id = ?";
        $params[] = (int)$data['category_id'];
        $types .= "i";
    }
    
    if (isset($data['stock'])) {
        $updateFields[] = "stock = ?";
        $params[] = (int)$data['stock'];
        $types .= "i";
    }
    
    if (empty($updateFields)) {
        jsonResponse(false, 'No fields to update', null, 400);
    }
    
    // Add product ID to params
    $params[] = $productId;
    $types .= "i";
    
    // Execute update
    $sql = "UPDATE products SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        // Handle image upload if provided
        if (isset($_FILES['image'])) {
            $imagePath = uploadProductImage($productId, $_FILES['image']);
            
            if ($imagePath) {
                // Update product with image path
                $updateSql = "UPDATE products SET image_path = ? WHERE id = ?";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param("si", $imagePath, $productId);
                $updateStmt->execute();
            }
        }
        
        jsonResponse(true, 'Product updated successfully');
    } else {
        jsonResponse(false, 'Failed to update product', null, 500);
    }
}

/**
 * Delete a product
 * @param int $productId Product ID
 */
function deleteProduct($productId) {
    $conn = getConnection();
    $sql = "DELETE FROM products WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $productId);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        jsonResponse(true, 'Product deleted successfully');
    } else {
        jsonResponse(false, 'Product not found or could not be deleted', null, 404);
    }
}

/**
 * Get product images
 * @param int $productId Product ID
 * @return array Array of image paths
 */
function getProductImages($productId) {
    // In a real implementation, you would fetch images from a separate table
    // For simplicity, we're returning the main image and a placeholder
    $conn = getConnection();
    $sql = "SELECT image_path FROM products WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($product = $result->fetch_assoc()) {
        $images = [];
        
        if ($product['image_path']) {
            $images[] = UPLOADS_URL . '/images/' . $product['image_path'];
        } else {
            // Add placeholder image
            $images[] = ASSETS_URL . '/img/placeholder.jpg';
        }
        
        return $images;
    }
    
    return [];
}

/**
 * Get product comments
 * @param int $productId Product ID
 * @return array Array of comments
 */
function getProductComments($productId) {
    $conn = getConnection();
    $sql = "SELECT c.*, u.username 
            FROM comments c 
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.product_id = ? 
            ORDER BY c.created_at DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $comments = [];
    while ($row = $result->fetch_assoc()) {
        $comments[] = $row;
    }
    
    return $comments;
}

/**
 * Upload a product image
 * @param int $productId Product ID
 * @param array $file File from $_FILES
 * @return string|false Filename on success, false on failure
 */
function uploadProductImage($productId, $file) {
    // Allowed image types
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    // Upload the file
    $filename = uploadFile($file, IMAGES_PATH, $allowedTypes, 5 * 1024 * 1024); // 5MB limit
    
    if ($filename) {
        return $filename;
    }
    
    return false;
} 