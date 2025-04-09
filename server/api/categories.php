<?php
/**
 * Categories API
 * 
 * Handles CRUD operations for product categories
 */
ini_set('display_errors', 1); // 显示错误
ini_set('display_startup_errors', 1); // 显示启动错误
error_reporting(E_ALL); // 显示所有错误
// Include common functions
require_once '../includes/functions.php';

// Get database configuration
$db_config = require_once '../config/database.php';

// Get the HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// Get category ID from query string if available
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Load categories from JSON file
$categories = loadJsonData($db_config['files']['categories']);

// Handle request based on HTTP method
switch ($method) {
    case 'GET':
        handleGetRequest($categories, $id);
        break;
        
    case 'POST':
        // Require admin for creating categories
        requireAdmin();
        handlePostRequest($categories);
        break;
        
    case 'PUT':
        // Require admin for updating categories
        requireAdmin();
        handlePutRequest($categories, $id);
        break;
        
    case 'DELETE':
        // Require admin for deleting categories
        requireAdmin();
        handleDeleteRequest($categories, $id);
        break;
        
    default:
        // Method not allowed
        errorResponse('Method not allowed', 405);
        break;
}

/**
 * Handle GET request
 * 
 * @param array $categories Categories data
 * @param int|null $id Category ID
 * @return void
 */
function handleGetRequest($categories, $id) {
    global $db_config;
    
    // Get a single category by ID
    if ($id !== null) {
        $category = findCategoryById($categories, $id);
        
        if ($category === null) {
            errorResponse('Category not found', 404);
        }
        
        // If products are requested with the category
        if (isset($_GET['with_products']) && $_GET['with_products'] === '1') {
            // Load products for this category
            $products = loadJsonData($db_config['files']['products']);
            
            // Filter products by category ID
            $categoryProducts = array_filter($products, function($product) use ($id) {
                return $product['categoryId'] === $id;
            });
            
            // Add products to category data
            $category['products'] = array_values($categoryProducts);
        }
        
        jsonResponse(true, "Categories retrieved successfully", $category, 200);
    }
    
    // Return all categories
    jsonResponse(true, "Categories retrieved successfully", $categories, 200);
}

/**
 * Handle POST request
 * 
 * @param array $categories Categories data
 * @return void
 */
function handlePostRequest($categories) {
    global $db_config;
    
    // Get JSON input data
    $data = getJsonInput();
    
    // Validate required fields
    validateRequired($data, ['name']);
    
    // Generate new category ID
    $existingIds = array_column($categories, 'id');
    $newId = generateId($existingIds);
    
    // Create new category
    $newCategory = [
        'id' => $newId,
        'name' => sanitize($data['name']),
        'description' => isset($data['description']) ? sanitize($data['description']) : ''
    ];
    
    // Add new category to array
    $categories[] = $newCategory;
    
    // Save updated categories data
    if (!saveJsonData($db_config['files']['categories'], $categories)) {
        errorResponse('Failed to save category', 500);
    }
    
    // Return the new category
    jsonResponse(true, "New category loaded", $newCategory, 201);
}

/**
 * Handle PUT request
 * 
 * @param array $categories Categories data
 * @param int $id Category ID
 * @return void
 */
function handlePutRequest($categories, $id) {
    global $db_config;
    
    // Check if ID is provided
    if ($id === null) {
        errorResponse('Category ID is required', 400);
    }
    
    // Find category index
    $index = findCategoryIndexById($categories, $id);
    
    if ($index === null) {
        errorResponse('Category not found', 404);
    }
    
    // Get JSON input data
    $data = getJsonInput();
    
    // Update category fields
    if (isset($data['name'])) {
        $categories[$index]['name'] = sanitize($data['name']);
    }
    
    if (isset($data['description'])) {
        $categories[$index]['description'] = sanitize($data['description']);
    }
    
    // Save updated categories data
    if (!saveJsonData($db_config['files']['categories'], $categories)) {
        errorResponse('Failed to update category', 500);
    }
    
    // Return the updated category
    jsonResponse(true, "Updated category", $categories[$index], 200);
}

/**
 * Handle DELETE request
 * 
 * @param array $categories Categories data
 * @param int $id Category ID
 * @return void
 */
function handleDeleteRequest($categories, $id) {
    global $db_config;
    
    // Check if ID is provided
    if ($id === null) {
        errorResponse('Category ID is required', 400);
    }
    
    // Find category index
    $index = findCategoryIndexById($categories, $id);
    
    if ($index === null) {
        errorResponse('Category not found', 404);
    }
    
    // Check if there are products using this category
    $products = loadJsonData($db_config['files']['products']);
    $productsUsingCategory = array_filter($products, function($product) use ($id) {
        return $product['categoryId'] === $id;
    });
    
    if (!empty($productsUsingCategory)) {
        errorResponse('Cannot delete category with associated products', 400);
    }
    
    // Remove category from array
    array_splice($categories, $index, 1);
    
    // Save updated categories data
    if (!saveJsonData($db_config['files']['categories'], $categories)) {
        errorResponse('Failed to delete category', 500);
    }
    
    // Return success response
    jsonResponse(true, ['message' => 'Category deleted successfully'], null, 200);
}

/**
 * Find category by ID
 * 
 * @param array $categories Categories data
 * @param int $id Category ID
 * @return array|null Category data or null if not found
 */
function findCategoryById($categories, $id) {
    foreach ($categories as $category) {
        if ($category['id'] === $id) {
            return $category;
        }
    }
    
    return null;
}

/**
 * Find category index by ID
 * 
 * @param array $categories Categories data
 * @param int $id Category ID
 * @return int|null Category index or null if not found
 */
function findCategoryIndexById($categories, $id) {
    foreach ($categories as $index => $category) {
        if ($category['id'] === $id) {
            return $index;
        }
    }
    
    return null;
} 