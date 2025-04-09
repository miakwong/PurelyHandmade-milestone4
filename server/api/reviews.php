<?php
/**
 * Reviews API
 * 
 * Handles CRUD operations for product reviews
 */
ini_set('display_errors', 0);
error_reporting(0);

// Include common functions
require_once '../includes/functions.php';

// Get database configuration
global $db_config;
if (!isset($db_config)) {
    $db_config = require_once '../config/database.php';
}

// Get the HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// Get action and product ID from query string
$action = isset($_GET['action']) ? $_GET['action'] : '';
$productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : null;

try {
    // Set headers
    header('Content-Type: application/json');
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST");
    header("Access-Control-Allow-Headers: Content-Type");

    // Load reviews from JSON file
    if (!file_exists($db_config['files']['reviews'])) {
        errorResponse('Reviews file not found', 500);
    }
    
    if (!is_readable($db_config['files']['reviews'])) {
        errorResponse('Reviews file is not readable', 500);
    }
    
    $reviews = loadJsonData($db_config['files']['reviews']);
    if ($reviews === null) {
        errorResponse('Failed to load reviews data', 500);
    }

    // Handle request based on HTTP method
    switch ($method) {
        case 'GET':
            if ($action === 'get' && $productId) {
                handleGetRequest($productId, $reviews);
            } else {
                errorResponse('Invalid request parameters', 400);
            }
            break;
        
        case 'POST':
            if ($action === 'add') {
                // Check if user is logged in
                if (!isset($_SESSION['user_id'])) {
                    errorResponse('You must be logged in to post a review', 401);
                }
                handlePostRequest($reviews);
            } else {
                errorResponse('Invalid action', 400);
            }
            break;
        
        default:
            errorResponse('Method not allowed', 405);
            break;
    }
} catch (Exception $e) {
    errorResponse('Internal server error', 500);
}

/**
 * Handle GET request for reviews
 */
function handleGetRequest($productId, $reviews) {
    try {
        // Filter reviews for the product
        $productReviews = array_filter($reviews, function($review) use ($productId) {
            return $review['product_id'] === $productId;
        });
        
        if (empty($productReviews)) {
            // Return empty reviews instead of error
            $response = [
                'success' => true,
                'reviews' => [],
                'stats' => [
                    'total_reviews' => 0,
                    'avg_rating' => 0,
                    'rating_distribution' => [
                        'five_star' => 0,
                        'four_star' => 0,
                        'three_star' => 0,
                        'two_star' => 0,
                        'one_star' => 0
                    ]
                ]
            ];
            jsonResponse(true, "Response loaded", $response, 200);
            return;
        }
        
        // Calculate statistics
        $stats = calculateReviewStats($productReviews);
        
        // Format the response
        $response = [
            'success' => true,
            'reviews' => array_values($productReviews),
            'stats' => $stats
        ];
        
        jsonResponse(true, "All Response loaded", $response, 200);
    } catch (Exception $e) {
        errorResponse('Failed to retrieve reviews', 500);
    }
}

/**
 * Handle POST request for adding a review
 */
function handlePostRequest(&$reviews) {
    global $db_config;
    
    // Get user ID from session
    $userId = $_SESSION['user_id'];
    
    // Get review data
    $productId = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
    $rating = isset($_POST['rating']) ? floatval($_POST['rating']) : 0;
    $reviewText = isset($_POST['review_text']) ? trim($_POST['review_text']) : '';
    
    // Validate data
    if ($productId <= 0) {
        errorResponse('Invalid product ID', 400);
    }
    
    if ($rating < 1 || $rating > 5) {
        errorResponse('Rating must be between 1 and 5', 400);
    }
    
    if (empty($reviewText)) {
        errorResponse('Review text is required', 400);
    }
    
    try {
        // Check if product exists
        $products = loadJsonData($db_config['files']['products']);
        $productExists = false;
        foreach ($products as $product) {
            if ($product['id'] === $productId) {
                $productExists = true;
                break;
            }
        }
        
        if (!$productExists) {
            errorResponse('Product not found', 404);
        }
        
        // Check if user has already reviewed this product
        foreach ($reviews as $review) {
            if ($review['product_id'] === $productId && $review['user_id'] === $userId) {
                errorResponse('You have already reviewed this product', 400);
            }
        }
        
        // Generate new review ID
        $existingIds = array_column($reviews, 'id');
        $newId = generateId($existingIds);
        
        // Create new review
        $newReview = [
            'id' => $newId,
            'product_id' => $productId,
            'user_id' => $userId,
            'rating' => $rating,
            'review_text' => $reviewText,
            'created_at' => date('c')
        ];
        
        // Add new review to array
        $reviews[] = $newReview;
        
        // Save updated reviews data
        if (!saveJsonData($db_config['files']['reviews'], $reviews)) {
            errorResponse('Failed to save review', 500);
        }
        
        // Update product rating and review count
        $productReviews = array_filter($reviews, function($review) use ($productId) {
            return $review['product_id'] === $productId;
        });
        $stats = calculateReviewStats($productReviews);
        
        // Update product data
        foreach ($products as &$product) {
            if ($product['id'] === $productId) {
                $product['rating'] = $stats['avg_rating'];
                $product['reviewCount'] = $stats['total_reviews'];
                break;
            }
        }
        
        if (!saveJsonData($db_config['files']['products'], $products)) {
            errorResponse('Failed to update product rating', 500);
        }
        
        jsonResponse(true, 'Review submitted successfully', [
            'review' => $newReview,
            'stats' => $stats
        ], 201);
    } catch (Exception $e) {
        errorResponse('Failed to submit review', 500);
    }
}

/**
 * Calculate review statistics
 */
function calculateReviewStats($reviews) {
    $totalReviews = count($reviews);
    $ratings = array_column($reviews, 'rating');
    $avgRating = $totalReviews > 0 ? array_sum($ratings) / $totalReviews : 0;
    
    $ratingDistribution = [
        '5_star' => 0,
        '4_star' => 0,
        '3_star' => 0,
        '2_star' => 0,
        '1_star' => 0
    ];
    
    foreach ($ratings as $rating) {
        $starCount = floor($rating);
        if ($starCount >= 1 && $starCount <= 5) {
            $key = $starCount . '_star';
            $ratingDistribution[$key]++;
        }
    }
    
    return [
        'total_reviews' => $totalReviews,
        'avg_rating' => round($avgRating, 1),
        'rating_distribution' => $ratingDistribution
    ];
}
