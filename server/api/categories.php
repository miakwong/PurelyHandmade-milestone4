<?php
/**
 * Categories API
 * Handles category listing, retrieval, creation, and deletion
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

// Get category ID if provided
$categoryId = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Handle request methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if ($categoryId) {
            getCategory($categoryId);
        } else {
            getCategories();
        }
        break;
        
    case 'POST':
        checkAuth(); // Require authentication
        checkAdmin(); // Require admin access
        createCategory();
        break;
        
    case 'PUT':
        checkAuth(); // Require authentication
        checkAdmin(); // Require admin access
        if (!$categoryId) {
            jsonResponse(false, 'Category ID is required', null, 400);
        }
        updateCategory($categoryId);
        break;
        
    case 'DELETE':
        checkAuth(); // Require authentication
        checkAdmin(); // Require admin access
        if (!$categoryId) {
            jsonResponse(false, 'Category ID is required', null, 400);
        }
        deleteCategory($categoryId);
        break;
        
    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

/**
 * Get all categories
 */
function getCategories() {
    $conn = getConnection();
    $sql = "SELECT * FROM categories ORDER BY name ASC";
    $result = $conn->query($sql);
    
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        // Add image URL if exists
        if (isset($row['image_path']) && $row['image_path']) {
            $row['image_url'] = UPLOADS_URL . '/images/' . $row['image_path'];
        }
        
        $categories[] = $row;
    }
    
    jsonResponse(true, 'Categories retrieved successfully', $categories);
}

/**
 * Get a single category by ID
 * @param int $categoryId Category ID
 */
function getCategory($categoryId) {
    $conn = getConnection();
    $sql = "SELECT * FROM categories WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $categoryId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($category = $result->fetch_assoc()) {
        // Add image URL if exists
        if (isset($category['image_path']) && $category['image_path']) {
            $category['image_url'] = UPLOADS_URL . '/images/' . $category['image_path'];
        }
        
        // Get products in this category
        $productsSql = "SELECT id, name, price, image_path, stock FROM products WHERE category_id = ? LIMIT 10";
        $productsStmt = $conn->prepare($productsSql);
        $productsStmt->bind_param("i", $categoryId);
        $productsStmt->execute();
        $productsResult = $productsStmt->get_result();
        
        $products = [];
        while ($product = $productsResult->fetch_assoc()) {
            if ($product['image_path']) {
                $product['image_url'] = UPLOADS_URL . '/images/' . $product['image_path'];
            }
            $products[] = $product;
        }
        
        $category['products'] = $products;
        
        jsonResponse(true, 'Category retrieved successfully', $category);
    } else {
        jsonResponse(false, 'Category not found', null, 404);
    }
}

/**
 * Create a new category
 */
function createCategory() {
    // Get JSON data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (!isset($data['name'])) {
        jsonResponse(false, 'Category name is required', null, 400);
    }
    
    $name = sanitizeInput($data['name']);
    $description = sanitizeInput($data['description'] ?? '');
    
    // Check if category with the same name already exists
    $conn = getConnection();
    $checkSql = "SELECT id FROM categories WHERE name = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("s", $name);
    $checkStmt->execute();
    
    if ($checkStmt->get_result()->num_rows > 0) {
        jsonResponse(false, 'Category with this name already exists', null, 409);
    }
    
    // Insert category
    $sql = "INSERT INTO categories (name, description) VALUES (?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $name, $description);
    
    if ($stmt->execute()) {
        $categoryId = $conn->insert_id;
        
        // Handle image upload if provided
        if (isset($_FILES['image'])) {
            $imagePath = uploadCategoryImage($categoryId, $_FILES['image']);
            
            if ($imagePath) {
                // Update category with image path
                $updateSql = "UPDATE categories SET image_path = ? WHERE id = ?";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param("si", $imagePath, $categoryId);
                $updateStmt->execute();
            }
        }
        
        jsonResponse(true, 'Category created successfully', [
            'id' => $categoryId,
            'name' => $name
        ]);
    } else {
        jsonResponse(false, 'Failed to create category', null, 500);
    }
}

/**
 * Update an existing category
 * @param int $categoryId Category ID
 */
function updateCategory($categoryId) {
    // Get JSON data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (empty($data)) {
        jsonResponse(false, 'No data provided', null, 400);
    }
    
    // Check if category exists
    $conn = getConnection();
    $checkSql = "SELECT id FROM categories WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $categoryId);
    $checkStmt->execute();
    
    if ($checkStmt->get_result()->num_rows === 0) {
        jsonResponse(false, 'Category not found', null, 404);
    }
    
    // Build update query
    $updateFields = [];
    $params = [];
    $types = "";
    
    if (isset($data['name'])) {
        $name = sanitizeInput($data['name']);
        
        // Check if another category with the same name exists
        $checkNameSql = "SELECT id FROM categories WHERE name = ? AND id != ?";
        $checkNameStmt = $conn->prepare($checkNameSql);
        $checkNameStmt->bind_param("si", $name, $categoryId);
        $checkNameStmt->execute();
        
        if ($checkNameStmt->get_result()->num_rows > 0) {
            jsonResponse(false, 'Category with this name already exists', null, 409);
        }
        
        $updateFields[] = "name = ?";
        $params[] = $name;
        $types .= "s";
    }
    
    if (isset($data['description'])) {
        $updateFields[] = "description = ?";
        $params[] = sanitizeInput($data['description']);
        $types .= "s";
    }
    
    if (empty($updateFields)) {
        jsonResponse(false, 'No fields to update', null, 400);
    }
    
    // Add category ID to params
    $params[] = $categoryId;
    $types .= "i";
    
    // Execute update
    $sql = "UPDATE categories SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        // Handle image upload if provided
        if (isset($_FILES['image'])) {
            $imagePath = uploadCategoryImage($categoryId, $_FILES['image']);
            
            if ($imagePath) {
                // Update category with image path
                $updateSql = "UPDATE categories SET image_path = ? WHERE id = ?";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param("si", $imagePath, $categoryId);
                $updateStmt->execute();
            }
        }
        
        jsonResponse(true, 'Category updated successfully');
    } else {
        jsonResponse(false, 'Failed to update category', null, 500);
    }
}

/**
 * Delete a category
 * @param int $categoryId Category ID
 */
function deleteCategory($categoryId) {
    // Check if category has products
    $conn = getConnection();
    $checkSql = "SELECT COUNT(*) as product_count FROM products WHERE category_id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $categoryId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $productCount = $result->fetch_assoc()['product_count'];
    
    // If category has products, don't allow deletion
    if ($productCount > 0) {
        jsonResponse(false, 'Cannot delete category with products. Remove or reassign products first.', null, 400);
    }
    
    // Delete category
    $sql = "DELETE FROM categories WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $categoryId);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        jsonResponse(true, 'Category deleted successfully');
    } else {
        jsonResponse(false, 'Category not found or could not be deleted', null, 404);
    }
}

/**
 * Upload a category image
 * @param int $categoryId Category ID
 * @param array $file File from $_FILES
 * @return string|false Filename on success, false on failure
 */
function uploadCategoryImage($categoryId, $file) {
    // Allowed image types
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    // Upload the file
    $filename = uploadFile($file, IMAGES_PATH, $allowedTypes, 5 * 1024 * 1024); // 5MB limit
    
    if ($filename) {
        return $filename;
    }
    
    return false;
} 