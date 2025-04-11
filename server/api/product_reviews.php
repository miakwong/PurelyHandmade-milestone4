<?php
// Reviews API

// Initialize error handling
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php_errors.log');
error_reporting(E_ALL);

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
$productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : null;
$reviewId = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : null;

// Handle request based on HTTP method
try {
    switch ($method) {
        case 'GET':
            if ($action === 'count') {
                // Handle count action - get total review count
                getTotalReviewCount();
            } else {
                handleGetRequest($productId, $reviewId);
            }
            break;
            
        case 'POST':
            requireLogin();
            handlePostRequest();
            break;
            
        case 'PUT':
            requireLogin();
            handlePutRequest($reviewId);
            break;
            
        case 'DELETE':
            requireLogin();
            handleDeleteRequest($reviewId);
            break;
            
        default:
            errorResponse('Method not allowed', 405);
            break;
    }
} catch (Exception $e) {
    error_log("Reviews API Error: " . $e->getMessage());
    jsonResponse(false, "Server error occurred: " . $e->getMessage(), null, 500);
}

/**
 * Get total count of reviews
 * 
 * @return void
 */
function getTotalReviewCount() {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in review count");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM product_reviews");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            jsonResponse(true, "Total review count", $result['count'], 200);
        } else {
            jsonResponse(true, "Total review count", 0, 200);
        }
    } catch (PDOException $e) {
        error_log("Database Error in getTotalReviewCount: " . $e->getMessage());
        jsonResponse(false, "Failed to get review count", null, 500);
    }
}

/**
 * Handle GET request
 * 
 * @param int|null $productId Product ID
 * @param int|null $reviewId Review ID
 * @return void
 */
