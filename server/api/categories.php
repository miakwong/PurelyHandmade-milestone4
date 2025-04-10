<?php
// Categories API

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

// Get category ID from query string if available
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Handle request based on HTTP method
try {
    switch ($method) {
        case 'GET':
            handleGetRequest($id);
            break;
            
        case 'POST':
            // Require admin for creating categories
            requireAdmin();
            handlePostRequest();
            break;
            
        case 'PUT':
            // Require admin for updating categories
            requireAdmin();
            handlePutRequest($id);
            break;
            
        case 'DELETE':
            // Require admin for deleting categories
            requireAdmin();
            handleDeleteRequest($id);
            break;
            
        default:
            // Method not allowed
            errorResponse('Method not allowed', 405);
            break;
    }
} catch (Exception $e) {
    error_log("Categories API Error: " . $e->getMessage());
    jsonResponse(false, "Server error occurred. Please try again later.", null, 500);
}

// Handle GET request
function handleGetRequest($id) {
    // Get a single category by ID
    if ($id !== null) {
        try {
            $pdo = getConnection();
            if (!$pdo) {
                error_log("Database connection failed in category retrieval");
                jsonResponse(false, "Database connection failed", null, 500);
                return;
            }
            
            $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
            $stmt->execute([$id]);
            $category = $stmt->fetch();
            
            if ($category === false) {
                errorResponse('Category not found', 404);
            }
            
            // If products are requested with the category
            if (isset($_GET['with_products']) && $_GET['with_products'] === '1') {
                $productsStmt = $pdo->prepare("SELECT * FROM products WHERE categoryId = ?");
                $productsStmt->execute([$id]);
                $categoryProducts = $productsStmt->fetchAll();
                
                // Add products to category data
                $category['products'] = $categoryProducts;
            }
            
            jsonResponse(true, "Category retrieved successfully", $category, 200);
        } catch (PDOException $e) {
            error_log("Database Error: " . $e->getMessage());
            errorResponse('Failed to load category', 500);
        }
    }
    
    // Return all categories
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in categories retrieval");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        $stmt = $pdo->prepare("SELECT * FROM categories ORDER BY name");
        $stmt->execute();
        $categories = $stmt->fetchAll();
        
        jsonResponse(true, "Categories retrieved successfully", $categories, 200);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        errorResponse('Failed to load categories', 500);
    }
}

// Handle POST request
function handlePostRequest() {
    // Get JSON input data
    $data = getJsonInput();
    
    // Validate required fields
    validateRequired($data, ['name']);
    
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in category creation");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Create new category
        $stmt = $pdo->prepare("INSERT INTO categories (name, description) VALUES (?, ?)");
        $result = $stmt->execute([
            sanitize($data['name']),
            isset($data['description']) ? sanitize($data['description']) : ''
        ]);
        
        if (!$result) {
            errorResponse('Failed to save category', 500);
        }
        
        $newCategoryId = $pdo->lastInsertId();
        
        // Get the new category
        $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
        $stmt->execute([$newCategoryId]);
        $newCategory = $stmt->fetch();
        
        // Return the new category
        jsonResponse(true, "Category created successfully", $newCategory, 201);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        errorResponse('Failed to create category', 500);
    }
}

// Handle PUT request
function handlePutRequest($id) {
    // Check if ID is provided
    if ($id === null) {
        errorResponse('Category ID is required', 400);
    }
    
    // Get JSON input data
    $data = getJsonInput();
    
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in category update");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Check if category exists
        $stmt = $pdo->prepare("SELECT id FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        
        if (!$stmt->fetch()) {
            errorResponse('Category not found', 404);
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
        
        if (empty($updateFields)) {
            errorResponse('No fields to update', 400);
        }
        
        // Add ID to params
        $params[] = $id;
        
        // Update category
        $sql = "UPDATE categories SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($params);
        
        if (!$result) {
            errorResponse('Failed to update category', 500);
        }
        
        // Get the updated category
        $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        $updatedCategory = $stmt->fetch();
        
        // Return the updated category
        jsonResponse(true, "Category updated successfully", $updatedCategory, 200);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        errorResponse('Failed to update category', 500);
    }
}

// Handle DELETE request
function handleDeleteRequest($id) {
    // Check if ID is provided
    if ($id === null) {
        errorResponse('Category ID is required', 400);
    }
    
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in category deletion");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Check if category exists
        $stmt = $pdo->prepare("SELECT id FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        
        if (!$stmt->fetch()) {
            errorResponse('Category not found', 404);
        }
        
        // Check if there are products using this category
        $stmt = $pdo->prepare("SELECT COUNT(*) AS count FROM products WHERE categoryId = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            errorResponse('Cannot delete category with associated products', 400);
        }
        
        // Delete category
        $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
        $result = $stmt->execute([$id]);
        
        if (!$result) {
            errorResponse('Failed to delete category', 500);
        }
        
        // Return success response
        jsonResponse(true, "Category deleted successfully", null, 200);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        errorResponse('Failed to delete category', 500);
    }
} 