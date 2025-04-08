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

## 1. Project Structure

This section outlines the organization of the project files and directories.

### 1.1 Directory Structure

```
PurelyHandmade-Clean/
├── .idea/                  # IDE configuration
├── docs/                   # Documentation
│   └── technical_documentation.md  # This file
├── public/                 # Public frontend assets
│   ├── css/                # CSS stylesheets
│   │   ├── global.css      # Global styles
│   │   ├── navbar.css      # Navigation styling
│   │   ├── product_detail.css  # Product page styling
│   │   └── style.css       # Main stylesheet
│   ├── img/                # Images and assets
│   ├── js/                 # JavaScript files
│   │   ├── api-client.js   # API communication
│   │   ├── init-data.js    # Initial data loading
│   │   ├── product.js      # Product functionality
│   │   └── product_detail.js  # Product detail page
│   ├── layout/              # Page layout components
│   │   ├── navbar.html     # Navigation bar
│   │   └── footer.html     # Page footer
│   ├── views/               # Page templates
│   │   ├── product/        # Product pages
│   │   ├── checkout/       # Checkout flow
│   │   ├── auth/           # Authentication pages
│   │   └── admin/          # Admin interfaces
│   └── index.html          # Main store page
├── server/                 # Backend code
│   ├── api/                # API endpoints
│   │   ├── auth.php        # Authentication API
│   │   ├── cart.php        # Cart API
│   │   ├── categories.php  # Categories API
│   │   ├── products.php    # Products API
│   │   ├── comments.php    # Comments API
│   │   └── users.php       # Users API
│   ├── config/             # Configuration files
│   │   └── database.php    # Database connection
│   ├── data/               # Data storage
│   │   ├── products.json   # Product data
│   │   └── categories.json # Category data
│   ├── includes/           # Shared PHP files
│   │   ├── functions.php   # Helper functions
│   │   └── session.php     # Session handling
│   └── uploads/            # User uploaded files
│       └── images/         # Product images
```

### 1.2 File Naming and Organization

- Files use lowercase with underscores (snake_case)
- HTML files reflect page functionality (e.g., `product_detail.html`)
- CSS files match their HTML counterparts
- JS files correspond to specific page or component functionality

## 2. Frontend Architecture

### 2.1 Overview

The frontend is built using vanilla JavaScript with Bootstrap 5 for styling. It uses a client-side architecture where:

- Data is initially loaded from the server and cached in localStorage
- UI interactions are handled through event listeners
- Products can be filtered, sorted, and paginated entirely on the client-side
- Cart functionality is implemented using localStorage

### 2.2 Key Features

- **Product Catalog**: Display, filtering, sorting and pagination
- **Category Filtering**: Filter products by category
- **Price Filtering**: Filter products by price range
- **Rating Filtering**: Filter products by star rating
- **Shopping Cart**: Add/remove products, update quantities
- **Responsive Design**: Mobile-friendly using Bootstrap 5

### 2.3 JavaScript Components

- **Data Management**
  - `init-data.js`: Initializes product and category data
  - Local storage for cart and product data caching

- **UI Components**
  - Dynamic loading of navbar and footer
  - Product card generation
  - Filter sidebar with accordion behavior
  - Pagination controls
  - Toast notifications

- **Event Handling**
  - Filter application and clearing
  - Sort selection
  - Pagination navigation
  - Add-to-cart functionality

### 2.4 HTML Structure

The index.html file contains:
- A Bootstrap-based responsive layout
- Product filtering sidebar with multiple filter types
- Product listing area with card-based display
- Dynamic pagination controls
- Toast notification system for cart updates

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

## 6. Authentication

For simplicity, the authentication system will use:

1. **PHP Sessions**: For maintaining login state
2. **Password Hashing**: Using password_hash() and password_verify()
3. **Basic Access Control**: Admin vs. regular user roles

```php
// Simple authentication mechanism
session_start();

function login($username, $password) {
  // Load users from JSON file (or database in production)
  $users = json_decode(file_get_contents('users.json'), true);
  
  $user = array_filter($users, function($u) use ($username) {
    return $u['username'] === $username;
  });
  
  if (count($user) === 1 && password_verify($password, $user[0]['password_hash'])) {
    $_SESSION['user_id'] = $user[0]['id'];
    $_SESSION['is_admin'] = $user[0]['is_admin'];
    return true;
  }
  
  return false;
}

function isLoggedIn() {
  return isset($_SESSION['user_id']);
}

function isAdmin() {
  return isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;
}
```

