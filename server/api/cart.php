<?php
// Cart API

// Enable error reporting and logging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Include common functions
require_once '../includes/functions.php';

// Get database configuration
$db_config = require_once '../config/database.php';

// Get the HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// Handle request based on HTTP method
switch ($method) {
    case 'GET':
        // Require authentication for viewing cart
        checkAuth();
        getCart();
        break;
        
    case 'POST':
        // Require authentication for adding to cart
        checkAuth();
        // Check if it's a clear cart request
        if (isset($_GET['clear']) && $_GET['clear'] === '1') {
            clearCart();
        } else {
            addToCart();
        }
        break;
        
    case 'PUT':
        // Require authentication for updating cart
        checkAuth();
        updateCart();
        break;
        
    case 'DELETE':
        // Require authentication for removing from cart
        checkAuth();
        removeFromCart();
        break;
        
    default:
        // Method not allowed
        errorResponse('Method not allowed', 405);
        break;
}

// Get cart contents for the current user

function getCart() {
    global $db_config;
    
    // Get user ID from session
    $userId = getUserId();
    
    // Load carts data
    $carts = loadJsonData($db_config['files']['carts']);
    
    // Find user's cart
    $userCart = findUserCart($carts, $userId);
    
    if ($userCart === null) {
        // Return empty cart if not found
        jsonResponse(true, "empty cart", [
            'items' => [],
            'totalItems' => 0,
            'totalPrice' => 0
        ], 200);
        return;
    }
    
    // Load products to get current prices and availability
    $products = loadJsonData($db_config['files']['products']);
    
    // Map of product IDs to products for quick lookup
    $productMap = [];
    foreach ($products as $product) {
        $productMap[$product['id']] = $product;
    }
    
    // Process cart items with product details
    $cartItems = [];
    $totalItems = 0;
    $totalPrice = 0;
    
    foreach ($userCart['items'] as $item) {
        $productId = $item['productId'];
        
        // Check if product exists and is available
        if (isset($productMap[$productId]) && $productMap[$productId]['stock'] > 0) {
            $product = $productMap[$productId];
            
            // Calculate item subtotal
            $quantity = min($item['quantity'], $product['stock']); // Limit to available stock
            $subtotal = $quantity * $product['price'];
            
            // Add product details to cart item
            $cartItem = [
                'productId' => $productId,
                'name' => $product['name'],
                'price' => $product['price'],
                'quantity' => $quantity,
                'subtotal' => $subtotal,
                'image' => isset($product['image']) ? $product['image'] : null
            ];
            
            $cartItems[] = $cartItem;
            $totalItems += $quantity;
            $totalPrice += $subtotal;
        }
    }
    
    // Return cart with calculated totals
    jsonResponse(true, "total cart loaded", [
        'items' => $cartItems,
        'totalItems' => $totalItems,
        'totalPrice' => $totalPrice
    ], 200);
}

//Add a product to the cart
function addToCart() {
    global $db_config;
    
    // Get user ID from session
    $userId = getUserId();
    
    // Get JSON input data
    $data = getJsonInput();
    
    // Validate required fields
    validateRequired($data, ['productId', 'quantity']);
    
    $productId = (int)$data['productId'];
    $quantity = (int)$data['quantity'];
    
    // Validate quantity
    if ($quantity <= 0) {
        errorResponse('Quantity must be greater than zero', 400);
    }
    
    // Check if product exists and has enough stock
    $products = loadJsonData($db_config['files']['products']);
    $product = null;
    
    foreach ($products as $p) {
        if ($p['id'] === $productId) {
            $product = $p;
            break;
        }
    }
    
    if ($product === null) {
        errorResponse('Product not found', 404);
    }
    
    if ($product['stock'] < $quantity) {
        errorResponse('Not enough stock available', 400);
    }
    
    // Load carts data
    $carts = loadJsonData($db_config['files']['carts']);
    
    // Find user's cart
    $userCartIndex = findUserCartIndex($carts, $userId);
    
    if ($userCartIndex === null) {
        // Create new cart for user
        $carts[] = [
            'userId' => $userId,
            'items' => [
                [
                    'productId' => $productId,
                    'quantity' => $quantity
                ]
            ]
        ];
    } else {
        // Check if product already in cart
        $foundItem = false;
        
        foreach ($carts[$userCartIndex]['items'] as &$item) {
            if ($item['productId'] === $productId) {
                // Update quantity
                $item['quantity'] += $quantity;
                $foundItem = true;
                break;
            }
        }
        
        if (!$foundItem) {
            // Add new item to cart
            $carts[$userCartIndex]['items'][] = [
                'productId' => $productId,
                'quantity' => $quantity
            ];
        }
    }
    
    // Save updated carts data
    if (!saveJsonData($db_config['files']['carts'], $carts)) {
        errorResponse('Failed to add product to cart', 500);
    }
    
    // Return success response
    jsonResponse(true, 'Product added to cart successfully', [
        'productId' => $productId,
        'quantity' => $quantity
    ], 201);
}

