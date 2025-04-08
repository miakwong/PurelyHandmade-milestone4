<?php
/**
 * Comments API
 * Handles comment creation, retrieval, and deletion
 */

require_once '../includes/config.php';
require_once '../includes/db.php';
require_once '../includes/functions.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Get comment ID or product ID if provided
$commentId = isset($_GET['id']) ? (int)$_GET['id'] : null;
$productId = isset($_GET['product']) ? (int)$_GET['product'] : null;

// Handle request methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if ($productId) {
            getProductComments($productId);
        } else {
            jsonResponse(false, 'Product ID is required', null, 400);
        }
        break;
        
    case 'POST':
        checkAuth(); // Require authentication
        createComment();
        break;
        
    case 'DELETE':
        checkAuth(); // Require authentication
        if (!$commentId) {
            jsonResponse(false, 'Comment ID is required', null, 400);
        }
        deleteComment($commentId);
        break;
        
    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

/**
 * Get comments for a product
 * @param int $productId Product ID
 */
function getProductComments($productId) {
    $conn = getConnection();
    $sql = "SELECT c.*, u.username 
            FROM comments c 
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.product_id = ? 
            ORDER BY c.created_at DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $comments = [];
    while ($row = $result->fetch_assoc()) {
        $comments[] = $row;
    }
    
    jsonResponse(true, 'Comments retrieved successfully', $comments);
}

/**
 * Create a new comment
 */
function createComment() {
    // Get JSON data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (!isset($data['product_id']) || !isset($data['content'])) {
        jsonResponse(false, 'Product ID and content are required', null, 400);
    }
    
    $productId = (int)$data['product_id'];
    $content = sanitizeInput($data['content']);
    $userId = $_SESSION['user_id'];
    
    // Check if product exists
    $conn = getConnection();
    $checkSql = "SELECT id FROM products WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $productId);
    $checkStmt->execute();
    
    if ($checkStmt->get_result()->num_rows === 0) {
        jsonResponse(false, 'Product not found', null, 404);
    }
    
    // Insert comment
    $sql = "INSERT INTO comments (user_id, product_id, content) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iis", $userId, $productId, $content);
    
    if ($stmt->execute()) {
        $commentId = $conn->insert_id;
        
        // Get the inserted comment with username
        $selectSql = "SELECT c.*, u.username 
                     FROM comments c 
                     LEFT JOIN users u ON c.user_id = u.id
                     WHERE c.id = ?";
        $selectStmt = $conn->prepare($selectSql);
        $selectStmt->bind_param("i", $commentId);
        $selectStmt->execute();
        $comment = $selectStmt->get_result()->fetch_assoc();
        
        jsonResponse(true, 'Comment created successfully', $comment);
    } else {
        jsonResponse(false, 'Failed to create comment', null, 500);
    }
}

/**
 * Delete a comment
 * @param int $commentId Comment ID
 */
function deleteComment($commentId) {
    $conn = getConnection();
    $userId = $_SESSION['user_id'];
    $isAdmin = $_SESSION['is_admin'];
    
    // Check if comment exists and belongs to the user (or user is admin)
    $checkSql = "SELECT user_id FROM comments WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $commentId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        jsonResponse(false, 'Comment not found', null, 404);
    }
    
    $comment = $result->fetch_assoc();
    
    // Only allow deletion if user is admin or the comment belongs to the user
    if (!$isAdmin && $comment['user_id'] != $userId) {
        jsonResponse(false, 'You are not authorized to delete this comment', null, 403);
    }
    
    // Delete comment
    $sql = "DELETE FROM comments WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $commentId);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        jsonResponse(true, 'Comment deleted successfully');
    } else {
        jsonResponse(false, 'Comment could not be deleted', null, 500);
    }
} 