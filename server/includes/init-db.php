<?php
/**
 * Database Initialization Script
 * Creates database tables if they do not exist and imports data
 */

require_once 'config.php';
require_once 'db_credentials.php';
require_once 'functions.php';

// Set longer execution time to prevent timeout during large data imports
set_time_limit(300);

echo "<h1>Database Initialization</h1>";
echo "<pre>";

try {
    // Create database connection (without selecting database)
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ];
    
    // Use the database credentials for connection
    if (defined('DB_SOCKET') && !empty(DB_SOCKET)) {
        $dsn = "mysql:unix_socket=" . DB_SOCKET;
        echo "Using socket connection: " . DB_SOCKET . "\n";
    } else {
        $dsn = "mysql:host=" . DB_HOST;
        if (defined('DB_PORT') && !empty(DB_PORT)) {
            $dsn .= ";port=" . DB_PORT;
        }
        echo "Using TCP connection: " . DB_HOST . "\n";
    }
    
    // Create initial connection
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    
    // Create database if it doesn't exist
    $sql = "CREATE DATABASE IF NOT EXISTS " . DB_NAME . " DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    $pdo->exec($sql);
    echo "Database created or already exists: " . DB_NAME . "\n";
    
    // Select the database
    $pdo->exec("USE " . DB_NAME);
    
    // Disable foreign key checks (when creating tables)
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    
    // Create users table
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "Table created: users\n";
    
    // Create categories table
    $pdo->exec("CREATE TABLE IF NOT EXISTS categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        image VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "Table created: categories\n";
    
    // Create products table
    $pdo->exec("CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        category_id INT,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        stock_quantity INT NOT NULL DEFAULT 0,
        image VARCHAR(255),
        is_featured BOOLEAN DEFAULT FALSE,
        in_stock BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "Table created: products\n";
    
    // Create product_images table
    $pdo->exec("CREATE TABLE IF NOT EXISTS product_images (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL,
        image_path VARCHAR(255) NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "Table created: product_images\n";
    
    // Create orders table
    $pdo->exec("CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "Table created: orders\n";
    
    // Create order_items table
    $pdo->exec("CREATE TABLE IF NOT EXISTS order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "Table created: order_items\n";
    
    // Re-enable foreign key checks
    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    
    // Create default admin user if none exists
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    $adminCount = $stmt->fetchColumn();
    
    if ($adminCount == 0) {
        $username = 'miakuang';
        $email = 'miakuang@example.com';
        $password = 'miakuang';
        $passwordHash = password_hash($password, PASSWORD_DEFAULT, ['cost' => PASSWORD_COST]);
        
        $stmt = $pdo->prepare("INSERT INTO users 
            (username, email, password, name, role) 
            VALUES (?, ?, ?, 'Mia Kuang', 'admin')");
        
        $stmt->execute([$username, $email, $passwordHash]);
        
        echo "Default admin user created: username=miakuang, password=miakuang\n";
    } else {
        echo "Admin user already exists, skipping creation\n";
    }
    
    // Import category data
    $categoriesJsonPath = __DIR__ . '/../data/categories.json';
    if (file_exists($categoriesJsonPath)) {
        // Check if categories table is empty
        $stmt = $pdo->query("SELECT COUNT(*) FROM categories");
        $categoriesCount = $stmt->fetchColumn();
        
        if ($categoriesCount == 0) {
            echo "Importing category data from JSON file...\n";
            $categoriesData = json_decode(file_get_contents($categoriesJsonPath), true);
            
            if ($categoriesData) {
                $insertCategoryStmt = $pdo->prepare("INSERT INTO categories 
                    (id, name, slug, description, image) 
                    VALUES (?, ?, ?, ?, ?)");
                
                foreach ($categoriesData as $category) {
                    $insertCategoryStmt->execute([
                        $category['id'],
                        $category['name'],
                        $category['slug'],
                        $category['description'],
                        $category['image']
                    ]);
                }
                
                echo "Successfully imported " . count($categoriesData) . " categories\n";
                // Reset auto-increment counter
                $pdo->exec("ALTER TABLE categories AUTO_INCREMENT = " . (max(array_column($categoriesData, 'id')) + 1));
            } else {
                echo "Error: Could not parse categories JSON file\n";
            }
        } else {
            echo "Category data already exists in database, skipping import\n";
        }
    } else {
        echo "Categories JSON file not found: $categoriesJsonPath\n";
    }
    
    // Import product data
    $productsJsonPath = __DIR__ . '/../data/products.json';
    if (file_exists($productsJsonPath)) {
        // Check if products table is empty
        $stmt = $pdo->query("SELECT COUNT(*) FROM products");
        $productsCount = $stmt->fetchColumn();
        
        if ($productsCount == 0) {
            echo "Importing product data from JSON file...\n";
            $productsData = json_decode(file_get_contents($productsJsonPath), true);
            
            if ($productsData) {
                // Prepare statements for product and product image insertion
                $insertProductStmt = $pdo->prepare("INSERT INTO products 
                    (id, name, slug, price, description, category_id, 
                    stock_quantity, image, is_featured, in_stock, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                
                $insertImageStmt = $pdo->prepare("INSERT INTO product_images 
                    (product_id, image_path, is_primary) 
                    VALUES (?, ?, ?)");
                
                foreach ($productsData as $product) {
                    // Get first image as main image
                    $mainImage = isset($product['images'][0]) ? $product['images'][0] : null;
                    
                    // Insert product
                    $insertProductStmt->execute([
                        $product['id'],
                        $product['name'],
                        $product['slug'],
                        $product['price'],
                        $product['description'],
                        $product['category_id'],
                        $product['stock_quantity'] ?? 0,
                        $mainImage,
                        $product['is_featured'] ?? false,
                        $product['in_stock'] ?? true,
                        $product['created_at'] ?? date('Y-m-d H:i:s')
                    ]);
                    
                    // Insert product images
                    if (isset($product['images']) && is_array($product['images'])) {
                        foreach ($product['images'] as $index => $imagePath) {
                            $insertImageStmt->execute([
                                $product['id'],
                                $imagePath,
                                $index === 0  // First image is primary
                            ]);
                        }
                    }
                }
                
                echo "Successfully imported " . count($productsData) . " products\n";
                // Reset auto-increment counter
                $pdo->exec("ALTER TABLE products AUTO_INCREMENT = " . (max(array_column($productsData, 'id')) + 1));
            } else {
                echo "Error: Could not parse products JSON file\n";
            }
        } else {
            echo "Product data already exists in database, skipping import\n";
        }
    } else {
        echo "Products JSON file not found: $productsJsonPath\n";
    }
    
    echo "Database initialization completed successfully!\n";
    echo "You can now access PHPMyAdmin to view the tables and data in database " . DB_NAME . ".\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "</pre>";
echo "<p><a href='/'>Return to homepage</a></p>"; 