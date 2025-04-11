const API_URL = '/~miakuang/PurelyHandmade/server/api/';

// Get full API URL
const apiUrl = (endpoint) => {
    let baseUrl = '';
    if (window.config && window.config.apiUrl) {
        baseUrl = window.config.apiUrl;
    } else {
        // Fallback if config is not loaded yet
        const pathSegments = window.location.pathname.split('/');
        const projectIndex = pathSegments.findIndex(segment => segment === 'PurelyHandmade');
        
        if (projectIndex !== -1) {
            // We found "PurelyHandmade" in path, so construct relative URL
            const basePath = '/' + pathSegments.slice(0, projectIndex + 1).join('/');
            baseUrl = `${basePath}/server/api`;
        } else {
            baseUrl = API_URL;
        }
    }
    
    // Remove trailing slash from base URL if present
    baseUrl = baseUrl.replace(/\/+$/, '');
    
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    
    return baseUrl + '/' + cleanEndpoint;
};

// GET request
const get = async (endpoint, params = {}) => {
    const queryString = Object.keys(params).length > 0
        ? '?' + new URLSearchParams(params).toString()
        : '';
    try {
        const response = await fetch(apiUrl(endpoint) + queryString, {
            method: 'GET',
            credentials: 'include'
        });
        return handleResponse(response);
    } catch (error) {
        console.error("API GET error:", error);
        throw new Error("Network error: " + error.message);
    }
};

