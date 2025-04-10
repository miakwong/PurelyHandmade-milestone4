<?php
// Cart API

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

// Handle request based on HTTP method
try {
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
} catch (Exception $e) {
    error_log("Cart API Error: " . $e->getMessage());
    jsonResponse(false, "Server error occurred. Please try again later.", null, 500);
}

// Get cart contents for the current user
function getCart() {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in cart retrieval");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Get user ID from session
        $userId = getUserId();
        
        // Create cart record if it doesn't exist
        ensureCartExists($pdo, $userId);
        
        // Get cart items with product details
        $sql = "SELECT ci.product_id as productId, ci.quantity, 
                p.name, p.price, p.images, p.stock
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                JOIN carts c ON ci.cart_id = c.id
                WHERE c.user_id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        $cartItems = $stmt->fetchAll();
        
        // Process cart items with product details
        $processedItems = [];
        $totalItems = 0;
        $totalPrice = 0;
        
        foreach ($cartItems as $item) {
            // Calculate item subtotal
            $quantity = min($item['quantity'], $item['stock']); // Limit to available stock
            $subtotal = $quantity * $item['price'];
            
            // Get first image from images JSON array
            $images = json_decode($item['images'] ?? '[]', true);
            $image = !empty($images) ? $images[0] : null;
            
            // Add product details to cart item
            $cartItem = [
                'productId' => $item['productId'],
                'name' => $item['name'],
                'price' => (float)$item['price'],
                'quantity' => (int)$quantity,
                'subtotal' => (float)$subtotal,
                'image' => $image
            ];
            
            $processedItems[] = $cartItem;
            $totalItems += $quantity;
            $totalPrice += $subtotal;
        }
        
        // Return cart with calculated totals
        jsonResponse(true, "Cart loaded successfully", [
            'items' => $processedItems,
            'totalItems' => $totalItems,
            'totalPrice' => $totalPrice
        ], 200);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        jsonResponse(false, "Failed to retrieve cart", null, 500);
    }
}

// Add a product to the cart
function addToCart() {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in adding to cart");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Get user ID from session
        $userId = getUserId();
        
        // Get JSON input data
        $data = getJsonInput();
        
        // Validate required fields
        validateRequired($data, ['product_id', 'quantity']);
        
        $productId = (int)$data['product_id'];
        $quantity = (int)$data['quantity'];
        
        // Validate quantity
        if ($quantity <= 0) {
            errorResponse('Quantity must be greater than zero', 400);
        }
        
        // Check if product exists and has enough stock
        $stmt = $pdo->prepare("SELECT id, stock FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        $product = $stmt->fetch();
        
        if (!$product) {
            errorResponse('Product not found', 404);
        }
        
        if ($product['stock'] < $quantity) {
            errorResponse('Not enough stock available', 400);
        }
        
        // Ensure cart exists and get cart ID
        $cartId = ensureCartExists($pdo, $userId);
        
        // Check if product already in cart
        $stmt = $pdo->prepare("SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?");
        $stmt->execute([$cartId, $productId]);
        $existingItem = $stmt->fetch();
        
        if ($existingItem) {
            // Update quantity if product already in cart
            $newQuantity = $existingItem['quantity'] + $quantity;
            $stmt = $pdo->prepare("UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?");
            $result = $stmt->execute([$newQuantity, $cartId, $productId]);
        } else {
            // Add new item to cart
            $stmt = $pdo->prepare("INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)");
            $result = $stmt->execute([$cartId, $productId, $quantity]);
        }
        
        if (!$result) {
            errorResponse('Failed to add product to cart', 500);
        }
        
        // Return success response
        jsonResponse(true, 'Product added to cart successfully', [
            'productId' => $productId,
            'quantity' => $quantity
        ], 201);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        jsonResponse(false, "Failed to add product to cart", null, 500);
    }
}

