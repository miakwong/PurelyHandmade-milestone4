# Technical Documentation for PurelyHandmade-Clean Project

## Table of Contents
1. [Current Project Structure](#1-current-project-structure)
2. [Current Frontend Implementation](#2-current-frontend-implementation)
3. [Simplified Backend Structure](#3-simplified-backend-structure)
4. [Security Implementation](#4-security-implementation)
5. [Minimum Requirements Implementation Plan](#5-minimum-requirements-implementation-plan)
6. [Development Guidelines](#6-development-guidelines)
7. [Deployment Configuration](#7-deployment-configuration)

## 1. Current Project Structure

```
PurelyHandmade-Clean/
├── .idea/                 # IDE configuration files
├── docs/                  # Project documentation
├── src/                   # Source code
│   ├── views/            # Frontend views
│   ├── assets/           # Static assets
│   └── .DS_Store         
├── .gitignore            # Git ignore configuration
├── check-localStorage.html    # Local storage debugging tool
├── create-admin.html     # Admin creation tool
└── index.html            # Main entry page
```

## 2. Current Frontend Implementation

### 2.1 Key Features
- Client-side user authentication using localStorage
- Product catalog with categories
- Shopping cart functionality
- Admin interface for user management
- Responsive design using Bootstrap

### 2.2 Frontend Technologies
- HTML5
- CSS3 with Bootstrap 5.3.0
- JavaScript (Vanilla)
- Local Storage for data persistence
- Bootstrap Icons
- jQuery 3.6.0

## 3. Simplified Backend Structure

### 3.1 Server Directory Structure
```
server/
├── includes/            # Common functions and database connection
│   ├── config.php      # Database configuration
│   ├── db.php          # Database connection
│   └── functions.php   # Helper functions
├── api/                # PHP API endpoints
│   ├── auth.php        # Authentication handlers
│   ├── products.php    # Product handlers
│   ├── users.php       # User handlers
│   └── comments.php    # Comment handlers
└── uploads/            # File upload directory
    └── images/         # Product and user images
```

### 3.2 Database Schema

```sql
-- Users Table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    image_path VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INT,
    stock INT DEFAULT 0,
    image_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT
);

-- Comments Table
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    product_id INT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 3.3 Basic PHP Files Structure

```php
// config.php
<?php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'purely_handmade');

// db.php
<?php
function getConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    return $conn;
}

// functions.php
<?php
session_start();

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function isAdmin() {
    return isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;
}

function checkAuth() {
    if (!isLoggedIn()) {
        header('HTTP/1.1 401 Unauthorized');
        exit('Not authorized');
    }
}

// Example API endpoint (auth.php)
<?php
require_once '../includes/config.php';
require_once '../includes/db.php';
require_once '../includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'];
    $password = $data['password'];
    
    $conn = getConnection();
    $stmt = $conn->prepare("SELECT id, password_hash, is_admin FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($user = $result->fetch_assoc()) {
        if (password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['is_admin'] = $user['is_admin'];
            echo json_encode(['success' => true]);
        }
    }
    $conn->close();
}
```

### 3.4 API Endpoints

```
auth.php
- POST /api/auth.php?action=login     # User login
- POST /api/auth.php?action=register  # User registration
- GET  /api/auth.php?action=logout    # User logout

products.php
- GET  /api/products.php              # Get all products
- GET  /api/products.php?id=1         # Get single product
- POST /api/products.php              # Create product (admin)

users.php
- GET  /api/users.php                 # Get users (admin)
- PUT  /api/users.php?id=1            # Update user
- POST /api/users.php?action=delete   # Delete user (admin)

comments.php
- POST /api/comments.php              # Create comment
- GET  /api/comments.php?product=1    # Get comments for product
```

## 4. Security Implementation

### 4.1 Authentication
- PHP session-based authentication
- Password hashing using password_hash()
- Basic input validation

### 4.2 Data Protection
- Prepared statements for SQL queries
- Basic input sanitization
- Simple file upload validation

## 5. Minimum Requirements Implementation Plan

### 5.1 User Authentication
- Convert localStorage auth to PHP sessions
- Implement basic login/register system
- Add password hashing

### 5.2 Database Integration
- Set up MySQL connection
- Create basic database operations
- Implement simple error handling

### 5.3 Security Features
- Basic session management
- Simple input validation
- File upload restrictions

### 5.4 AJAX Implementation
- Comment system updates
- Product list filtering
- Cart updates

### 5.5 Responsive Design
- Already implemented with Bootstrap
- Enhance for different screen sizes

## 6. Development Guidelines

### 6.1 Code Organization
- Keep PHP files simple and focused
- Use includes for common functions
- Maintain consistent file structure

### 6.2 Security Practices
- Validate user inputs
- Use prepared statements
- Implement basic error handling

### 6.3 Performance
- Keep queries simple
- Optimize image uploads
- Basic error logging

## 7. Deployment Configuration

### 7.1 Path Configuration

```php
// includes/config.php
<?php
// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'purely_handmade');

// Path Configuration
define('BASE_URL', 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade'); // School server path
define('SITE_ROOT', dirname(dirname(__FILE__))); // Points to project root
define('UPLOAD_PATH', SITE_ROOT . '/uploads');
define('API_PATH', '/api');

// Frontend paths for JavaScript
define('ASSETS_URL', BASE_URL . '/src/assets');
define('API_URL', BASE_URL . API_PATH);
```

### 7.2 Frontend Path Configuration

```javascript
// src/assets/js/config.js
const config = {
    baseUrl: 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade', // School server path
    apiUrl: 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade/api',
    assetsUrl: 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade/src/assets',
    uploadsUrl: 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade/uploads'
};

// Example usage in other JS files
function loadImage(path) {
    return `${config.assetsUrl}/img/${path}`;
}

function apiCall(endpoint) {
    return fetch(`${config.apiUrl}/${endpoint}`);
}
```

### 7.3 HTML Path Updates

```html
<!-- Update all HTML files to use dynamic paths -->
<link rel="stylesheet" href="<?php echo ASSETS_URL; ?>/css/style.css">
<script src="<?php echo ASSETS_URL; ?>/js/script.js"></script>
<img src="<?php echo ASSETS_URL; ?>/img/logo.png">

<!-- For static HTML files, use the config.js approach -->
<script src="src/assets/js/config.js"></script>
<script>
document.getElementById('myImage').src = `${config.assetsUrl}/img/logo.png`;
</script>
```

### 7.4 .htaccess Configuration

```apache
# Root .htaccess
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /~miakuang/PurelyHandmade/
    
    # Handle API requests
    RewriteRule ^api/(.*)$ server/api/$1 [L]
    
    # Handle static files
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ index.php [L]
</IfModule>

# Add CORS headers if needed
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
</IfModule>
```

### 7.5 Development vs Production Configuration

为了方便本地开发和服务器部署，建议创建配置切换机制：

```php
// includes/config.php
<?php
// Environment Detection
$isProduction = (strpos($_SERVER['HTTP_HOST'], 'cosc360.ok.ubc.ca') !== false);

// Base URL Configuration
if ($isProduction) {
    define('BASE_URL', 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade');
} else {
    define('BASE_URL', ''); // Local development
}

// Other configurations...
```

```javascript
// src/assets/js/config.js
const isProduction = window.location.hostname.includes('cosc360.ok.ubc.ca');
const config = {
    baseUrl: isProduction 
        ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade'
        : '',
    // Other paths...
};
```

---

*Note: This documentation outlines a simplified implementation that meets the minimum requirements while maintaining basic security and functionality. The path configuration section provides flexibility for deployment to different environments.* 