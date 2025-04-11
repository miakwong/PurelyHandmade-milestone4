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
            
            // Get product information
            $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
            $stmt->execute([$id]);
            $product = $stmt->fetch();
            
            if ($product === false) {
                errorResponse('Product not found', 404);
            }
            
            // Get product images from product_images table
            $imagesStmt = $pdo->prepare("SELECT image_path FROM product_images WHERE product_id = ? ORDER BY is_primary DESC");
            $imagesStmt->execute([$id]);
            $imageRows = $imagesStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Create images array
            $images = [];
            foreach ($imageRows as $row) {
                $images[] = $row['image_path'];
            }
            
            // Add images array to product
            $product['images'] = $images;
            
            // If no images in product_images table but we have a single image in products table
            if (empty($images) && !empty($product['image'])) {
                $product['images'] = [$product['image']];
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
            $whereConditions[] = "category_id = ?";
            $params[] = (int)$_GET['category'];
            error_log("Filtering products by category_id: " . (int)$_GET['category']);
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
        
        // 添加搜索功能
        if (isset($_GET['search']) && !empty($_GET['search'])) {
            $searchTerm = '%' . $_GET['search'] . '%';
            $whereConditions[] = "(name LIKE ? OR description LIKE ?)";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            error_log("Searching products with term: " . $_GET['search']);
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
        
        // 记录完整的SQL查询和参数
        error_log("Products query SQL: " . $sql);
        error_log("Products query parameters: " . print_r($params, true));
        
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
            if (isset($product['category_id'])) {
                $product['category_id'] = (int)$product['category_id'];
            }
            if (isset($product['stock_quantity'])) {
                $product['stock_quantity'] = (int)$product['stock_quantity'];
            }
            if (isset($product['stock'])) {
                $product['stock'] = (int)$product['stock'];
            }
            
            // For list view, we only need main image in the images array
            // We don't fetch all images for performance reasons
            if (!empty($product['image'])) {
                $product['images'] = [$product['image']];
            } else {
                $product['images'] = [];
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
    // Log request details for debugging
    error_log("POST request received: " . print_r($_POST, true));
    error_log("GET params: " . print_r($_GET, true));
    
    // First, check if this is an update request by action parameter
    if (isset($_GET['action']) && $_GET['action'] === 'update' && isset($_GET['id'])) {
        error_log("Action=update detected, redirecting to handlePutRequest");
        handlePutRequest((int)$_GET['id']);
        return;
    }
    
    // Check for method override in JSON payload
    $jsonData = file_get_contents('php://input');
    $jsonArray = null;
    
    if (!empty($jsonData)) {
        error_log("Raw JSON data: " . $jsonData);
        $jsonArray = json_decode($jsonData, true);
        if (isset($jsonArray['_method'])) {
            error_log("Method override found in JSON: " . $jsonArray['_method']);
        }
        if (isset($jsonArray['id'])) {
            error_log("Product ID found in JSON: " . $jsonArray['id']);
        }
    }
    
    // Check for PUT method override
    $isPutMethod = false;
    $productId = null;
    
    // Check in POST data
    if (isset($_POST['_method']) && $_POST['_method'] === 'PUT') {
        $isPutMethod = true;
        error_log("PUT method override found in POST data");
        
        // Look for ID in POST or GET
        if (isset($_POST['id'])) {
            $productId = (int)$_POST['id'];
            error_log("Product ID from POST: " . $productId);
        }
    }
    
    // Check in JSON data
    if (!$isPutMethod && isset($jsonArray['_method']) && $jsonArray['_method'] === 'PUT') {
        $isPutMethod = true;
        error_log("PUT method override found in JSON data");
        
        // Look for ID in JSON
        if (isset($jsonArray['id'])) {
            $productId = (int)$jsonArray['id'];
            error_log("Product ID from JSON: " . $productId);
        }
    }
    
    // Check for ID in GET params
    if (isset($_GET['id'])) {
        $productId = (int)$_GET['id'];
        error_log("Product ID from GET params: " . $productId);
    }
    
    // If this is a PUT request, redirect to handlePutRequest
    if ($isPutMethod && $productId) {
        error_log("Redirecting to handlePutRequest with product ID: " . $productId);
        handlePutRequest($productId);
        return;
    }
    
    // Check for image-related actions
    if (isset($_GET['action'])) {
        switch ($_GET['action']) {
            case 'add_image':
                handleAddImage();
                return;
            case 'set_primary_image':
                handleSetPrimaryImage();
                return;
            case 'delete_image':
                handleDeleteImage();
                return;
        }
    }
    
    // If we get here, it's a regular POST for product creation
    error_log("No method override detected, proceeding with product creation");
    
    // Get JSON input data
    $data = getJsonInput();
    
    // Validate required fields
    validateRequired($data, ['name', 'price', 'description', 'category_id']);
    
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in product creation");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Map category_id to category_id for database insertion
        if (isset($data['category_id'])) {
            $category_id = $data['category_id'];
        } else {
            errorResponse('Category ID is required', 400);
        }
        
        // Generate slug if not provided
        if (!isset($data['slug']) || empty($data['slug'])) {
            $data['slug'] = createSlug($data['name']);
        }
        
        // Prepare the SQL
        $sql = "INSERT INTO products (name, description, price, category_id, slug, 
                stock_quantity, is_featured, in_stock, rating, reviewCount, image, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        // Set default image
        $image = isset($data['image']) ? $data['image'] : '';
        
        // Execute insert
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            sanitize($data['name']),
            sanitize($data['description']),
            (float)$data['price'],
            (int)$category_id,
            sanitize($data['slug']),
            isset($data['stock_quantity']) ? (int)$data['stock_quantity'] : 0,
            isset($data['is_featured']) ? (int)$data['is_featured'] : 0,
            isset($data['in_stock']) ? (int)$data['in_stock'] : 1,
            isset($data['rating']) ? (float)$data['rating'] : 0,
            isset($data['reviewCount']) ? (int)$data['reviewCount'] : 0,
            $image
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

// Handle image upload
function handleAddImage() {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in image upload");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Check if product exists
        $productId = isset($_POST['product_id']) ? (int)$_POST['product_id'] : null;
        if (!$productId) {
            errorResponse('Product ID is required', 400);
        }
        
        $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        if (!$stmt->fetch()) {
            errorResponse('Product not found', 404);
        }
        
        // Handle file upload
        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            errorResponse('No image file uploaded or upload error', 400);
        }
        
        $uploadDir = __DIR__ . '/../uploads/images/';
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $fileName = uniqid() . '_' . basename($_FILES['image']['name']);
        $targetPath = $uploadDir . $fileName;
        
        if (!move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
            errorResponse('Failed to save image', 500);
        }
        
        // Save to database
        $imagePath = '/~miakuang/PurelyHandmade/server/uploads/images/' . $fileName;
        $stmt = $pdo->prepare("INSERT INTO product_images (product_id, image_path, is_primary) VALUES (?, ?, ?)");
        $result = $stmt->execute([$productId, $imagePath, 0]);
        
        if (!$result) {
            unlink($targetPath); // Remove uploaded file if database insert failed
            errorResponse('Failed to save image record', 500);
        }
        
        $imageId = $pdo->lastInsertId();
        
        // If this is the first image, set it as primary
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM product_images WHERE product_id = ?");
        $stmt->execute([$productId]);
        $result = $stmt->fetch();
        
        if ($result['count'] == 1) {
            // Set as primary in product_images table
            $stmt = $pdo->prepare("UPDATE product_images SET is_primary = 1 WHERE id = ?");
            $stmt->execute([$imageId]);
            
            // Update primary image in products table
            $stmt = $pdo->prepare("UPDATE products SET images = ? WHERE id = ?");
            $stmt->execute([$imagePath, $productId]);
        }
        
        jsonResponse(true, "Image uploaded successfully", ['image_id' => $imageId, 'image_path' => $imagePath], 201);
    } catch (Exception $e) {
        error_log("Image Upload Error: " . $e->getMessage());
        errorResponse('Failed to upload image', 500);
    }
}

// Handle setting primary image
function handleSetPrimaryImage() {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in setting primary image");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Get input data
        $data = getJsonInput();
        $productId = isset($data['product_id']) ? (int)$data['product_id'] : null;
        $imageId = isset($data['image_id']) ? (int)$data['image_id'] : null;
        
        if (!$productId || !$imageId) {
            errorResponse('Product ID and Image ID are required', 400);
        }
        
        // Check if image belongs to product
        $stmt = $pdo->prepare("SELECT image_path FROM product_images WHERE id = ? AND product_id = ?");
        $stmt->execute([$imageId, $productId]);
        $image = $stmt->fetch();
        
        if (!$image) {
            errorResponse('Image not found for this product', 404);
        }
        
        // Start transaction
        $pdo->beginTransaction();
        
        try {
            // Reset all primary flags for this product
            $stmt = $pdo->prepare("UPDATE product_images SET is_primary = 0 WHERE product_id = ?");
            $stmt->execute([$productId]);
            
            // Set new primary image
            $stmt = $pdo->prepare("UPDATE product_images SET is_primary = 1 WHERE id = ?");
            $stmt->execute([$imageId]);
            
            // Update primary image in products table
            $stmt = $pdo->prepare("UPDATE products SET images = ? WHERE id = ?");
            $stmt->execute([$image['image_path'], $productId]);
            
            $pdo->commit();
            jsonResponse(true, "Primary image set successfully", null, 200);
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    } catch (Exception $e) {
        error_log("Set Primary Image Error: " . $e->getMessage());
        errorResponse('Failed to set primary image', 500);
    }
}

// Handle image deletion
function handleDeleteImage() {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in image deletion");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Get input data
        $data = getJsonInput();
        $imageId = isset($data['image_id']) ? (int)$data['image_id'] : null;
        
        if (!$imageId) {
            errorResponse('Image ID is required', 400);
        }
        
        // Get image info
        $stmt = $pdo->prepare("SELECT product_id, image_path, is_primary FROM product_images WHERE id = ?");
        $stmt->execute([$imageId]);
        $image = $stmt->fetch();
        
        if (!$image) {
            errorResponse('Image not found', 404);
        }
        
        // Start transaction
        $pdo->beginTransaction();
        
        try {
            // Delete from database
            $stmt = $pdo->prepare("DELETE FROM product_images WHERE id = ?");
            $result = $stmt->execute([$imageId]);
            
            if (!$result) {
                throw new Exception('Failed to delete image record');
            }
            
            // If this was the primary image, set a new primary image
            if ($image['is_primary']) {
                // Get another image for this product
                $stmt = $pdo->prepare("SELECT image_path FROM product_images WHERE product_id = ? LIMIT 1");
                $stmt->execute([$image['product_id']]);
                $newPrimary = $stmt->fetch();
                
                if ($newPrimary) {
                    // Set new primary in product_images table
                    $stmt = $pdo->prepare("UPDATE product_images SET is_primary = 1 WHERE image_path = ?");
                    $stmt->execute([$newPrimary['image_path']]);
                    
                    // Update primary image in products table
                    $stmt = $pdo->prepare("UPDATE products SET images = ? WHERE id = ?");
                    $stmt->execute([$newPrimary['image_path'], $image['product_id']]);
                } else {
                    // No more images, clear primary image in products table
                    $stmt = $pdo->prepare("UPDATE products SET images = '' WHERE id = ?");
                    $stmt->execute([$image['product_id']]);
                }
            }
            
            // Delete file
            $filePath = __DIR__ . '/..' . $image['image_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
            $pdo->commit();
            jsonResponse(true, "Image deleted successfully", null, 200);
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    } catch (Exception $e) {
        error_log("Image Deletion Error: " . $e->getMessage());
        errorResponse('Failed to delete image', 500);
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
        
        if (isset($data['category_id'])) {
            $updateFields[] = "category_id = ?";
            $params[] = (int)$data['category_id'];
        }
        
        if (isset($data['slug'])) {
            $updateFields[] = "slug = ?";
            $params[] = sanitize($data['slug']);
        }
        
        if (isset($data['stock_quantity'])) {
            $updateFields[] = "stock_quantity = ?";
            $params[] = (int)$data['stock_quantity'];
        }
        
        if (isset($data['is_featured'])) {
            $updateFields[] = "is_featured = ?";
            $params[] = (int)$data['is_featured'];
        }
        
        if (isset($data['in_stock'])) {
            $updateFields[] = "in_stock = ?";
            $params[] = (int)$data['in_stock'];
        }
        
        if (isset($data['rating'])) {
            $updateFields[] = "rating = ?";
            $params[] = (float)$data['rating'];
        }
        
        if (isset($data['reviewCount'])) {
            $updateFields[] = "reviewCount = ?";
            $params[] = (int)$data['reviewCount'];
        }
        
        if (isset($data['image'])) {
            $updateFields[] = "image = ?";
            $params[] = $data['image'];
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

// Helper function to create a slug from a title
function createSlug($string) {
    $slug = strtolower(trim($string));
    $slug = preg_replace('/[^a-z0-9-]/', '-', $slug);
    $slug = preg_replace('/-+/', '-', $slug);
    $slug = trim($slug, '-');
    return $slug;
} 