// Update cart item quantity
function updateCart() {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in updating cart");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Get user ID from session
        $userId = getUserId();
        
        // Get JSON input data
        $data = getJsonInput();
        
        // Validate required fields
        validateRequired($data, ['product_id', 'quantity']);
        
        $productId = (int)$data['product_id'];
        $quantity = (int)$data['quantity'];
        
        // Validate quantity
        if ($quantity <= 0) {
            errorResponse('Quantity must be greater than zero', 400);
        }
        
        // Check if product exists and has enough stock
        $stmt = $pdo->prepare("SELECT id, stock FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        $product = $stmt->fetch();
        
        if (!$product) {
            errorResponse('Product not found', 404);
        }
        
        if ($product['stock'] < $quantity) {
            errorResponse('Not enough stock available', 400);
        }
        
        // Get cart ID
        $stmt = $pdo->prepare("SELECT id FROM carts WHERE user_id = ?");
        $stmt->execute([$userId]);
        $cart = $stmt->fetch();
        
        if (!$cart) {
            errorResponse('Cart not found', 404);
        }
        
        $cartId = $cart['id'];
        
        // Check if product is in cart
        $stmt = $pdo->prepare("SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?");
        $stmt->execute([$cartId, $productId]);
        $cartItem = $stmt->fetch();
        
        if (!$cartItem) {
            errorResponse('Product not in cart', 404);
        }
        
        // Update quantity
        $stmt = $pdo->prepare("UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?");
        $result = $stmt->execute([$quantity, $cartId, $productId]);
        
        if (!$result) {
            errorResponse('Failed to update cart', 500);
        }
        
        // Return success response
        jsonResponse(true, 'Cart updated successfully', [
            'productId' => $productId,
            'quantity' => $quantity
        ], 200);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        jsonResponse(false, "Failed to update cart", null, 500);
    }
}

// Remove a product from the cart
function removeFromCart() {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in removing from cart");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Get user ID from session
        $userId = getUserId();
        
        // Get product ID from query string
        if (!isset($_GET['productId'])) {
            errorResponse('Product ID is required', 400);
        }
        
        $productId = (int)$_GET['productId'];
        
        // Get cart ID
        $stmt = $pdo->prepare("SELECT id FROM carts WHERE user_id = ?");
        $stmt->execute([$userId]);
        $cart = $stmt->fetch();
        
        if (!$cart) {
            errorResponse('Cart not found', 404);
        }
        
        $cartId = $cart['id'];
        
        // Check if product is in cart
        $stmt = $pdo->prepare("SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?");
        $stmt->execute([$cartId, $productId]);
        $cartItem = $stmt->fetch();
        
        if (!$cartItem) {
            errorResponse('Product not in cart', 404);
        }
        
        // Remove product from cart
        $stmt = $pdo->prepare("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?");
        $result = $stmt->execute([$cartId, $productId]);
        
        if (!$result) {
            errorResponse('Failed to remove product from cart', 500);
        }
        
        // Return success response
        jsonResponse(true, 'Product removed from cart successfully', null, 200);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        jsonResponse(false, "Failed to remove product from cart", null, 500);
    }
}

// Clear all items from the cart
function clearCart() {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in clearing cart");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Get user ID from session
        $userId = getUserId();
        
        // Get cart ID
        $stmt = $pdo->prepare("SELECT id FROM carts WHERE user_id = ?");
        $stmt->execute([$userId]);
        $cart = $stmt->fetch();
        
        if (!$cart) {
            // Cart doesn't exist, nothing to clear
            jsonResponse(true, 'Cart is already empty', null, 200);
            return;
        }
        
        $cartId = $cart['id'];
        
        // Clear cart items
        $stmt = $pdo->prepare("DELETE FROM cart_items WHERE cart_id = ?");
        $result = $stmt->execute([$cartId]);
        
        if (!$result) {
            errorResponse('Failed to clear cart', 500);
        }
        
        // Return success response
        jsonResponse(true, 'Cart cleared successfully', null, 200);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        jsonResponse(false, "Failed to clear cart", null, 500);
    }
}

// Ensure a cart exists for the user and return cart ID
function ensureCartExists($pdo, $userId) {
    // Check if cart exists
    $stmt = $pdo->prepare("SELECT id FROM carts WHERE user_id = ?");
    $stmt->execute([$userId]);
    $cart = $stmt->fetch();
    
    if ($cart) {
        return $cart['id'];
    }
    
    // Create new cart
    $stmt = $pdo->prepare("INSERT INTO carts (user_id, created_at) VALUES (?, NOW())");
    $stmt->execute([$userId]);
    
    return $pdo->lastInsertId();
} 