<?php
// Products API

// Initialize error handling
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php_errors.log');

// Include common files
require_once __DIR__ . '/../includes/db_credentials.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/functions.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Get the HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// Get product ID from query string if available
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Handle request based on HTTP method
try {
    switch ($method) {
        case 'GET':
            handleGetRequest($id);
            break;
            
        case 'POST':
            // Require admin for creating products
            requireAdmin();
            handlePostRequest();
            break;
            
        case 'PUT':
            // Require admin for updating products
            requireAdmin();
            handlePutRequest($id);
            break;
            
        case 'DELETE':
            // Require admin for deleting products
            requireAdmin();
            handleDeleteRequest($id);
            break;
            
        default:
            // Method not allowed
            errorResponse('Method not allowed', 405);
            break;
    }
} catch (Exception $e) {
    error_log("Products API Error: " . $e->getMessage());
    jsonResponse(false, "Server error occurred. Please try again later.", null, 500);
}

// Handle GET request
function handleGetRequest($id) {
    // Get a single product by ID
    if ($id !== null) {
        try {
            $pdo = getConnection();
            if (!$pdo) {
                error_log("Database connection failed in product retrieval");
                jsonResponse(false, "Database connection failed", null, 500);
                return;
            }
            
            $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
            $stmt->execute([$id]);
            $product = $stmt->fetch();
            
            if ($product === false) {
                errorResponse('Product not found', 404);
            }
            
            // Ensure numeric fields are properly typed
            $product['price'] = (float)$product['price'];
            if (isset($product['salePrice'])) {
                $product['salePrice'] = (float)$product['salePrice'];
            }
            $product['rating'] = (float)$product['rating'];
            $product['reviewCount'] = (int)$product['reviewCount'];
            $product['stock_quantity'] = (int)$product['stock_quantity'];
            
            jsonResponse(true, "Product loaded", $product, 200);
        } catch (PDOException $e) {
            error_log("Database Error: " . $e->getMessage());
            errorResponse('Failed to load product', 500);
        }
    }
    
    // Get all products with optional filtering
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in products retrieval");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Build query with filters
        $whereConditions = [];
        $params = [];
        
        // Category filter
        if (isset($_GET['category']) && !empty($_GET['category'])) {
            $whereConditions[] = "categoryId = ?";
            $params[] = (int)$_GET['category'];
        }
        
        // Price range filter
        if (isset($_GET['min_price']) && !empty($_GET['min_price'])) {
            $whereConditions[] = "price >= ?";
            $params[] = (float)$_GET['min_price'];
        }
        
        if (isset($_GET['max_price']) && !empty($_GET['max_price'])) {
            $whereConditions[] = "price <= ?";
            $params[] = (float)$_GET['max_price'];
        }
        
        // Rating filter
        if (isset($_GET['rating']) && !empty($_GET['rating'])) {
            $whereConditions[] = "rating >= ?";
            $params[] = (float)$_GET['rating'];
        }
        
        // On sale filter
        if (isset($_GET['on_sale']) && $_GET['on_sale'] === '1') {
            $whereConditions[] = "onSale = 1";
        }
        
        // Featured products filter
        if (isset($_GET['featured']) && $_GET['featured'] === '1') {
            $whereConditions[] = "is_featured = 1";
        }
        
        // Build the query
        $sql = "SELECT * FROM products";
        if (!empty($whereConditions)) {
            $sql .= " WHERE " . implode(" AND ", $whereConditions);
        }
        
        // Add sorting
        if (isset($_GET['sort'])) {
            switch ($_GET['sort']) {
                case 'price_asc':
                    $sql .= " ORDER BY price ASC";
                    break;
                case 'price_desc':
                    $sql .= " ORDER BY price DESC";
                    break;
                case 'newest':
                    $sql .= " ORDER BY created_at DESC";
                    break;
                case 'rating':
                    $sql .= " ORDER BY rating DESC";
                    break;
                default:
                    $sql .= " ORDER BY id DESC";
            }
        } else {
            $sql .= " ORDER BY id DESC";
        }
        
        // Execute query
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();
        
        // Make sure numeric fields are properly typed for all products
        foreach ($products as &$product) {
            $product['price'] = (float)$product['price'];
            if (isset($product['salePrice'])) {
                $product['salePrice'] = (float)$product['salePrice'];
            }
            $product['rating'] = (float)$product['rating'];
            $product['reviewCount'] = (int)$product['reviewCount'];
            
            // Ensure other integer fields
            $product['id'] = (int)$product['id']; 
            if (isset($product['categoryId'])) {
                $product['categoryId'] = (int)$product['categoryId'];
            }
            if (isset($product['category_id'])) {
                $product['category_id'] = (int)$product['category_id'];
            }
            if (isset($product['stock_quantity'])) {
                $product['stock_quantity'] = (int)$product['stock_quantity'];
            }
            if (isset($product['stock'])) {
                $product['stock'] = (int)$product['stock'];
            }
        }
        
        jsonResponse(true, "Products loaded", $products, 200);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        errorResponse('Failed to load products', 500);
    }
}