function handleGetRequest($productId, $reviewId) {
    // Get a single review by ID
    if ($reviewId !== null) {
        try {
            $pdo = getConnection();
            if (!$pdo) {
                error_log("Database connection failed in review retrieval");
                jsonResponse(false, "Database connection failed", null, 500);
                return;
            }
            
            $stmt = $pdo->prepare("SELECT * FROM product_reviews WHERE id = ?");
            $stmt->execute([$reviewId]);
            $review = $stmt->fetch();
            
            if ($review === false) {
                errorResponse('Review not found', 404);
            }
            
            jsonResponse(true, "Review loaded", $review, 200);
        } catch (PDOException $e) {
            error_log("Database Error: " . $e->getMessage());
            errorResponse('Failed to load review: ' . $e->getMessage(), 500);
        }
    }
    
    // Get all reviews for admin (no product ID specified, but need admin access)
    if ($productId === null) {
        try {
            // 检查是否是管理员
            session_start();
            if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
                errorResponse('Admin access required', 403);
                return;
            }
            
            error_log("Admin is requesting all reviews");
            $pdo = getConnection();
            if (!$pdo) {
                error_log("Database connection failed in reviews retrieval");
                jsonResponse(false, "Database connection failed", null, 500);
                return;
            }
            
            // 获取所有评论，并连接用户和产品信息
            $stmt = $pdo->prepare("SELECT r.*, 
                                  u.username, u.avatar,
                                  p.name as product_name,
                                  p.image as product_image
                                  FROM product_reviews r 
                                  LEFT JOIN users u ON r.user_id = u.id 
                                  LEFT JOIN products p ON r.product_id = p.id 
                                  ORDER BY r.created_at DESC");
            $stmt->execute();
            $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log("Found " . count($reviews) . " total reviews");
            
            jsonResponse(true, "All reviews loaded", $reviews, 200);
            return;
        } catch (PDOException $e) {
            error_log("Database Error in getting all reviews: " . $e->getMessage());
            errorResponse('Failed to load reviews: ' . $e->getMessage(), 500);
            return;
        }
    }
    
    // Get all reviews for a product
    if ($productId !== null) {
        try {
            error_log("Getting reviews for product ID: " . $productId);
            $pdo = getConnection();
            if (!$pdo) {
                error_log("Database connection failed in reviews retrieval");
                jsonResponse(false, "Database connection failed", null, 500);
                return;
            }
            
            // Check if the product exists first
            $checkStmt = $pdo->prepare("SELECT id FROM products WHERE id = ?");
            $checkStmt->execute([$productId]);
            $product = $checkStmt->fetch();
            
            if (!$product) {
                error_log("Product not found with ID: " . $productId);
                jsonResponse(true, "Product not found, no reviews available", [
                    'reviews' => [],
                    'stats' => getEmptyStats()
                ], 200);
                return;
            }
            
            // Get reviews
            $stmt = $pdo->prepare("SELECT r.*, u.username, u.avatar 
                                  FROM product_reviews r 
                                  LEFT JOIN users u ON r.user_id = u.id 
                                  WHERE r.product_id = ? 
                                  ORDER BY r.created_at DESC");
            $stmt->execute([$productId]);
            $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log("Found " . count($reviews) . " reviews for product");
            
            // Also get review stats
            $stats = calculateReviewStats($productId);
            
            jsonResponse(true, "Reviews loaded", [
                'reviews' => $reviews,
                'stats' => $stats
            ], 200);
        } catch (PDOException $e) {
            error_log("Database Error in reviews retrieval: " . $e->getMessage());
            // Return empty data instead of error for better user experience
            jsonResponse(true, "Unable to load reviews, please try again later", [
                'reviews' => [],
                'stats' => getEmptyStats()
            ], 200);
        }
    }
}

/**
 * Handle POST request
 * 
 * @return void
 */
function handlePostRequest() {
    // Get JSON input data
    $data = getJsonInput();
    
    // Validate required fields
    validateRequired($data, ['product_id', 'rating', 'review_text']);
    
    // Get user ID from session
    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        errorResponse('User not authenticated', 401);
    }
    
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in review creation");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Check if user already reviewed this product
        $stmt = $pdo->prepare("SELECT id FROM product_reviews WHERE user_id = ? AND product_id = ?");
        $stmt->execute([$userId, (int)$data['product_id']]);
        $existingReview = $stmt->fetch();
        
        if ($existingReview) {
            errorResponse('You have already reviewed this product', 400);
        }
        
        // Insert new review
        $stmt = $pdo->prepare("INSERT INTO product_reviews (product_id, user_id, rating, review_text, created_at) 
                              VALUES (?, ?, ?, ?, NOW())");
        $result = $stmt->execute([
            (int)$data['product_id'],
            $userId,
            (int)$data['rating'],
            sanitize($data['review_text'])
        ]);
        
        if (!$result) {
            errorResponse('Failed to save review', 500);
        }
        
        $newReviewId = $pdo->lastInsertId();
        
        // Get the new review
        $stmt = $pdo->prepare("SELECT r.*, u.username, u.avatar 
                              FROM product_reviews r 
                              LEFT JOIN users u ON r.user_id = u.id 
                              WHERE r.id = ?");
        $stmt->execute([$newReviewId]);
        $newReview = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Update product rating
        updateProductRating((int)$data['product_id']);
        
        // Return the new review
        jsonResponse(true, "Review submitted successfully", $newReview, 201);
    } catch (PDOException $e) {
        error_log("Database Error in handlePostRequest: " . $e->getMessage());
        errorResponse('Failed to save review', 500);
    }
}

/**
 * Calculate review statistics for a product
 * 
 * @param int $productId Product ID
 * @return array Review statistics
 */
function calculateReviewStats($productId) {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in review stats calculation");
            return getEmptyStats();
        }
        
        // Get average rating
        $stmt = $pdo->prepare("SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM product_reviews WHERE product_id = ?");
        $stmt->execute([$productId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            return getEmptyStats();
        }
        
        // Get rating distribution
        $stmt = $pdo->prepare("SELECT rating, COUNT(*) as count FROM product_reviews WHERE product_id = ? GROUP BY rating ORDER BY rating DESC");
        $stmt->execute([$productId]);
        $distributionRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format distribution data
        $distribution = [
            '5_star' => 0,
            '4_star' => 0,
            '3_star' => 0,
            '2_star' => 0,
            '1_star' => 0
        ];
        
        foreach ($distributionRows as $row) {
            $key = $row['rating'] . '_star';
            $distribution[$key] = (int)$row['count'];
        }
        
        return [
            'avg_rating' => round($result['avg_rating'] ?? 0, 1),
            'total_reviews' => (int)($result['total_reviews'] ?? 0),
            'rating_distribution' => $distribution
        ];
    } catch (PDOException $e) {
        error_log("Database Error in calculateReviewStats: " . $e->getMessage());
        return getEmptyStats();
    }
}

/**
 * Update product rating
 * 
 * @param int $productId Product ID
 * @return bool Success flag
 */
function updateProductRating($productId) {
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in product rating update");
            return false;
        }
        
        // Get review stats
        $stats = calculateReviewStats($productId);
        
        // Update product
        $stmt = $pdo->prepare("UPDATE products SET rating = ?, reviewCount = ? WHERE id = ?");
        return $stmt->execute([
            $stats['avg_rating'],
            $stats['total_reviews'],
            $productId
        ]);
    } catch (PDOException $e) {
        error_log("Database Error in updateProductRating: " . $e->getMessage());
        return false;
    }
}

