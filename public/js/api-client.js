const API_URL = '/~miakuang/PurelyHandmade/server/api/';

/**
 * Constructs the full API URL for an endpoint
 * @param {string} endpoint - The API endpoint
 * @returns {string} The full API URL
 */
const apiUrl = (endpoint) => {
    return API_URL + endpoint;
};

/**
 * Performs a GET request to the API
 * @param {string} endpoint - The API endpoint
 * @param {Object} params - Query parameters (optional)
 * @returns {Promise} Promise with JSON response
 */
const get = async (endpoint, params = {}) => {
    // Build query string from params
    const queryString = Object.keys(params).length > 0
        ? '?' + new URLSearchParams(params).toString()
        : '';
    
    const response = await fetch(apiUrl(endpoint) + queryString, {
        method: 'GET',
        credentials: 'include'
    });
    
    return handleResponse(response);
};

/**
 * Performs a POST request to the API
 * @param {string} endpoint - The API endpoint
 * @param {Object} data - Data to send (optional)
 * @param {FormData} formData - Form data to send (optional)
 * @returns {Promise} Promise with JSON response
 */
const post = async (endpoint, data = null, formData = null) => {
    const options = {
        method: 'POST',
        credentials: 'include'
    };
    
    if (formData) {
        options.body = formData;
    } else if (data) {
        options.headers = {
            'Content-Type': 'application/json'
        };
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(apiUrl(endpoint), options);
    return handleResponse(response);
};

/**
 * Performs a PUT request to the API
 * @param {string} endpoint - The API endpoint
 * @param {Object} data - Data to send
 * @returns {Promise} Promise with JSON response
 */
const put = async (endpoint, data) => {
    const response = await fetch(apiUrl(endpoint), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
    });
    
    return handleResponse(response);
};

/**
 * Performs a DELETE request to the API
 * @param {string} endpoint - The API endpoint
 * @returns {Promise} Promise with JSON response
 */
const del = async (endpoint) => {
    const response = await fetch(apiUrl(endpoint), {
        method: 'DELETE',
        credentials: 'include'
    });
    
    return handleResponse(response);
};

/**
 * Handles API response, checking for JSON content and errors
 * @param {Response} response - The fetch response object
 * @returns {Promise} Promise with parsed JSON or error
 */
const handleResponse = async (response) => {
    // First check if the response is ok (status in the range 200-299)
    if (!response.ok) {
        // Try to get error details from response if available
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            // If response is not JSON, throw status text
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        throw new Error(errorData.message || `API error: ${response.status} ${response.statusText}`);
    }
    
    // Check content type to see if it's JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }
    
    // If not JSON, return text
    return await response.text();
};

/**
 * Authentication API methods
 */
const auth = {
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise} Promise with registration result
     */
    register: async (userData) => {
        return await post('auth.php?action=register', userData);
    },
    
    /**
     * Log in a user
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise} Promise with login result
     */
    login: async (username, password) => {
        return await post('auth.php?action=login', { username, password });
    },
    
    /**
     * Log out the current user
     * @returns {Promise} Promise with logout result
     */
    logout: async () => {
        return await get('auth.php?action=logout');
    },
    
    /**
     * Check if user is logged in
     * @returns {Promise} Promise with login status
     */
    checkLoginStatus: async () => {
        return await get('auth.php?action=status');
    }
};

/**
 * Products API methods
 */
const products = {
    /**
     * Get all products with optional filtering
     * @param {Object} filters - Filter criteria (optional)
     * @returns {Promise} Promise with products data
     */
    getProducts: async (filters = {}) => {
        return await get('products.php', filters);
    },
    
    /**
     * Get a single product by ID
     * @param {number} id - Product ID
     * @returns {Promise} Promise with product data
     */
    getProduct: async (id) => {
        return await get(`products.php?id=${id}`);
    },
    
    /**
     * Create a new product (admin only)
     * @param {Object} productData - Product data
     * @param {FormData} productImages - Product images
     * @returns {Promise} Promise with created product
     */
    createProduct: async (productData, productImages = null) => {
        if (productImages) {
            const formData = new FormData();
            // Add product data to form
            for (const key in productData) {
                formData.append(key, productData[key]);
            }
            // Add images to form
            for (let i = 0; i < productImages.length; i++) {
                formData.append('images[]', productImages[i]);
            }
            return await post('products.php', null, formData);
        }
        
        return await post('products.php', productData);
    },
    
    /**
     * Update an existing product (admin only)
     * @param {number} id - Product ID
     * @param {Object} productData - Updated product data
     * @returns {Promise} Promise with updated product
     */
    updateProduct: async (id, productData) => {
        return await put(`products.php?id=${id}`, productData);
    },
    
    /**
     * Delete a product (admin only)
     * @param {number} id - Product ID
     * @returns {Promise} Promise with deletion result
     */
    deleteProduct: async (id) => {
        return await del(`products.php?id=${id}`);
    }
};