// Handle POST request
function handlePostRequest() {
    // Get JSON input data
    $data = getJsonInput();
    
    // Validate required fields
    validateRequired($data, ['name', 'price', 'description', 'categoryId']);
    
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in product creation");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Prepare the SQL
        $sql = "INSERT INTO products (name, description, price, categoryId, onSale, salePrice, 
                rating, reviewCount, stock, is_featured, images, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        // Convert images array to JSON if provided
        $images = isset($data['images']) ? json_encode($data['images']) : json_encode([]);
        
        // Execute insert
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            sanitize($data['name']),
            sanitize($data['description']),
            (float)$data['price'],
            (int)$data['categoryId'],
            isset($data['onSale']) ? (int)$data['onSale'] : 0,
            isset($data['salePrice']) ? (float)$data['salePrice'] : null,
            isset($data['rating']) ? (float)$data['rating'] : 0,
            isset($data['reviewCount']) ? (int)$data['reviewCount'] : 0,
            isset($data['stock']) ? (int)$data['stock'] : 0,
            isset($data['is_featured']) ? (int)$data['is_featured'] : 0,
            $images
        ]);
        
        if (!$result) {
            errorResponse('Failed to save product', 500);
        }
        
        $newProductId = $pdo->lastInsertId();
        
        // Get the new product
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$newProductId]);
        $newProduct = $stmt->fetch();
        
        // Return the new product
        jsonResponse(true, "Product created successfully", $newProduct, 201);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        errorResponse('Failed to create product', 500);
    }
}

// Handle PUT request
function handlePutRequest($id) {
    // Check if ID is provided
    if ($id === null) {
        errorResponse('Product ID is required', 400);
    }
    
    // Get JSON input data
    $data = getJsonInput();
    
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in product update");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Check if product exists
        $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ?");
        $stmt->execute([$id]);
        
        if (!$stmt->fetch()) {
            errorResponse('Product not found', 404);
        }
        
        // Update fields
        $updateFields = [];
        $params = [];
        
        if (isset($data['name'])) {
            $updateFields[] = "name = ?";
            $params[] = sanitize($data['name']);
        }
        
        if (isset($data['description'])) {
            $updateFields[] = "description = ?";
            $params[] = sanitize($data['description']);
        }
        
        if (isset($data['price'])) {
            $updateFields[] = "price = ?";
            $params[] = (float)$data['price'];
        }
        
        if (isset($data['categoryId'])) {
            $updateFields[] = "categoryId = ?";
            $params[] = (int)$data['categoryId'];
        }
        
        if (isset($data['onSale'])) {
            $updateFields[] = "onSale = ?";
            $params[] = (int)$data['onSale'];
        }
        
        if (isset($data['salePrice'])) {
            $updateFields[] = "salePrice = ?";
            $params[] = (float)$data['salePrice'];
        }
        
        if (isset($data['rating'])) {
            $updateFields[] = "rating = ?";
            $params[] = (float)$data['rating'];
        }
        
        if (isset($data['reviewCount'])) {
            $updateFields[] = "reviewCount = ?";
            $params[] = (int)$data['reviewCount'];
        }
        
        if (isset($data['stock'])) {
            $updateFields[] = "stock = ?";
            $params[] = (int)$data['stock'];
        }
        
        if (isset($data['is_featured'])) {
            $updateFields[] = "is_featured = ?";
            $params[] = (int)$data['is_featured'];
        }
        
        if (isset($data['images'])) {
            $updateFields[] = "images = ?";
            $params[] = json_encode($data['images']);
        }
        
        if (empty($updateFields)) {
            errorResponse('No fields to update', 400);
        }
        
        // Add ID to params
        $params[] = $id;
        
        // Update product
        $sql = "UPDATE products SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($params);
        
        if (!$result) {
            errorResponse('Failed to update product', 500);
        }
        
        // Get the updated product
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $updatedProduct = $stmt->fetch();
        
        // Return the updated product
        jsonResponse(true, "Product updated successfully", $updatedProduct, 200);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        errorResponse('Failed to update product', 500);
    }
}

// Handle DELETE request
function handleDeleteRequest($id) {
    // Check if ID is provided
    if ($id === null) {
        errorResponse('Product ID is required', 400);
    }
    
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in product deletion");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Check if product exists
        $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ?");
        $stmt->execute([$id]);
        
        if (!$stmt->fetch()) {
            errorResponse('Product not found', 404);
        }
        
        // Check for related reviews (optional)
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM product_reviews WHERE product_id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            // Option 1: Prevent deletion
            // errorResponse('Cannot delete product with reviews', 400);
            
            // Option 2: Delete related reviews first
            $stmt = $pdo->prepare("DELETE FROM product_reviews WHERE product_id = ?");
            $stmt->execute([$id]);
        }
        
        // Delete product
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $result = $stmt->execute([$id]);
        
        if (!$result) {
            errorResponse('Failed to delete product', 500);
        }
        
        // Return success response
        jsonResponse(true, "Product deleted successfully", null, 200);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        errorResponse('Failed to delete product', 500);
    }
} 