/**
 * Handle PUT request to update a review
 * 
 * @param int $reviewId Review ID
 * @return void
 */
function handlePutRequest($reviewId) {
    // Check if review ID is provided
    if ($reviewId === null) {
        errorResponse('Review ID is required', 400);
    }
    
    // Get JSON input data
    $data = getJsonInput();
    
    // Validate required fields
    validateRequired($data, ['rating', 'review_text']);
    
    // Get user ID from session
    $userId = $_SESSION['user_id'] ?? null;
    
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in review update");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Check if review exists and belongs to user
        $stmt = $pdo->prepare("SELECT product_id FROM product_reviews WHERE id = ?");
        $stmt->execute([$reviewId]);
        $review = $stmt->fetch();
        
        if (!$review) {
            errorResponse('Review not found', 404);
        }
        
        // Check if user owns this review
        $stmt = $pdo->prepare("SELECT id FROM product_reviews WHERE id = ? AND user_id = ?");
        $stmt->execute([$reviewId, $userId]);
        $userReview = $stmt->fetch();
        
        if (!$userReview) {
            errorResponse('You can only update your own reviews', 403);
        }
        
        // Update review
        $stmt = $pdo->prepare("UPDATE product_reviews SET rating = ?, review_text = ? WHERE id = ?");
        $result = $stmt->execute([
            (int)$data['rating'],
            sanitize($data['review_text']),
            $reviewId
        ]);
        
        if (!$result) {
            errorResponse('Failed to update review', 500);
        }
        
        // Get the updated review
        $stmt = $pdo->prepare("SELECT r.*, u.username, u.avatar 
                              FROM product_reviews r 
                              LEFT JOIN users u ON r.user_id = u.id 
                              WHERE r.id = ?");
        $stmt->execute([$reviewId]);
        $updatedReview = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Update product rating
        updateProductRating($review['product_id']);
        
        // Return the updated review
        jsonResponse(true, "Review updated successfully", $updatedReview, 200);
    } catch (PDOException $e) {
        error_log("Database Error in handlePutRequest: " . $e->getMessage());
        errorResponse('Failed to update review', 500);
    }
}

/**
 * Handle DELETE request to remove a review
 * 
 * @param int $reviewId Review ID
 * @return void
 */
function handleDeleteRequest($reviewId) {
    // Check if review ID is provided
    if ($reviewId === null) {
        errorResponse('Review ID is required', 400);
    }
    
    // Get user ID from session
    $userId = $_SESSION['user_id'] ?? null;
    $isAdmin = $_SESSION['is_admin'] ?? false;
    
    try {
        $pdo = getConnection();
        if (!$pdo) {
            error_log("Database connection failed in review deletion");
            jsonResponse(false, "Database connection failed", null, 500);
            return;
        }
        
        // Get product ID first for later rating update
        $stmt = $pdo->prepare("SELECT product_id FROM product_reviews WHERE id = ?");
        $stmt->execute([$reviewId]);
        $review = $stmt->fetch();
        
        if (!$review) {
            errorResponse('Review not found', 404);
        }
        
        // Check if user owns this review or is admin
        if (!$isAdmin) {
            $stmt = $pdo->prepare("SELECT id FROM product_reviews WHERE id = ? AND user_id = ?");
            $stmt->execute([$reviewId, $userId]);
            $userReview = $stmt->fetch();
            
            if (!$userReview) {
                errorResponse('You can only delete your own reviews', 403);
            }
        }
        
        // Delete review
        $stmt = $pdo->prepare("DELETE FROM product_reviews WHERE id = ?");
        $result = $stmt->execute([$reviewId]);
        
        if (!$result) {
            errorResponse('Failed to delete review', 500);
        }
        
        // Update product rating
        updateProductRating($review['product_id']);
        
        // Return success response
        jsonResponse(true, "Review deleted successfully", null, 200);
    } catch (PDOException $e) {
        error_log("Database Error in handleDeleteRequest: " . $e->getMessage());
        errorResponse('Failed to delete review', 500);
    }
}

// Get empty stats structure for consistency
function getEmptyStats() {
    return [
        'avg_rating' => 0,
        'total_reviews' => 0,
        'rating_distribution' => [
            '5_star' => 0,
            '4_star' => 0,
            '3_star' => 0,
            '2_star' => 0,
            '1_star' => 0
        ]
    ];
}
