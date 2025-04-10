const API_URL = '/~miakuang/PurelyHandmade/server/api/';

// Get full API URL
const apiUrl = (endpoint) => {
    if (window.config && window.config.apiUrl) {
        return window.config.apiUrl + '/' + endpoint;
    }
    return API_URL + endpoint;
};

// GET request
const get = async (endpoint, params = {}) => {
    const queryString = Object.keys(params).length > 0
        ? '?' + new URLSearchParams(params).toString()
        : '';
    const response = await fetch(apiUrl(endpoint) + queryString, {
        method: 'GET',
        credentials: 'include'
    });
    return handleResponse(response);
};

// POST request
const post = async (endpoint, data = null, formData = null) => {
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
    return handleResponse(response);
};

// PUT request
const put = async (endpoint, data) => {
    const response = await fetch(apiUrl(endpoint), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
    });
    return handleResponse(response);
};

// DELETE request
const del = async (endpoint) => {
    const response = await fetch(apiUrl(endpoint), {
        method: 'DELETE',
        credentials: 'include'
    });
    return handleResponse(response);
};

// Handle API response
const handleResponse = async (response) => {
    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        throw new Error(errorData.message || `API error: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }
    return await response.text();
};

// Auth API
const auth = {
    register: async (userData) => await post('auth.php?action=register', userData),
    login: async (username, password) => await post('auth.php?action=login', { username, password }),
    logout: async () => await get('auth.php?action=logout'),
    checkLoginStatus: async () => {
        try {
            const response = await fetch(apiUrl('auth.php?action=status'), {
                method: 'GET',
                credentials: 'include'
            });
            if (!response.ok) {
                if (response.status === 401) {
                    return { success: false, message: 'User is not logged in' };
                }
                const errorText = await response.text();
                console.warn(`Auth status check failed: ${response.status}`, errorText);
                return { success: false, message: `Auth check failed: ${response.status}` };
            }
            return await response.json();
        } catch (error) {
            console.error('Error in auth status check:', error);
            return { success: false, message: 'Error checking auth status' };
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
            for (const key in productData) {
                formData.append(key, productData[key]);
            }
            for (let i = 0; i < productImages.length; i++) {
                formData.append('images[]', productImages[i]);
            }
            return await post('products.php', null, formData);
        }
        return await post('products.php', productData);
    },
    updateProduct: async (id, productData) => await put(`products.php?id=${id}`, productData),
    deleteProduct: async (id) => await del(`products.php?id=${id}`)
};

// Categories API
const categories = {
    getCategories: async () => await get('categories.php'),
    getCategory: async (id) => await get(`categories.php?id=${id}`),
    createCategory: async (categoryData) => await post('categories.php', categoryData),
    updateCategory: async (id, categoryData) => await put(`categories.php?id=${id}`, categoryData),
    deleteCategory: async (id) => await del(`categories.php?id=${id}`)
};
// Users API
const users = {
    getUsers: async () => await get('users.php'),
    getUser: async (id) => await get(`users.php?id=${id}`),
    updateUser: async (id, userData) => await put(`users.php?id=${id}`, userData)
};

// Cart API
const cart = {
    getCart: async () => await get('cart.php'),
    addToCart: async (productId, quantity = 1) => await post('cart.php', { product_id: productId, quantity }),
    updateCart: async (productId, quantity) => await put('cart.php', { product_id: productId, quantity }),
    removeFromCart: async (productId) => await del(`cart.php?product_id=${productId}`),
    clearCart: async () => await del('cart.php')
};

// Reviews API
const reviews = {
    getProductReviews: async (productId) => await get('reviews.php', { product_id: productId }),
    addReview: async (productId, rating, reviewText) => await post('reviews.php', { 
        product_id: productId, 
        rating, 
        review_text: reviewText 
    }),
    updateReview: async (reviewId, rating, reviewText) => await put(`reviews.php?id=${reviewId}`, {
        rating,
        review_text: reviewText
    }),
    deleteReview: async (reviewId) => await del(`reviews.php?id=${reviewId}`)
};

// Export APIs
const api = {
    auth,
    products,
    categories,
    users,
    cart,
    reviews
};

// Make API global
window.api = api;