// POST request
const post = async (endpoint, data = null, formData = null) => {
    try {
        console.log(`Making POST request to ${apiUrl(endpoint)}`);
        if (data) console.log('POST data:', data);
        
        const options = {
            method: 'POST',
            credentials: 'include'
        };
        if (formData) {
            options.body = formData;
        } else if (data) {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(apiUrl(endpoint), options);
        console.log(`POST response status: ${response.status} ${response.statusText}`);
        return handleResponse(response);
    } catch (error) {
        console.error("API POST error:", error);
        throw new Error("Network error: " + error.message);
    }
};

// PUT request
const put = async (endpoint, data) => {
    try {
        console.log(`Making PUT request to ${apiUrl(endpoint)} with data:`, data);
        const response = await fetch(apiUrl(endpoint), {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache' 
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        console.log(`PUT response status: ${response.status} ${response.statusText}`);
        return handleResponse(response);
    } catch (error) {
        console.error("API PUT error:", error);
        throw new Error("Network error: " + error.message);
    }
};

// DELETE request
const del = async (endpoint) => {
    try {
        const response = await fetch(apiUrl(endpoint), {
            method: 'DELETE',
            credentials: 'include'
        });
        return handleResponse(response);
    } catch (error) {
        console.error("API DELETE error:", error);
        throw new Error("Network error: " + error.message);
    }
};

// Handle API response
const handleResponse = async (response) => {
    if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        let errorData;
        try {
            const text = await response.text();
            console.log('Error response text:', text);
            
            try {
                errorData = JSON.parse(text);
            } catch (parseError) {
                throw new Error(`API error: ${response.status} ${response.statusText} - Invalid JSON response`);
            }
        } catch (e) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        throw new Error(errorData.message || `API error: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        try {
            return await response.json();
        } catch (e) {
            console.error('JSON parse error:', e);
            // Try to read the raw text to see if there's other content
            const text = await response.text();
            console.error('Raw response causing JSON parse error:', text);
            throw new Error('Invalid JSON response from server');
        }
    }
    return await response.text();
};

// Auth API
const auth = {
    register: async (userData) => await post('auth.php?action=register', userData),
    login: async (username, password) => await post('auth.php?action=login', { username, password }),
    logout: async () => {
        try {
            // Using POST method to call logout API
            console.log('Calling logout API...');
            const response = await fetch(apiUrl('auth.php?action=logout'), {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Content-Type': 'application/json'
                }
            });
            
            // Ensure session cookie is cleared
            document.cookie = 'PHPSESSID=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            
            return await handleResponse(response);
        } catch (error) {
            console.error('Logout API error:', error);
            // Try to clear local session state even if API call fails
            document.cookie = 'PHPSESSID=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            throw error;
        }
    },
    checkLoginStatus: async () => {
        try {
            console.log('Checking login status...');
            // Use a more reliable URL construction
            const statusUrl = apiUrl('auth.php?action=status');
            console.log('Login status URL:', statusUrl);
            
            const response = await fetch(statusUrl, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache, no-store',
                    'Content-Type': 'application/json'
                }
            });
            
            return await handleResponse(response);
        } catch (error) {
            console.error('Login status check error:', error);
            // Return a more informative error response
            return { 
                success: false, 
                message: 'Failed to check login status', 
                error: error.message,
                isLoggedIn: false
            };
        }
    }
};

// Products API
const products = {
    getProducts: async (filters = {}) => await get('products.php', filters),
    getProduct: async (id) => await get(`products.php?id=${id}`),
    createProduct: async (productData, productImages = null) => {
        if (productImages) {
            const formData = new FormData();
            
            // Add all product data to form
            for (const key in productData) {
                if (key !== 'images') { // Don't add images array as a separate field
                    formData.append(key, productData[key]);
                }
            }
            
            // Add images to form
            for (let i = 0; i < productImages.length; i++) {
                formData.append('product_images[]', productImages[i]);
            }
            
            // Set primary image if specified
            if (productData.primaryImageIndex !== undefined) {
                formData.append('primary_image_index', productData.primaryImageIndex);
            }
            
            return await post('products.php', null, formData);
        }
        return await post('products.php', productData);
    },
    updateProduct: async (id, productData, productImages = null) => {
        if (productImages) {
            const formData = new FormData();
            
            // Add all product data to form
            for (const key in productData) {
                if (key !== 'images') {
                    formData.append(key, productData[key]);
                }
            }
            
            // Add images to form
            for (let i = 0; i < productImages.length; i++) {
                formData.append('product_images[]', productImages[i]);
            }
            
            // Add method override for PUT
            formData.append('_method', 'PUT');
            
            return await post(`products.php?id=${id}`, null, formData);
        }
        return await put(`products.php?id=${id}`, productData);
    },
    deleteProduct: async (id) => await del(`products.php?id=${id}`),
    
    // Product images specific methods
    addProductImage: async (productId, imageFile, isPrimary = false) => {
        const formData = new FormData();
        formData.append('product_id', productId);
        formData.append('image', imageFile);
        formData.append('is_primary', isPrimary ? '1' : '0');
        return await post('product_images.php?action=add', null, formData);
    },
    
    setMainProductImage: async (productId, imageId) => {
        return await put('product_images.php?action=set_primary', {
            product_id: productId,
            image_id: imageId
        });
    },
    
    deleteProductImage: async (imageId) => {
        return await del(`product_images.php?id=${imageId}`);
    }
};

// Categories API
const categories = {
    getCategories: async () => await get('categories.php'),
    getCategory: async (id) => await get(`categories.php?id=${id}`),
    createCategory: async (categoryData, categoryImage = null) => {
        if (categoryImage) {
            const formData = new FormData();
            for (const key in categoryData) {
                formData.append(key, categoryData[key]);
            }
            formData.append('image', categoryImage);
            return await post('categories.php', null, formData);
        }
        return await post('categories.php', categoryData);
    },
    updateCategory: async (id, categoryData, categoryImage = null) => {
        if (categoryImage) {
            const formData = new FormData();
            for (const key in categoryData) {
                formData.append(key, categoryData[key]);
            }
            formData.append('image', categoryImage);
            // Add method override for PUT
            formData.append('_method', 'PUT');
            return await post(`categories.php?id=${id}`, null, formData);
        }
        return await put(`categories.php?id=${id}`, categoryData);
    },
    deleteCategory: async (id) => await del(`categories.php?id=${id}`)
};

// Users API
const users = {
    getUsers: async (params = {}) => await get('users.php', params),
    getUser: async (id) => await get(`users.php?id=${id}`),
    updateUser: async (userData, userAvatar = null) => {
        if (userAvatar) {
            const formData = new FormData();
            for (const key in userData) {
                formData.append(key, userData[key]);
            }
            formData.append('avatar', userAvatar);
            return await post(`users.php?action=update_profile`, null, formData);
        }
        return await post(`users.php?action=update_profile`, userData);
    },
    updateUserById: async (id, userData, userAvatar = null) => {
        if (userAvatar) {
            const formData = new FormData();
            for (const key in userData) {
                formData.append(key, userData[key]);
            }
            formData.append('avatar', userAvatar);
            // Add method override for PUT
            formData.append('_method', 'PUT');
            return await post(`users.php?id=${id}`, null, formData);
        }
        return await put(`users.php?id=${id}`, userData);
    },
    deleteUser: async (id) => await post(`users.php?action=delete&id=${id}`)
};

// Orders API
const orders = {
    createOrder: async (orderData) => await post('orders.php?action=create', orderData),
    getUserOrders: async (userId) => await get(`orders.php?user_id=${userId}`),
    getAllOrders: async (params = {}) => await get('orders.php', params),
    getOrderCount: async () => await get('orders.php?action=count'),
    updateOrderStatus: async (orderId, status, adminNotes = '') => {
        return await post(`orders.php?id=${orderId}&action=update`, {
            status,
            admin_notes: adminNotes
        });
    }
};

// Reviews API
const reviews = {
    getProductReviews: async (productId) => await get(`product_reviews.php?product_id=${productId}`),
    getAllReviews: async () => await get('product_reviews.php'),
    addReview: async (productId, rating, reviewText) => await post('product_reviews.php?action=add', { 
        product_id: productId, 
        rating, 
        review_text: reviewText 
    }),
    updateReview: async (reviewId, rating, reviewText) => await put(`product_reviews.php?id=${reviewId}`, {
        rating,
        review_text: reviewText
    }),
    deleteReview: async (reviewId) => await del(`product_reviews.php?id=${reviewId}`)
};

// Addresses API
const addresses = {
    getUserAddresses: async () => await get('addresses.php?action=user_addresses'),
    getAddress: async (id) => await get(`addresses.php?id=${id}`),
    addAddress: async (addressData) => await post('addresses.php?action=add', addressData),
    updateAddress: async (id, addressData) => await put(`addresses.php?id=${id}`, addressData),
    deleteAddress: async (id) => await del(`addresses.php?id=${id}`),
    setDefaultAddress: async (id) => await post('addresses.php?action=set_default', { address_id: id })
};

// Export APIs
const api = {
    auth,
    products,
    categories,
    users,
    orders,
    reviews,
    addresses,
    apiUrl
};

// Make API global
window.api = api;