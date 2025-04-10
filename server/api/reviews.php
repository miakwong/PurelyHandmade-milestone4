<?php
// Reviews API

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
$productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : null;
$reviewId = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Handle request based on HTTP method
try {
    switch ($method) {
        case 'GET':
            handleGetRequest($productId, $reviewId);
            break;
            
        case 'POST':
            // Require authentication for creating reviews
            requireLogin();
            handlePostRequest();
            break;
            
        case 'PUT':
            // Require authentication for updating reviews
            requireLogin();
            handlePutRequest($reviewId);
            break;
            
        case 'DELETE':
            // Require authentication for deleting reviews
            requireLogin();
            handleDeleteRequest($reviewId);
            break;
            
        default:
            // Method not allowed
            errorResponse('Method not allowed', 405);
            break;
    }
} catch (Exception $e) {
    error_log("Reviews API Error: " . $e->getMessage());
    jsonResponse(false, "Server error occurred. Please try again later.", null, 500);
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
            errorResponse('Failed to load review', 500);
        }
    }
    
    // Get all reviews for a product
    if ($productId !== null) {
        try {
            $pdo = getConnection();
            if (!$pdo) {
                error_log("Database connection failed in reviews retrieval");
                jsonResponse(false, "Database connection failed", null, 500);
                return;
            }
            
            $stmt = $pdo->prepare("SELECT r.*, u.username, u.avatar 
                                  FROM product_reviews r 
                                  LEFT JOIN users u ON r.user_id = u.id 
                                  WHERE r.product_id = ? 
                                  ORDER BY r.created_at DESC");
            $stmt->execute([$productId]);
            $reviews = $stmt->fetchAll();
            
            // Also get review stats
            $stats = calculateReviewStats($productId);
            
            jsonResponse(true, "Reviews loaded", [
                'reviews' => $reviews,
                'stats' => $stats
            ], 200);
        } catch (PDOException $e) {
            error_log("Database Error: " . $e->getMessage());
            errorResponse('Failed to load reviews', 500);
        }
    }
    
    // No product ID provided
    errorResponse('Product ID is required', 400);
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
        $newReview = $stmt->fetch();
        
        // Update product rating
        updateProductRating((int)$data['product_id']);
        
        // Return the new review
        jsonResponse(true, "Review submitted successfully", $newReview, 201);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
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
            return [
                'average' => 0,
                'count' => 0,
                'distribution' => []
            ];
        }
        
        // Get average rating
        $stmt = $pdo->prepare("SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM product_reviews WHERE product_id = ?");
        $stmt->execute([$productId]);
        $result = $stmt->fetch();
        
        // Get rating distribution
        $stmt = $pdo->prepare("SELECT rating, COUNT(*) as count FROM product_reviews WHERE product_id = ? GROUP BY rating ORDER BY rating DESC");
        $stmt->execute([$productId]);
        $distribution = $stmt->fetchAll();
        
        return [
            'average' => round($result['avg_rating'] ?? 0, 1),
            'count' => (int)$result['count'],
            'distribution' => $distribution
        ];
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        return [
            'average' => 0,
            'count' => 0,
            'distribution' => []
        ];
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
            $stats['average'],
            $stats['count'],
            $productId
        ]);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
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
        $updatedReview = $stmt->fetch();
        
        // Update product rating
        updateProductRating($review['product_id']);
        
        // Return the updated review
        jsonResponse(true, "Review updated successfully", $updatedReview, 200);
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
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
        error_log("Database Error: " . $e->getMessage());
        errorResponse('Failed to delete review', 500);
    }
}