## 7. Development Guidelines

### 7.1 Frontend Development

1. **Use Vanilla JavaScript**: Keep dependencies minimal
2. **Follow Bootstrap Conventions**: Use Bootstrap components and utilities
3. **Separate Concerns**: Keep HTML structure, CSS styling, and JS behavior separate
4. **Error Handling**: Gracefully handle network errors and empty states
5. **Mobile-First**: Design for mobile devices first, then enhance for larger screens

### 7.2 Backend Development 

1. **Keep It Simple**: Start with the minimal functionality needed
2. **JSON First**: Use JSON files for data storage initially
3. **Security First**: Validate all inputs, sanitize outputs
4. **RESTful Design**: Maintain clear conventions for API endpoints
5. **Error Handling**: Return appropriate HTTP status codes and error messages

### 7.3 Testing

1. **Manual Testing**: Test all functionality in major browsers
2. **Validate Forms**: Check all form inputs for validation
3. **Responsive Testing**: Test on various device sizes
4. **Offline Testing**: Test localStorage functionality
5. **Error Scenarios**: Test API error responses

## 8. Deployment Configuration

### 8.1 .htaccess Configuration

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /~username/PurelyHandmade/
  
  # Handle API requests
  RewriteRule ^api/(.*)$ server/api/$1 [L]
  
  # Handle static files
  RewriteRule ^uploads/(.*)$ server/uploads/$1 [L]
  
  # Default to index.html
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ public/index.html [L]
</IfModule>

# Enable CORS if needed
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE"
  Header set Access-Control-Allow-Headers "Content-Type"
</IfModule>

# Error Pages
ErrorDocument 404 /public/views/errors/404.html
ErrorDocument 500 /public/views/errors/500.html
```

### 8.2 Configuration Settings

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
  $config['base_url'] = 'https://cosc360.ok.ubc.ca/~username/PurelyHandmade';
  $config['api_url'] = $config['base_url'] . '/server/api';
  $config['uploads_url'] = $config['base_url'] . '/server/uploads';
}

return $config;
```

### 8.3 JavaScript Configuration

```javascript
// public/js/config.js
const config = {
  // Detect environment
  production: window.location.hostname === 'cosc360.ok.ubc.ca',
  
  // Set URLs based on environment
  get baseUrl() {
    return this.production ? 'https://cosc360.ok.ubc.ca/~username/PurelyHandmade' : '';
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

---

## Implementation Plan

1. **Phase 1: Setup**
   - Create directory structure
   - Configure .htaccess
   - Setup configuration files

2. **Phase 2: Backend Basics**
   - Implement basic API endpoints
   - Create JSON storage files
   - Setup authentication

3. **Phase 3: Frontend Integration**
   - Update frontend to use API instead of localStorage
   - Implement proper error handling
   - Update paths and configuration

4. **Phase 4: Testing & Refinement**
   - Test all functionality
   - Optimize performance
   - Document any issues

5. **Phase 5: Additional Features**
   - Add checkout process
   - Implement user profiles
   - Add image upload functionality

---

This documentation provides a blueprint for implementing a simple but functional e-commerce system that works with the existing frontend code while requiring minimal backend complexity. 

### Server API Endpoints

#### Authentication API (`server/api/auth.php`)
- Handles user login, registration, and session management
- Implements password hashing and validation
- Returns JSON responses with success/error messages

#### Products API (`server/api/products.php`)
- Handles CRUD operations for products
- Supports filtering by category, search terms
- Handles product image uploads
- Returns JSON responses with product data

#### Categories API (`server/api/categories.php`)
- Handles CRUD operations for product categories
- Supports listing all categories or getting a single category
- Can include associated products in response data
- Returns JSON responses with category data

#### Cart API (`server/api/cart.php`)
- Handles shopping cart operations 
- Requires user authentication for all operations
- Key functionalities:
  - Get cart contents with product details and calculated totals
  - Add products to cart with quantity validation
  - Update product quantities in cart
  - Remove products from cart
  - Clear all items from cart
- Returns JSON responses with cart data and operation status 