/**
 * Categories API methods
 */
const categories = {
    /**
     * Get all categories
     * @returns {Promise} Promise with categories data
     */
    getCategories: async () => {
        return await get('categories.php');
    },
    
    /**
     * Get a single category by ID
     * @param {number} id - Category ID
     * @returns {Promise} Promise with category data
     */
    getCategory: async (id) => {
        return await get(`categories.php?id=${id}`);
    },
    
    /**
     * Create a new category (admin only)
     * @param {Object} categoryData - Category data
     * @returns {Promise} Promise with created category
     */
    createCategory: async (categoryData) => {
        return await post('categories.php', categoryData);
    },
    
    /**
     * Update an existing category (admin only)
     * @param {number} id - Category ID
     * @param {Object} categoryData - Updated category data
     * @returns {Promise} Promise with updated category
     */
    updateCategory: async (id, categoryData) => {
        return await put(`categories.php?id=${id}`, categoryData);
    },
    
    /**
     * Delete a category (admin only)
     * @param {number} id - Category ID
     * @returns {Promise} Promise with deletion result
     */
    deleteCategory: async (id) => {
        return await del(`categories.php?id=${id}`);
    }
};

/**
 * Comments API methods
 */
const comments = {
    /**
     * Get comments for a product
     * @param {number} productId - Product ID
     * @returns {Promise} Promise with comments data
     */
    getProductComments: async (productId) => {
        return await get(`comments.php?product=${productId}`);
    },
    
    /**
     * Create a new comment
     * @param {Object} commentData - Comment data
     * @returns {Promise} Promise with created comment
     */
    createComment: async (commentData) => {
        return await post('comments.php', commentData);
    },
    
    /**
     * Delete a comment
     * @param {number} commentId - Comment ID
     * @returns {Promise} Promise with deletion result
     */
    deleteComment: async (commentId) => {
        return await del(`comments.php?id=${commentId}`);
    }
};

/**
 * Users API methods
 */
const users = {
    /**
     * Get all users (admin only)
     * @returns {Promise} Promise with users data
     */
    getUsers: async () => {
        return await get('users.php');
    },
    
    /**
     * Get a single user by ID
     * @param {number} id - User ID
     * @returns {Promise} Promise with user data
     */
    getUser: async (id) => {
        return await get(`users.php?id=${id}`);
    },
    
    /**
     * Update a user profile
     * @param {number} id - User ID
     * @param {Object} userData - Updated user data
     * @returns {Promise} Promise with updated user
     */
    updateUser: async (id, userData) => {
        return await put(`users.php?id=${id}`, userData);
    }
};

/**
 * Cart API methods
 */
const cart = {
    /**
     * Get the current user's cart contents
     * @returns {Promise} Promise with cart data
     */
    getCart: async () => {
        return await get('cart.php');
    },

    /**
     * Add a product to the cart
     * @param {number} productId - The ID of the product to add
     * @param {number} quantity - The quantity to add (default: 1)
     * @returns {Promise} Promise with updated cart data
     */
    addToCart: async (productId, quantity = 1) => {
        return await post('cart.php', { product_id: productId, quantity });
    },

    /**
     * Update the quantity of a product in the cart
     * @param {number} productId - The ID of the product to update
     * @param {number} quantity - The new quantity
     * @returns {Promise} Promise with updated cart data
     */
    updateCart: async (productId, quantity) => {
        return await put('cart.php', { product_id: productId, quantity });
    },

    /**
     * Remove a product from the cart
     * @param {number} productId - The ID of the product to remove
     * @returns {Promise} Promise with updated cart data
     */
    removeFromCart: async (productId) => {
        return await del(`cart.php?product_id=${productId}`);
    },

    /**
     * Clear all items from the cart
     * @returns {Promise} Promise with success/error message
     */
    clearCart: async () => {
        return await del('cart.php');
    }
};

// Export the API services
const api = {
    auth,
    products,
    categories,
    comments,
    users,
    cart
};

// Make API available globally
window.api = api; 