<?php
//Database Initialization in phpmyadmin
require_once 'config.php';
require_once 'db_credentials.php';
require_once 'functions.php';

// Set longer execution time
set_time_limit(300);

// Set the real database name
$DB_NAME_REAL = "miakuang";

// All stmts prevent sql injection
function userExists($pdo, $userId) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    return $stmt->fetchColumn() > 0;
}

echo "<h1>Database Initialization</h1>";
echo "<pre>";

try {
    // Create database connection
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ];

    // Force TCP connection for server environment
    $dsn = "mysql:host=" . DB_HOST;
    if (defined('DB_PORT') && !empty(DB_PORT)) {
        $dsn .= ";port=" . DB_PORT;
    }
    echo "Using TCP connection: " . DB_HOST . "\n";

    // Create initial connection
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);

    // Create database if it doesn't exist
    $sql = "CREATE DATABASE IF NOT EXISTS " . $DB_NAME_REAL . " DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    $pdo->exec($sql);
    echo "Database created or already exists: " . $DB_NAME_REAL . "\n";

    // Select the database
    $pdo->exec("USE " . $DB_NAME_REAL);
    echo "Connected to database: " . $DB_NAME_REAL . "\n";

    // Disable foreign key checks (when creating tables)
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');

    // Create users table
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        avatar LONGBLOB DEFAULT NULL,
        birthday DATE,
        gender ENUM('male', 'female', 'other') DEFAULT 'other',
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
        rating DECIMAL(2, 1) DEFAULT 0,
        reviewCount INT DEFAULT 0,
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

    // Create product_reviews table
    $pdo->exec("CREATE TABLE IF NOT EXISTS product_reviews (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL,
        user_id INT NOT NULL,
        rating DECIMAL(2, 1) NOT NULL CHECK (rating BETWEEN 1 AND 5),
        review_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "Table created: product_reviews\n";

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
            (username, email, password, name, role, avatar, birthday, gender)
            VALUES (?, ?, ?, 'Mia Kuang', 'admin', NULL, '1990-01-01', 'female')");

        $stmt->execute([$username, $email, $passwordHash]);

        echo "Default admin user created: username=m***, password=***\n";

        // Create additional test users for review data
        // User ID 2
        $stmt = $pdo->prepare("INSERT INTO users
            (id, username, email, password, name, role, avatar, birthday, gender)
            VALUES (2, 'testuser1', 'testuser1@example.com', ?, 'Test User 1', 'user', NULL, '1990-01-15', 'male')");
        $stmt->execute([password_hash('password123', PASSWORD_DEFAULT, ['cost' => PASSWORD_COST])]);

        // User ID 3
        $stmt = $pdo->prepare("INSERT INTO users
            (id, username, email, password, name, role, avatar, birthday, gender)
            VALUES (3, 'testuser2', 'testuser2@example.com', ?, 'Test User 2', 'user', NULL, '1992-05-20', 'female')");
        $stmt->execute([password_hash('password123', PASSWORD_DEFAULT, ['cost' => PASSWORD_COST])]);

        // User ID 4
        $stmt = $pdo->prepare("INSERT INTO users
            (id, username, email, password, name, role, avatar, birthday, gender)
            VALUES (4, 'testuser3', 'testuser3@example.com', ?, 'Test User 3', 'user', NULL, '1995-11-30', 'other')");
        $stmt->execute([password_hash('password123', PASSWORD_DEFAULT, ['cost' => PASSWORD_COST])]);

        echo "Created 3 additional test users for review data\n";
    } else {
        echo "Admin user already exists, skipping creation\n";

        // Check if test users exist
        $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE id IN (2, 3, 4)");
        $testUserCount = $stmt->fetchColumn();

        if ($testUserCount < 3) {
            // Create missing test users
            if (!userExists($pdo, 2)) {
                $stmt = $pdo->prepare("INSERT INTO users
                    (id, username, email, password, name, role, avatar, birthday, gender)
                    VALUES (2, 'testuser1', 'testuser1@example.com', ?, 'Test User 1', 'user', NULL, '1990-01-15', 'male')");
                $stmt->execute([password_hash('password123', PASSWORD_DEFAULT, ['cost' => PASSWORD_COST])]);
            }

            if (!userExists($pdo, 3)) {
                $stmt = $pdo->prepare("INSERT INTO users
                    (id, username, email, password, name, role, avatar, birthday, gender)
                    VALUES (3, 'testuser2', 'testuser2@example.com', ?, 'Test User 2', 'user', NULL, '1992-05-20', 'female')");
                $stmt->execute([password_hash('password123', PASSWORD_DEFAULT, ['cost' => PASSWORD_COST])]);
            }

            if (!userExists($pdo, 4)) {
                $stmt = $pdo->prepare("INSERT INTO users
                    (id, username, email, password, name, role, avatar, birthday, gender)
                    VALUES (4, 'testuser3', 'testuser3@example.com', ?, 'Test User 3', 'user', NULL, '1995-11-30', 'other')");
                $stmt->execute([password_hash('password123', PASSWORD_DEFAULT, ['cost' => PASSWORD_COST])]);
            }

            echo "Created missing test users for review data\n";
        }
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

                    // Convert ISO datetime format (2023-04-01T10:30:00Z) to MySQL format (2023-04-01 10:30:00)
                    $createdAt = isset($product['created_at']) ? $product['created_at'] : date('Y-m-d H:i:s');
                    if (isset($product['created_at']) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $createdAt)) {
                        $createdAt = str_replace('T', ' ', substr($createdAt, 0, -1));
                    }

                    // Ensure boolean values are converted to integers for MySQL
                    $isFeatured = isset($product['is_featured']) ? ($product['is_featured'] ? 1 : 0) : 0;
                    $inStock = isset($product['in_stock']) ? ($product['in_stock'] ? 1 : 0) : 1; // Default to in stock

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
                        $isFeatured,
                        $inStock,
                        $createdAt
                    ]);

                    // Insert product images
                    if (isset($product['images']) && is_array($product['images'])) {
                        foreach ($product['images'] as $index => $imagePath) {
                            // Ensure is_primary is always a boolean value (0 or 1)
                            $isPrimary = ($index === 0) ? 1 : 0;

                            $insertImageStmt->execute([
                                $product['id'],
                                $imagePath,
                                $isPrimary  // First image is primary (1), others are not (0)
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

    // Import product reviews data
    $reviewsJsonPath = __DIR__ . '/../data/reviews.json';
    if (file_exists($reviewsJsonPath)) {
        // Check if reviews table is empty
        $stmt = $pdo->query("SELECT COUNT(*) FROM product_reviews");
        $reviewsCount = $stmt->fetchColumn();

        if ($reviewsCount == 0) {
            echo "Importing product reviews data from JSON file...\n";
            $reviewsData = json_decode(file_get_contents($reviewsJsonPath), true);

            if ($reviewsData) {
                // Prepare statements for review insertion
                $insertReviewStmt = $pdo->prepare("INSERT INTO product_reviews
                    (id, product_id, user_id, rating, review_text, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)");

                foreach ($reviewsData as $review) {
                    // Convert ISO datetime format to MySQL format
                    $createdAt = isset($review['created_at']) ? $review['created_at'] : date('Y-m-d H:i:s');
                    if (isset($review['created_at']) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $createdAt)) {
                        $createdAt = str_replace('T', ' ', substr($createdAt, 0, -1));
                    }

                    // Insert review
                    $insertReviewStmt->execute([
                        $review['id'],
                        $review['product_id'],
                        $review['user_id'],
                        $review['rating'],
                        $review['review_text'],
                        $createdAt
                    ]);
                }

                echo "Successfully imported " . count($reviewsData) . " product reviews\n";

                // Update products table with review counts and average ratings
                $stmt = $pdo->query("
                    SELECT product_id,
                           COUNT(*) as review_count,
                           AVG(rating) as avg_rating
                    FROM product_reviews
                    GROUP BY product_id
                ");

                $reviewStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $updateProductStmt = $pdo->prepare("
                    UPDATE products
                    SET reviewCount = ?, rating = ?
                    WHERE id = ?
                ");

                foreach ($reviewStats as $stat) {
                    $updateProductStmt->execute([
                        $stat['review_count'],
                        $stat['avg_rating'],
                        $stat['product_id']
                    ]);
                }

                echo "Updated products with review counts and ratings\n";

                // Reset auto-increment counter
                $pdo->exec("ALTER TABLE product_reviews AUTO_INCREMENT = " . (max(array_column($reviewsData, 'id')) + 1));
            } else {
                echo "Error: Could not parse reviews JSON file\n";
            }
        } else {
            echo "Review data already exists in database, skipping import\n";
        }
    } else {
        echo "Reviews JSON file not found: $reviewsJsonPath\n";
    }

    echo "Database initialization completed successfully!\n";
    echo "You can now access PHPMyAdmin to view the tables and data in database " . $DB_NAME_REAL . ".\n";
    echo "URL: https://cosc360.ok.ubc.ca/phpmyadmin/\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "</pre>";
echo "<p><a href='/~miakuang/PurelyHandmade/public/index.html'>Return to homepage</a></p>";