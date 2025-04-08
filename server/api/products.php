<?php
/**
 * Products API
 * 
 * Handles CRUD operations for products
 */

// Include common functions
require_once '../includes/functions.php';

// Get database configuration
$db_config = require_once '../config/database.php';

// Get the HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// Get product ID from query string if available
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Load products from JSON file
$products = loadJsonData($db_config['files']['products']);

// Handle request based on HTTP method
switch ($method) {
    case 'GET':
        handleGetRequest($products, $id);
        break;
        
    case 'POST':
        // Require admin for creating products
        requireAdmin();
        handlePostRequest($products);
        break;
        
    case 'PUT':
        // Require admin for updating products
        requireAdmin();
        handlePutRequest($products, $id);
        break;
        
    case 'DELETE':
        // Require admin for deleting products
        requireAdmin();
        handleDeleteRequest($products, $id);
        break;
        
    default:
        // Method not allowed
        errorResponse('Method not allowed', 405);
        break;
}

/**
 * Handle GET request
 * 
 * @param array $products Products data
 * @param int|null $id Product ID
 * @return void
 */
function handleGetRequest($products, $id) {
    // Get a single product by ID
    if ($id !== null) {
        $product = findProductById($products, $id);
        
        if ($product === null) {
            errorResponse('Product not found', 404);
        }
        
        jsonResponse($product);
    }
    
    // Filter products based on query parameters
    $filteredProducts = filterProducts($products);
    
    // Return all products (or filtered subset)
    jsonResponse($filteredProducts);
}

/**
 * Handle POST request
 * 
 * @param array $products Products data
 * @return void
 */
function handlePostRequest($products) {
    global $db_config;
    
    // Get JSON input data
    $data = getJsonInput();
    
    // Validate required fields
    validateRequired($data, ['name', 'price', 'description', 'categoryId']);
    
    // Generate new product ID
    $existingIds = array_column($products, 'id');
    $newId = generateId($existingIds);
    
    // Create new product
    $newProduct = [
        'id' => $newId,
        'name' => sanitize($data['name']),
        'description' => sanitize($data['description']),
        'price' => (float)$data['price'],
        'categoryId' => (int)$data['categoryId'],
        'onSale' => isset($data['onSale']) ? (bool)$data['onSale'] : false,
        'salePrice' => isset($data['salePrice']) ? (float)$data['salePrice'] : null,
        'rating' => isset($data['rating']) ? (float)$data['rating'] : 0,
        'reviewCount' => isset($data['reviewCount']) ? (int)$data['reviewCount'] : 0,
        'stock' => isset($data['stock']) ? (int)$data['stock'] : 0,
        'images' => isset($data['images']) ? $data['images'] : [],
        'created_at' => date('c')
    ];
    
    // Add new product to array
    $products[] = $newProduct;
    
    // Save updated products data
    if (!saveJsonData($db_config['files']['products'], $products)) {
        errorResponse('Failed to save product', 500);
    }
    
    // Return the new product
    jsonResponse($newProduct, 201);
}

/**
 * Handle PUT request
 * 
 * @param array $products Products data
 * @param int $id Product ID
 * @return void
 */