// Update cart item quantity

function updateCart() {
    global $db_config;
    
    // Get user ID from session
    $userId = getUserId();
    
    // Get JSON input data
    $data = getJsonInput();
    
    // Validate required fields
    validateRequired($data, ['productId', 'quantity']);
    
    $productId = (int)$data['productId'];
    $quantity = (int)$data['quantity'];
    
    // Validate quantity
    if ($quantity <= 0) {
        errorResponse('Quantity must be greater than zero', 400);
    }
    
    // Check if product exists and has enough stock
    $products = loadJsonData($db_config['files']['products']);
    $product = null;
    
    foreach ($products as $p) {
        if ($p['id'] === $productId) {
            $product = $p;
            break;
        }
    }
    
    if ($product === null) {
        errorResponse('Product not found', 404);
    }
    
    if ($product['stock'] < $quantity) {
        errorResponse('Not enough stock available', 400);
    }
    
    // Load carts data
    $carts = loadJsonData($db_config['files']['carts']);
    
    // Find user's cart
    $userCartIndex = findUserCartIndex($carts, $userId);
    
    if ($userCartIndex === null) {
        errorResponse('Cart not found', 404);
    }
    
    // Update product quantity in cart
    $foundItem = false;
    
    foreach ($carts[$userCartIndex]['items'] as &$item) {
        if ($item['productId'] === $productId) {
            $item['quantity'] = $quantity;
            $foundItem = true;
            break;
        }
    }
    
    if (!$foundItem) {
        errorResponse('Product not in cart', 404);
    }
    
    // Save updated carts data
    if (!saveJsonData($db_config['files']['carts'], $carts)) {
        errorResponse('Failed to update cart', 500);
    }
    
    // Return success response
    jsonResponse(true, 'Cart updated successfully', [
        'productId' => $productId,
        'quantity' => $quantity
    ], 201);
}

//Remove a product from the cart
function removeFromCart() {
    global $db_config;
    
    // Get user ID from session
    $userId = getUserId();
    
    // Get product ID from query string
    if (!isset($_GET['productId'])) {
        errorResponse('Product ID is required', 400);
    }
    
    $productId = (int)$_GET['productId'];
    
    // Load carts data
    $carts = loadJsonData($db_config['files']['carts']);
    
    // Find user's cart
    $userCartIndex = findUserCartIndex($carts, $userId);
    
    if ($userCartIndex === null) {
        errorResponse('Cart not found', 404);
    }
    
    // Remove product from cart
    $items = &$carts[$userCartIndex]['items'];
    $initialCount = count($items);
    
    $items = array_filter($items, function($item) use ($productId) {
        return $item['productId'] !== $productId;
    });
    
    // Reindex array
    $items = array_values($items);
    
    if (count($items) === $initialCount) {
        errorResponse('Product not in cart', 404);
    }
    
    // Save updated carts data
    if (!saveJsonData($db_config['files']['carts'], $carts)) {
        errorResponse('Failed to remove product from cart', 500);
    }
    
    // Return success response
    jsonResponse(true, 'Product removed from cart successfully', null, 200);
}

//Clear all items from the cart

function clearCart() {
    global $db_config;
    
    // Get user ID from session
    $userId = getUserId();
    
    // Load carts data
    $carts = loadJsonData($db_config['files']['carts']);
    
    // Find user's cart
    $userCartIndex = findUserCartIndex($carts, $userId);
    
    if ($userCartIndex === null) {
        // Cart doesn't exist, nothing to clear
        jsonResponse(false, 'Cart doesn\'t exist', null, 200);
        return;
    }
    
    // Empty the cart items
    $carts[$userCartIndex]['items'] = [];
    
    // Save updated carts data
    if (!saveJsonData($db_config['files']['carts'], $carts)) {
        errorResponse('Failed to clear cart', 500);
    }
    
    // Return success response
    jsonResponse(true, 'Cart cleared successfully', null, 200);
}

//Find user's cart by user ID
function findUserCart($carts, $userId) {
    foreach ($carts as $cart) {
        if ($cart['userId'] === $userId) {
            return $cart;
        }
    }
    
    return null;
}

// Find user's cart index by user ID

function findUserCartIndex($carts, $userId) {
    foreach ($carts as $index => $cart) {
        if ($cart['userId'] === $userId) {
            return $index;
        }
    }
    
    return null;
} 