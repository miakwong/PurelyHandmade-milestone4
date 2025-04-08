/**
 * API Client
 * Handles API requests to the backend
 */

// Ensure config.js is loaded first

/**
 * API Client Object
 */
const ApiClient = {
    /**
     * Make a GET request
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise} Promise resolving to JSON response
     */
    async get(endpoint, params = {}) {
        const url = new URL(apiUrl(endpoint));
        
        // Add query parameters
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        // Handle non-JSON response
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
        }
        
        return await response.text();
    },
    
    /**
     * Make a POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {FormData} formData - Form data (for file uploads)
     * @returns {Promise} Promise resolving to JSON response
     */
    async post(endpoint, data = null, formData = null) {
        const options = {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        };
        
        // Set request body (JSON or FormData)
        if (formData) {
            options.body = formData;
        } else if (data) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(apiUrl(endpoint), options);
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        // Handle non-JSON response
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
        }
        
        return await response.text();
    },
    
    /**
     * Make a PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @returns {Promise} Promise resolving to JSON response
     */
    async put(endpoint, data = {}) {
        const response = await fetch(apiUrl(endpoint), {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        // Handle non-JSON response
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
        }
        
        return await response.text();
    },
    
    /**
     * Make a DELETE request
     * @param {string} endpoint - API endpoint
     * @returns {Promise} Promise resolving to JSON response
     */
    async delete(endpoint) {
        const response = await fetch(apiUrl(endpoint), {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        // Handle non-JSON response
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
        }
        
        return await response.text();
    },
    
    // Auth API
    auth: {
        /**
         * Login user
         * @param {string} username - Username or email
         * @param {string} password - Password
         * @returns {Promise} Promise resolving to user data
         */
        async login(username, password) {
            return await ApiClient.post('auth.php?action=login', { username, password });
        },
        
        /**
         * Register new user
         * @param {Object} userData - User data
         * @returns {Promise} Promise resolving to user data
         */
        async register(userData) {
            return await ApiClient.post('auth.php?action=register', userData);
        },
        
        /**
         * Logout user
         * @returns {Promise} Promise resolving to logout status
         */
        async logout() {
            return await ApiClient.get('auth.php?action=logout');
        },
        
        /**
         * Check user login status
         * @returns {Promise} Promise resolving to user status
         */
        async status() {
            return await ApiClient.get('auth.php?action=status');
        }
    },
    
    // Products API
    products: {
        /**
         * Get all products
         * @param {Object} params - Query parameters (category, search, limit, offset)
         * @returns {Promise} Promise resolving to products list
         */
        async getAll(params = {}) {
            return await ApiClient.get('products.php', params);
        },
        
        /**
         * Get a single product
         * @param {number} id - Product ID
         * @returns {Promise} Promise resolving to product data
         */
        async get(id) {
            return await ApiClient.get(`products.php?id=${id}`);
        },
        
        /**
         * Create a new product
         * @param {Object} productData - Product data
         * @param {File} image - Product image
         * @returns {Promise} Promise resolving to created product
         */
        async create(productData, image = null) {
            if (image) {
                const formData = new FormData();
                formData.append('image', image);
                
                // Add product data to form
                Object.keys(productData).forEach(key => {
                    formData.append(key, productData[key]);
                });
                
                return await ApiClient.post('products.php', null, formData);
            }
            
            return await ApiClient.post('products.php', productData);
        },
        
        /**
         * Update a product
         * @param {number} id - Product ID
         * @param {Object} productData - Product data
         * @returns {Promise} Promise resolving to updated product
         */
        async update(id, productData) {
            return await ApiClient.put(`products.php?id=${id}`, productData);
        },
        
        /**
         * Delete a product
         * @param {number} id - Product ID
         * @returns {Promise} Promise resolving to deletion status
         */
        async delete(id) {
            return await ApiClient.delete(`products.php?id=${id}`);
        }
    },
    
    // Categories API
    categories: {
        /**
         * Get all categories
         * @returns {Promise} Promise resolving to categories list
         */
        async getAll() {
            return await ApiClient.get('categories.php');
        },
        
        /**
         * Get a single category
         * @param {number} id - Category ID
         * @returns {Promise} Promise resolving to category data
         */
        async get(id) {
            return await ApiClient.get(`categories.php?id=${id}`);
        },
        
        /**
         * Create a new category
         * @param {Object} categoryData - Category data
         * @returns {Promise} Promise resolving to created category
         */
        async create(categoryData) {
            return await ApiClient.post('categories.php', categoryData);
        },
        
        /**
         * Update a category
         * @param {number} id - Category ID
         * @param {Object} categoryData - Category data
         * @returns {Promise} Promise resolving to updated category
         */
        async update(id, categoryData) {
            return await ApiClient.put(`categories.php?id=${id}`, categoryData);
        },
        
        /**
         * Delete a category
         * @param {number} id - Category ID
         * @returns {Promise} Promise resolving to deletion status
         */
        async delete(id) {
            return await ApiClient.delete(`categories.php?id=${id}`);
        }
    },
    
    // Comments API
    comments: {
        /**
         * Get comments for a product
         * @param {number} productId - Product ID
         * @returns {Promise} Promise resolving to comments list
         */
        async getForProduct(productId) {
            return await ApiClient.get(`comments.php?product=${productId}`);
        },
        
        /**
         * Create a new comment
         * @param {Object} commentData - Comment data
         * @returns {Promise} Promise resolving to created comment
         */
        async create(commentData) {
            return await ApiClient.post('comments.php', commentData);
        },
        
        /**
         * Delete a comment
         * @param {number} id - Comment ID
         * @returns {Promise} Promise resolving to deletion status
         */
        async delete(id) {
            return await ApiClient.delete(`comments.php?id=${id}`);
        }
    },
    
    // Users API
    users: {
        /**
         * Get all users (admin only)
         * @param {Object} params - Query parameters (search, limit, offset)
         * @returns {Promise} Promise resolving to users list
         */
        async getAll(params = {}) {
            return await ApiClient.get('users.php', params);
        },
        
        /**
         * Get a single user
         * @param {number} id - User ID
         * @returns {Promise} Promise resolving to user data
         */
        async get(id) {
            return await ApiClient.get(`users.php?id=${id}`);
        },
        
        /**
         * Update a user
         * @param {number} id - User ID
         * @param {Object} userData - User data
         * @returns {Promise} Promise resolving to updated user
         */
        async update(id, userData) {
            return await ApiClient.put(`users.php?id=${id}`, userData);
        },
        
        /**
         * Delete a user (admin only)
         * @param {number} id - User ID
         * @returns {Promise} Promise resolving to deletion status
         */
        async delete(id) {
            return await ApiClient.post(`users.php?action=delete&id=${id}`);
        },
        
        /**
         * Toggle user active status (admin only)
         * @param {number} id - User ID
         * @returns {Promise} Promise resolving to updated status
         */
        async toggleStatus(id) {
            return await ApiClient.post(`users.php?action=toggle_status&id=${id}`);
        },
        
        /**
         * Make a user admin (admin only)
         * @param {number} id - User ID
         * @returns {Promise} Promise resolving to updated status
         */
        async makeAdmin(id) {
            return await ApiClient.post(`users.php?action=make_admin&id=${id}`);
        },
        
        /**
         * Remove admin status from a user (admin only)
         * @param {number} id - User ID
         * @returns {Promise} Promise resolving to updated status
         */
        async removeAdmin(id) {
            return await ApiClient.post(`users.php?action=remove_admin&id=${id}`);
        },
        
        /**
         * Upload profile image
         * @param {number} id - User ID
         * @param {File} image - Image file
         * @returns {Promise} Promise resolving to upload status
         */
        async uploadImage(id, image) {
            const formData = new FormData();
            formData.append('image', image);
            
            return await ApiClient.post(`users.php?action=upload_image&id=${id}`, null, formData);
        }
    }
}; 