function handlePutRequest($products, $id) {
    global $db_config;
    
    // Check if ID is provided
    if ($id === null) {
        errorResponse('Product ID is required', 400);
    }
    
    // Find product index
    $index = findProductIndexById($products, $id);
    
    if ($index === null) {
        errorResponse('Product not found', 404);
    }
    
    // Get JSON input data
    $data = getJsonInput();
    
    // Update product fields
    if (isset($data['name'])) {
        $products[$index]['name'] = sanitize($data['name']);
    }
    
    if (isset($data['description'])) {
        $products[$index]['description'] = sanitize($data['description']);
    }
    
    if (isset($data['price'])) {
        $products[$index]['price'] = (float)$data['price'];
    }
    
    if (isset($data['categoryId'])) {
        $products[$index]['categoryId'] = (int)$data['categoryId'];
    }
    
    if (isset($data['onSale'])) {
        $products[$index]['onSale'] = (bool)$data['onSale'];
    }
    
    if (isset($data['salePrice'])) {
        $products[$index]['salePrice'] = (float)$data['salePrice'];
    }
    
    if (isset($data['rating'])) {
        $products[$index]['rating'] = (float)$data['rating'];
    }
    
    if (isset($data['reviewCount'])) {
        $products[$index]['reviewCount'] = (int)$data['reviewCount'];
    }
    
    if (isset($data['stock'])) {
        $products[$index]['stock'] = (int)$data['stock'];
    }
    
    if (isset($data['images'])) {
        $products[$index]['images'] = $data['images'];
    }
    
    // Save updated products data
    if (!saveJsonData($db_config['files']['products'], $products)) {
        errorResponse('Failed to update product', 500);
    }
    
    // Return the updated product
    jsonResponse($products[$index]);
}

/**
 * Handle DELETE request
 * 
 * @param array $products Products data
 * @param int $id Product ID
 * @return void
 */
function handleDeleteRequest($products, $id) {
    global $db_config;
    
    // Check if ID is provided
    if ($id === null) {
        errorResponse('Product ID is required', 400);
    }
    
    // Find product index
    $index = findProductIndexById($products, $id);
    
    if ($index === null) {
        errorResponse('Product not found', 404);
    }
    
    // Remove product from array
    array_splice($products, $index, 1);
    
    // Save updated products data
    if (!saveJsonData($db_config['files']['products'], $products)) {
        errorResponse('Failed to delete product', 500);
    }
    
    // Return success response
    jsonResponse(['message' => 'Product deleted successfully']);
}

/**
 * Find product by ID
 * 
 * @param array $products Products data
 * @param int $id Product ID
 * @return array|null Product data or null if not found
 */
function findProductById($products, $id) {
    foreach ($products as $product) {
        if ($product['id'] === $id) {
            return $product;
        }
    }
    
    return null;
}

/**
 * Find product index by ID
 * 
 * @param array $products Products data
 * @param int $id Product ID
 * @return int|null Product index or null if not found
 */
function findProductIndexById($products, $id) {
    foreach ($products as $index => $product) {
        if ($product['id'] === $id) {
            return $index;
        }
    }
    
    return null;
}

/**
 * Filter products based on query parameters
 * 
 * @param array $products Products data
 * @return array Filtered products
 */
function filterProducts($products) {
    // Category filter
    if (isset($_GET['category']) && !empty($_GET['category'])) {
        $categoryId = (int)$_GET['category'];
        $products = array_filter($products, function($product) use ($categoryId) {
            return $product['categoryId'] === $categoryId;
        });
    }
    
    // Price range filter
    if (isset($_GET['min_price']) && !empty($_GET['min_price'])) {
        $minPrice = (float)$_GET['min_price'];
        $products = array_filter($products, function($product) use ($minPrice) {
            $price = $product['onSale'] && isset($product['salePrice']) ? $product['salePrice'] : $product['price'];
            return $price >= $minPrice;
        });
    }
    
    if (isset($_GET['max_price']) && !empty($_GET['max_price'])) {
        $maxPrice = (float)$_GET['max_price'];
        $products = array_filter($products, function($product) use ($maxPrice) {
            $price = $product['onSale'] && isset($product['salePrice']) ? $product['salePrice'] : $product['price'];
            return $price <= $maxPrice;
        });
    }
    
    // Rating filter
    if (isset($_GET['rating']) && !empty($_GET['rating'])) {
        $rating = (float)$_GET['rating'];
        $products = array_filter($products, function($product) use ($rating) {
            return $product['rating'] >= $rating;
        });
    }
    
    // On sale filter
    if (isset($_GET['on_sale']) && $_GET['on_sale'] === '1') {
        $products = array_filter($products, function($product) {
            return $product['onSale'] === true;
        });
    }
    
    // Re-index array
    return array_values($products);
} 