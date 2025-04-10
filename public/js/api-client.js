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
    } catch (error) {
        console.error("API POST error:", error);
        throw new Error("Network error: " + error.message);
    }
};

// PUT request
const put = async (endpoint, data) => {
    try {
        const response = await fetch(apiUrl(endpoint), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
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
    getUsers: async () => await get('users.php'),
    getUser: async (id) => await get(`users.php?id=${id}`),
    updateUser: async (id, userData, userAvatar = null) => {
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
    }
};

// Orders API
const orders = {
    createOrder: async (orderData) => await post('orders.php?action=create', orderData),
    getUserOrders: async (userId) => await get(`orders.php?user_id=${userId}`)
};

// Reviews API
const reviews = {
    getProductReviews: async (productId) => await get(`reviews.php?product_id=${productId}`),
    addReview: async (productId, rating, reviewText) => await post('reviews.php?action=add', { 
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
    orders,
    reviews
};

// Make API global
window.api = api;