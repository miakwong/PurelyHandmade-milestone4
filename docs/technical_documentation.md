# Technical Documentation for PurelyHandmade-Clean Project

## Table of Contents
1. [Project Structure](#1-project-structure)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Design](#3-backend-design)
4. [API Specification](#4-api-specification)
5. [Data Model](#5-data-model)
6. [Authentication](#6-authentication)
7. [Development Guidelines](#7-development-guidelines)
8. [Deployment Configuration](#8-deployment-configuration)
9. [Streamlined Implementation Plan](#10-streamlined-implementation-plan)

## 1. Project Structure

This section outlines the organization of the project files and directories.

### 1.1 Directory Structure

```
/PurelyHandmade
├── .idea/                   # IDE configuration
├── docs/                    # Project documentation
├── public/                  # Public assets
│   ├── css/                 # CSS files
│   ├── js/                  # JavaScript files
│   └── images/              # Image assets
├── server/                  # Server-side code
│   ├── api/                 # API endpoints
│   ├── config/              # Configuration files 
│   └── lib/                 # Library files
├── src/                     # Source code
│   ├── views/               # Frontend views
│   └── assets/              # Frontend assets
├── index.html               # Main HTML file
├── .htaccess                # Server configuration
└── README.md                # Project description
```

### 1.2 File Naming and Organization

- Files use lowercase with underscores (snake_case)
- HTML files reflect page functionality (e.g., `product_detail.html`)
- CSS files match their HTML counterparts
- JS files correspond to specific page or component functionality

## 2. Frontend Architecture

### 2.1 Overview

The frontend is built using vanilla JavaScript with Bootstrap 5 for styling. It uses a client-side architecture where:

- Data is loaded from the server through API endpoints with localStorage fallback
- UI interactions are handled through event listeners
- Products can be filtered, sorted, and paginated
- Cart functionality is implemented using server API with localStorage fallback for offline support

### 2.2 Key Features

- **Product Catalog**: Display, filtering, sorting and pagination
- **Category Filtering**: Filter products by category
- **Price Filtering**: Filter products by price range
- **Rating Filtering**: Filter products by star rating
- **Shopping Cart**: Add/remove products, update quantities
- **Responsive Design**: Mobile-friendly using Bootstrap 5

### 2.3 JavaScript Architecture

The JavaScript architecture follows a modular approach with separate files for different functional areas:

- **config.js**: Environment detection and configuration settings
- **api-client.js**: API client for server communication
- **products.js**: Product data loading, filtering and sorting
- **cart.js**: Shopping cart functionality
- **pagination.js**: Pagination controls and display logic
- **ui.js**: UI components and interactions

#### Product Detail Page (`product_detail.js`)

The product detail page handles:
- Product information display
- Image gallery
- Review display and submission
- Add to cart functionality
- Recently viewed products

##### Review Display
- Shows product rating and total review count
- Displays rating distribution
- Lists reviews with:
  - Star rating
  - Review date
  - Review text
- Sorts reviews by date (newest first)
- Handles empty review state
- Provides error handling for failed review loading

### 2.4 HTML Structure

The index.html file contains:
- A Bootstrap-based responsive layout
- Product filtering sidebar with multiple filter types
- Product listing area with card-based display
- Dynamic pagination controls
- Toast notification system for cart updates
- Modular JavaScript imports for clean code organization

## 3. Backend Design

The backend should be simplified to provide just the necessary functionality to support the existing frontend.

### 3.1 Core Components

1. **Simple PHP API**: Lightweight endpoints that respond to frontend requests
2. **JSON Data Storage**: Initially use JSON files for data storage for simplicity
3. **Basic Authentication**: Simple session-based authentication
4. **File Upload**: For product images

### 3.2 Implementation Approach

The backend will implement a minimal REST API supporting the current frontend functionality:

- Return product and category data in JSON format
- Support basic CRUD operations for products and categories
- Handle filtering and sorting parameters (though client already does this)
- Support cart operations for persistence beyond localStorage

### 3.3 API Design Principles

1. **Simplicity**: Each endpoint serves a single purpose
2. **Statelessness**: No server-side session dependencies except for auth
3. **JSON**: All requests and responses use JSON
4. **Error Handling**: Consistent error response format

### 3.4 Image Storage and Access

Product images are stored in the server's file system at `server/uploads/images/`. These images can be accessed through the following methods:

1. **Direct URL Access**: Images can be accessed directly via URL: `/server/uploads/images/{filename}`
2. **API Reference**: Product data returned from the API includes full image paths in the `images` array
3. **Products API**: The Products API handles image uploads and automatically stores them in the correct location

For security reasons, only the admin can upload or modify product images through the API.

## 4. API Specification

### 4.1 Products API

```
GET /server/api/products.php
- Returns all products
- Optional query parameters: category, min_price, max_price, rating, on_sale

GET /server/api/products.php?id={id}
- Returns a single product by ID

POST /server/api/products.php
- Creates a new product
- Requires authentication

PUT /server/api/products.php?id={id}
- Updates a product
- Requires authentication

DELETE /server/api/products.php?id={id}
- Deletes a product
- Requires authentication
```

### 4.2 Categories API

```
GET /server/api/categories.php
- Returns all categories

GET /server/api/categories.php?id={id}
- Returns a single category and its products

POST /server/api/categories.php
- Creates a new category
- Requires authentication

PUT /server/api/categories.php?id={id}
- Updates a category
- Requires authentication

DELETE /server/api/categories.php?id={id}
- Deletes a category
- Requires authentication
```

### 4.3 Authentication API

```
POST /server/api/auth.php?action=login
- Authenticates a user
- Accepts: username, password

POST /server/api/auth.php?action=register
- Registers a new user
- Accepts: username, email, password

GET /server/api/auth.php?action=logout
- Logs out the current user

GET /server/api/auth.php?action=status
- Returns current authentication status
```

### 4.4 Cart API

```
GET /server/api/cart.php
- Returns the current user's cart
- Uses session if authenticated, otherwise relies on client

POST /server/api/cart.php?action=add
- Adds item to cart
- Accepts: product_id, quantity

POST /server/api/cart.php?action=update
- Updates cart item quantity
- Accepts: product_id, quantity

POST /server/api/cart.php?action=remove
- Removes item from cart
- Accepts: product_id

POST /server/api/cart.php?action=clear
- Clears the entire cart
```

### 4.5 Reviews API

The Reviews API handles CRUD operations for product reviews. It provides endpoints for:

- Getting reviews for a specific product
- Adding new reviews

#### Authentication
- Reviews can be viewed by any user
- Only authenticated users can add reviews
- Authentication is checked using the session variable `$_SESSION['user_id']`

#### Endpoints

1. **GET /reviews.php?action=get&product_id={id}**
   - Returns all reviews for a specific product
   - Includes review statistics (average rating, distribution)
   - No authentication required

2. **POST /reviews.php?action=add**
   - Adds a new review for a product
   - Requires user authentication
   - Request body should include:
     - product_id
     - rating (1-5)
     - review_text

#### Error Handling
- 400: Invalid request parameters
- 401: User not authenticated (for POST requests)
- 404: Product not found
- 500: Server error

## 5. Data Model

### 5.1 Products

```json
{
  "id": 1,
  "name": "Handwoven Basket",
  "description": "Beautifully crafted handwoven basket...",
  "price": 49.99,
  "onSale": true,
  "salePrice": 39.99,
  "categoryId": 1,
  "rating": 4.5,
  "reviewCount": 12,
  "stock": 8,
  "images": [
    "server/uploads/images/Handwoven_1.JPG",
    "server/uploads/images/Handwoven_2.JPG"
  ],
  "created_at": "2023-04-15T10:30:00Z"
}
```

### 5.2 Categories

```json
{
  "id": 1,
  "name": "Handwoven Items",
  "description": "Handcrafted woven products made by skilled artisans"
}
```

### 5.3 Cart Items

```json
{
  "id": 1,
  "name": "Handwoven Basket",
  "price": 39.99,
  "image": "server/uploads/images/Handwoven_1.JPG",
  "quantity": 2
}
```

### 5.4 Users

```json
{
  "id": 1,
  "username": "user123",
  "email": "user@example.com",
  "password_hash": "$2y$10$...",
  "is_admin": false
}
```

### 5.5 Product Reviews

```json
{
  "id": 1,
  "product_id": 1,
  "user_id": 1,
  "rating": 4.5,
  "review_text": "Beautifully crafted handwoven basket with excellent attention to detail.",
  "created_at": "2023-05-10T14:30:00Z",
  "username": "user123"
}
```

## 6. Database Configuration and Initialization

### 6.1 Database Setup

The application uses a MySQL database with the following configuration:

- **Database Name**: miakuang
- **Username**: miakuang
- **Password**: miakuang
- **Host**: localhost
- **Character Set**: utf8mb4
- **Connection Type**: TCP connection (for better server compatibility)

### 6.2 Database Initialization

The database can be initialized by running the script located at `server/includes/init-db.php`. This script:

1. Creates the database if it doesn't exist
2. Creates all required tables with appropriate relationships:
   - users
   - categories
   - products
   - product_images
   - product_reviews
   - orders
   - order_items
3. Creates a default admin user:
   - Username: miakuang
   - Email: miakuang@example.com
   - Password: miakuang
   - Role: admin
4. Creates test users for review data:
   - Username: testuser1, testuser2, testuser3
   - Email: testuser[1-3]@example.com
   - Password: password123
   - Role: user
5. Imports initial data from JSON files:
   - Categories from `server/data/categories.json`
   - Products from `server/data/products.json`
   - Reviews from `server/data/reviews.json`

#### Important Implementation Notes

- The script uses TCP connection to MySQL for better server compatibility
- All SQL queries use prepared statements to prevent SQL injection
- Foreign key constraints are temporarily disabled during table creation
- ISO date format (`2023-04-01T10:30:00Z`) is automatically converted to MySQL format (`2023-04-01 10:30:00`)
- Boolean values are explicitly cast to integers (0 or 1) for MySQL compatibility
- Auto-increment counters are reset after bulk imports to ensure new records start with correct IDs
- Product review counts and average ratings are automatically calculated and updated

#### Database Initialization Process

To initialize the database:
1. Navigate to `https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade/server/includes/init-db.php`
2. The script will:
   - Create the database and tables if they don't exist
   - Create default admin and test users if they don't exist
   - Import category, product, and review data if tables are empty
   - Update product review statistics
3. Upon completion, you can access PHPMyAdmin at `https://cosc360.ok.ubc.ca/phpmyadmin/`

### 6.3 Data Structure

The database schema includes the following tables:

#### User Table
- `id`: Primary key, auto-incrementing integer
- `username`: Unique username (VARCHAR 50)
- `email`: Unique email address (VARCHAR 100)
- `password`: Hashed password (VARCHAR 255)
- `name`: User's full name (VARCHAR 100)
- `avatar`: User's avatar image (LONGBLOB, nullable)
- `birthday`: User's date of birth (DATE)
- `gender`: User's gender (ENUM: 'male', 'female', 'other')
- `role`: User role (ENUM: 'user' or 'admin')
- `created_at`: Timestamp of account creation

#### Category Table
- `id`: Primary key, auto-incrementing integer
- `name`: Category name (VARCHAR 100)
- `slug`: Unique URL-friendly name (VARCHAR 100)
- `description`: Category description (TEXT)
- `image`: Category image path (VARCHAR 255)

#### Product Table
- `id`: Primary key, auto-incrementing integer
- `category_id`: Foreign key to categories table
- `name`: Product name (VARCHAR 100)
- `slug`: Unique URL-friendly name (VARCHAR 100)
- `description`: Product description (TEXT)
- `price`: Product price (DECIMAL 10,2)
- `stock_quantity`: Available stock (INT)
- `image`: Main product image path (VARCHAR 255)
- `is_featured`: Featured product flag (BOOLEAN)
- `in_stock`: Stock status flag (BOOLEAN)
- `rating`: Average rating (DECIMAL 2,1)
- `reviewCount`: Number of reviews (INT)
- `created_at`: Creation timestamp

#### Product_Images Table
- `id`: Primary key, auto-incrementing integer
- `product_id`: Foreign key to products table
- `image_path`: Image file path (VARCHAR 255)
- `is_primary`: Primary image flag (BOOLEAN)

#### Product_Reviews Table
- `id`: Primary key, auto-incrementing integer
- `product_id`: Foreign key to products table
- `user_id`: Foreign key to users table
- `rating`: Review rating (DECIMAL 2,1, range 1-5)
- `review_text`: Review content (TEXT)
- `created_at`: Creation timestamp

#### Order Table
- `id`: Primary key, auto-incrementing integer
- `user_id`: Foreign key to users table
- `order_number`: Unique order identifier (VARCHAR 50)
- `total_amount`: Order total (DECIMAL 10,2)
- `status`: Order status (VARCHAR 20)
- `created_at`: Creation timestamp

#### Order_Item Table
- `id`: Primary key, auto-incrementing integer
- `order_id`: Foreign key to orders table
- `product_id`: Foreign key to products table
- `quantity`: Item quantity (INT)
- `price`: Item price (DECIMAL 10,2)

## 7. Authentication

### 7.1 API Endpoints

#### Login
- **Endpoint**: `/api/auth.php?action=login`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "id": "number",
      "username": "string",
      "isAdmin": "boolean"
    }
  }
  ```
- **Error Codes**:
  - 400: Invalid input
  - 401: Invalid credentials
  - 500: Server error

#### Registration
- **Endpoint**: `/api/auth.php?action=register`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string",
    "firstName": "string",
    "lastName": "string",
    "birthday": "string",
    "gender": "string",
    "avatar": "string (base64)"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "id": "number",
      "username": "string"
    }
  }
  ```
- **Error Codes**:
  - 400: Invalid input
  - 409: Username or email already exists
  - 500: Server error

#### Logout
- **Endpoint**: `/api/auth.php?action=logout`
- **Method**: POST
- **Response**:
  ```json
  {
    "success": true,
    "message": "Logout successful"
  }
  ```

#### Status Check
- **Endpoint**: `/api/auth.php?action=status`
- **Method**: GET
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "isLoggedIn": "boolean",
      "user": {
        "id": "number",
        "username": "string",
        "isAdmin": "boolean"
      }
    }
  }
  ```

### 7.2 Implementation Details

#### Database Connection
- Uses PDO for database operations
- Connection is established using credentials from `db_credentials.php`
- Error handling for connection failures
- Prepared statements for all database queries

#### Security Measures
1. **Password Handling**:
   - Passwords are hashed using `password_hash()` with PASSWORD_DEFAULT
   - Password verification using `password_verify()`
   - Minimum password length requirement (6 characters)

2. **Input Validation**:
   - Email format validation
   - Username and email uniqueness checks
   - Input sanitization for all user inputs
   - Required field validation

3. **Session Management**:
   - PHP sessions for user authentication
   - Session variables for user ID, username, and admin status
   - Session start error handling

4. **Error Handling**:
   - Detailed error logging
   - JSON error responses
   - Database error tracking
   - Input validation errors

### 7.3 Data Flow

#### Login Process
1. Receive login request with username/email and password
2. Validate input format
3. Check if username is email or username
4. Query database for user
5. Verify password hash
6. Set session variables
7. Return user data

#### Registration Process
1. Receive registration data
2. Validate all required fields
3. Check username and email availability
4. Hash password
5. Combine first and last name into single name field
6. Insert new user record
7. Set session variables
8. Return success response

#### Logout Process
1. Clear session variables
2. Destroy session
3. Return success response

#### Status Check Process
1. Check session status
2. Return current authentication state
3. Include user data if logged in

## 8. Development Guidelines

### 8.1 Frontend Development

1. **Use Vanilla JavaScript**: Keep dependencies minimal
2. **Follow Bootstrap Conventions**: Use Bootstrap components and utilities
3. **Separate Concerns**: Keep HTML structure, CSS styling, and JS behavior separate
4. **Error Handling**: Gracefully handle network errors and empty states
5. **Mobile-First**: Design for mobile devices first, then enhance for larger screens

### 8.2 Backend Development 

1. **Keep It Simple**: Start with the minimal functionality needed
2. **JSON First**: Use JSON files for data storage initially
3. **Security First**: Validate all inputs, sanitize outputs
4. **RESTful Design**: Maintain clear conventions for API endpoints
5. **Error Handling**: Return appropriate HTTP status codes and error messages

### 8.3 Testing

1. **Manual Testing**: Test all functionality in major browsers
2. **Validate Forms**: Check all form inputs for validation
3. **Responsive Testing**: Test on various device sizes
4. **Offline Testing**: Test localStorage functionality
5. **Error Scenarios**: Test API error responses

## 9. Deployment Configuration

### 9.1 .htaccess Configuration

```apache
RewriteEngine On
RewriteBase /~miakuang/PurelyHandmade/
RewriteRule ^api/(.*)$ server/api/$1 [L]
RewriteRule ^uploads/(.*)$ server/uploads/$1 [L]
RewriteRule ^$ public/index.html [L]
RewriteRule ^index\.html$ public/index.html [L]

# If the requested file exists in public/ serve it directly
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{DOCUMENT_ROOT}/~miakuang/PurelyHandmade/public%{REQUEST_URI} -f
RewriteRule ^(.*)$ public/$1 [L]

# Default to index.html for any other requests
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ public/index.html [L]
```

### 9.2 Configuration Settings

Create a simple configuration mechanism for different environments:

```php
// server/config/app.php
<?php
$config = [
  'production' => false, // Set to true in production
  'base_url' => '',      // Base URL (empty for development)
  'api_url' => '/server/api',
  'uploads_url' => '/server/uploads'
];

// For production (detect automatically or set manually)
if ($_SERVER['HTTP_HOST'] === 'cosc360.ok.ubc.ca') {
  $config['production'] = true;
  $config['base_url'] = 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade';
  $config['api_url'] = $config['base_url'] . '/server/api';
  $config['uploads_url'] = $config['base_url'] . '/server/uploads';
}

return $config;
```

### 9.3 JavaScript Configuration

```javascript
// public/js/config.js
const config = {
  // Detect environment
  production: window.location.hostname === 'cosc360.ok.ubc.ca',
  
  // Set URLs based on environment
  get baseUrl() {
    return this.production ? 'https://cosc360.ok.ubc.ca/~miakuang/PurelyHandmade' : '';
  },
  
  get apiUrl() {
    return this.baseUrl + '/server/api';
  },
  
  get uploadsUrl() {
    return this.baseUrl + '/server/uploads';
  },
  
  get imagesUrl() {
    return this.uploadsUrl + '/images';
  }
};

// Helper functions
function getApiUrl(endpoint) {
  return `${config.apiUrl}/${endpoint}`;
}

function getImageUrl(filename) {
  return `${config.imagesUrl}/${filename}`;
}
```

## 10. Streamlined Implementation Plan

To complete the project within a limited timeframe, we need a streamlined implementation plan that focuses on core functionality.

### 10.1 Core Functionality Priorities

Below is a prioritized list of features:

#### High Priority (Must Complete)
1. **Product Browsing**: List page, detail page
2. **Category Filtering**: Filter products by category
3. **Simple Search**: Search functionality based on product name
4. **Basic Shopping Cart Functions**: Add, delete, update quantity

#### Medium Priority (If Time Permits)
1. **User Login/Registration**: Basic account management
2. **Price Filtering**: Filter products by price range
3. **Sorting Function**: Sort by price, name

#### Low Priority (Can Be Dropped)
1. **Product Comments**: Static example comments can be used instead
2. **User Profile**: Simplified to basic information
3. **Checkout Process**: Show interface only, not full logic
4. **Advanced Filtering**: Rating filtering, etc.

### 10.2 Technical Simplification

#### Data Storage Simplification
1. **Use JSON Files**: No MySQL database, use simple JSON files instead
2. **Simplify Data Structure**: Reduce data table and field count
3. **Shopping Cart Storage**: Shopping cart data completely use browser's localStorage, no backend database support needed
4. **No Shopping Cart Table**: System does not keep shopping cart table, user orders directly create order records

#### API Simplification
1. **Merge API Endpoints**: Reduce API endpoint count, simplify routing
2. **Simplify Authentication**: Use basic session authentication
3. **Reduce API Parameters**: Only keep necessary filtering parameters

#### Frontend Simplification
1. **Reduce Interaction Animation**: Focus on basic functionality
2. **Simplify UI Components**: Use simple Bootstrap components
3. **Reduce Page Count**: Merge similar functionality pages

### 10.3 Specific Implementation Steps

1. **Stage 1: Basic Structure** (2 hours)
   - Complete directory structure
   - Configure basic environment
   - Prepare static data files

2. **Stage 2: Product Functionality** (5 hours)
   - Implement product list page
   - Implement product detail page
   - Implement basic category filtering
   - Implement product search

3. **Stage 3: Shopping Cart Functionality** (3 hours)
   - Implement side shopping cart panel
   - Implement basic shopping cart operations (add, delete, update quantity)
   - Implement shopping cart persistence (localStorage)
   - Add direct order functionality, skip checkout process

4. **Stage 4: User Functionality** (3 hours)
   - Implement simple login/registration
   - Implement session management

5. **Stage 5: Testing and Fixing** (2 hours)
   - Function testing
   - Fix critical issues
   - Clean code

### 10.4 Technical Debt Record

The following features will be recorded as technical debt for future implementation:

1. Complete user comment system
2. Advanced filtering functionality
3. Complete order management system
4. User profile improvement
5. Admin backend

### 10.5 Simplified Data Structure

#### Product (Products)
- id
- name
- description
- price
- salePrice (Optional)
- categoryId
- image
- stock

#### Category (Categories)
- id
- name
- description

#### User (Users)
- id
- username
- email
- password
- isAdmin

#### Order (Orders)
- id
- user_id
- order_number
- total_amount
- status
- created_at

#### Order Item (Order_Items)
- id
- order_id
- product_id
- quantity
- price

### 10.6 Simplified API

#### Product API
- `GET /api/products.php` - Get all products (Support basic filtering)
- `GET /api/products.php?id={id}` - Get single product

#### Category API
- `GET /api/categories.php` - Get all categories

#### Authentication API
- `POST /api/auth.php?action=login` - User login
- `POST /api/auth.php?action=register` - User registration
- `GET /api/auth.php?action=status` - Check login status
- `POST /api/auth.php?action=logout` - User logout

#### Order API
- `POST /api/orders.php?action=create` - Create new order
- `GET /api/orders.php?user_id={id}` - Get user order history

This streamlined plan will help us complete the project's core functionality within a limited timeframe, ensure basic user experience, and leave room for future expansion.