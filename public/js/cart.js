// Cart functionality for PurelyHandmade - localStorage version

// Use window object to avoid duplicate declaration errors
window.cart = window.cart || [];
window.isCartOpen = window.isCartOpen || false;

// Initialize cart functionality after DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('Cart.js loaded - initializing cart functionality');
    
    // Initialize immediately
    initializeCart();
    
    // Setup event listeners - will be applied once cart sidebar is loaded
    setupCartSidebarObserver();
});

// Monitor cart sidebar loading
function setupCartSidebarObserver() {
    const cartSidebarPlaceholder = document.getElementById('cart-sidebar-placeholder');
    if (!cartSidebarPlaceholder) {
        console.log('Cart sidebar placeholder not found, waiting for it to be created...');
        // No placeholder yet, wait a bit and check if it gets created
        setTimeout(setupCartSidebarObserver, 500);
        return;
    }
    
    // Create a MutationObserver to monitor when cart sidebar gets loaded
    const observer = new MutationObserver(function(mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Cart sidebar was likely loaded, try to set up cart
                console.log('Cart sidebar loaded, setting up cart functionality');
                setupCartEventListeners();
                loadCartFromStorage();
                observer.disconnect();
                break;
            }
        }
    });
    
    // Start observing the cart sidebar placeholder
    observer.observe(cartSidebarPlaceholder, { childList: true, subtree: true });
    
    // Check if cart sidebar is already loaded
    if (document.getElementById('cart-sidebar')) {
        console.log('Cart sidebar already exists, setting up cart functionality');
        setupCartEventListeners();
        loadCartFromStorage();
    }
}

// Initialize cart functionality
function initializeCart() {
    // Only update cart count on page load if element exists
    updateCartCount();
    
    // Setup navbar observer (for toggle cart button)
    setupNavbarObserver();
}

// Monitor navbar loading to ensure cart button works
function setupNavbarObserver() {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (!navbarPlaceholder) return;
    
    // Create a MutationObserver to monitor when navbar gets loaded
    const observer = new MutationObserver(function(mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Navbar was likely loaded, try to set up cart button again
                console.log('Navbar update detected, reinstalling cart button listeners');
                const toggleCartBtn = document.getElementById('toggle-cart-btn');
                if (toggleCartBtn) {
                    toggleCartBtn.addEventListener('click', toggleCart);
                    console.log('Cart button listener attached successfully');
                }
                // Stop observing after setting up the event listeners
                observer.disconnect();
                break;
            }
        }
    });
    
    // Start observing the navbar placeholder
    observer.observe(navbarPlaceholder, { childList: true, subtree: true });
}

// Setup event listeners for cart controls
function setupCartEventListeners() {
    // Toggle cart button
    const toggleCartBtn = document.getElementById('toggle-cart-btn');
    if (toggleCartBtn) {
        toggleCartBtn.addEventListener('click', toggleCart);
    }
    
    // Close cart button
    const closeCartBtn = document.getElementById('close-cart-btn');
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', closeCart);
    }
    
    // Cart overlay click to close
    const cartOverlay = document.getElementById('cart-overlay');
    if (cartOverlay) {
        cartOverlay.addEventListener('click', closeCart);
    }
    
    // Clear cart button
    const clearCartBtn = document.getElementById('clear-cart-btn');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }
    
    // Setup add to cart buttons
    setupAddToCartButtons();
    
    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
}

// Setup add to cart buttons on product cards
function setupAddToCartButtons() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            const productId = this.getAttribute('data-product-id');
            if (productId) {
                addToCart(productId, 1);
            }
        });
    });
} 

// Load cart from localStorage
function loadCartFromStorage() {
    const storedCart = localStorage.getItem('cart');
    
    if (storedCart) {
        try {
            window.cart = JSON.parse(storedCart);
            console.log('Loaded cart from localStorage:', window.cart);
            
            // Update cart items for compatibility with new structure
            window.cart.forEach(item => {
                // Ensure each item has the required properties
                if (item.originalPrice === undefined) {
                    item.originalPrice = item.price;
                }
                if (item.onSale === undefined) {
                    item.onSale = false;
                }
            });
            
            // Check prices of all items in cart by refreshing from API
            refreshCartPrices();
            
            // Render cart UI
            renderCart();
            
            // Update cart count
            updateCartCount();
        } catch (error) {
            console.error('Error parsing cart from localStorage:', error);
            window.cart = [];
        }
    } else {
        window.cart = [];
    }
}

// Refresh prices of all cart items from API
function refreshCartPrices() {
    if (!window.cart || window.cart.length === 0) return;
    
    const productIds = window.cart.map(item => item.id);
    
    // Get updated product data for all items in cart
    fetch(`/~miakuang/PurelyHandmade/server/api/products.php`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const products = data.data;
                
                // Update each cart item with latest price information
                window.cart.forEach(cartItem => {
                    const product = products.find(p => p.id === cartItem.id);
                    if (product) {
                        // Determine if product is on sale
                        const isSale = (product.onSale === true || product.is_featured === 1 || product.is_featured === '1');
                        const hasDiscount = (isSale && product.salePrice !== undefined && product.salePrice !== null);
                        
                        // Store original price
                        cartItem.originalPrice = parseFloat(product.price);
                        
                        // Set price based on sale status
                        if (hasDiscount) {
                            cartItem.price = parseFloat(product.salePrice);
                            cartItem.onSale = true;
                        } else if (isSale) {
                            // 20% discount for featured items without explicit sale price
                            cartItem.price = parseFloat((cartItem.originalPrice * 0.8).toFixed(2));
                            cartItem.onSale = true;
                        } else {
                            cartItem.price = cartItem.originalPrice;
                            cartItem.onSale = false;
                        }
                        
                        console.log(`Updated cart item ${cartItem.id}: ${cartItem.name}`, {
                            original: cartItem.originalPrice,
                            price: cartItem.price,
                            onSale: cartItem.onSale
                        });
                    }
                });
                
                // Save updated cart to localStorage
                saveCartToStorage();
                
                // Refresh cart UI
                renderCart();
            }
        })
        .catch(error => {
            console.error('Error refreshing cart prices:', error);
        });
}

// Add product to cart
function addToCart(productId, quantity = 1) {
    console.log(`Adding product ${productId} to cart, quantity: ${quantity}`);
    
    // Fetch the product details from API
    fetch(`/~miakuang/PurelyHandmade/server/api/products.php?id=${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.data;
                console.log('Product data:', product); // Debug log to check product data
                
                // Determine if product is on sale
                const isSale = (product.onSale === true || product.is_featured === 1 || product.is_featured === '1');
                const hasDiscount = (isSale && product.salePrice !== undefined && product.salePrice !== null);
                
                // Store original price
                const originalPrice = parseFloat(product.price);
                
                // Calculate actual price
                let productPrice;
                if (hasDiscount) {
                    productPrice = parseFloat(product.salePrice);
                } else if (isSale) {
                    // Apply 20% discount for featured items without explicit sale price
                    productPrice = parseFloat((originalPrice * 0.8).toFixed(2));
                } else {
                    productPrice = originalPrice;
                }
                
                // Check if item already exists in cart
                const existingItemIndex = window.cart.findIndex(item => item.id === parseInt(productId));
                
                if (existingItemIndex !== -1) {
                    // Update quantity if item exists
                    window.cart[existingItemIndex].quantity += quantity;
                    // Update price information
                    window.cart[existingItemIndex].price = productPrice;
                    window.cart[existingItemIndex].originalPrice = originalPrice;
                    window.cart[existingItemIndex].onSale = isSale;
                } else {
                    // Add new item to cart with correct price
                    window.cart.push({
                        id: parseInt(productId),
                        name: product.name,
                        price: productPrice,
                        originalPrice: originalPrice,
                        onSale: isSale,
                        image: product.image || (product.images && product.images.length > 0 ? product.images[0] : ''),
                        quantity: quantity
                    });
                }
                
                // Save cart to localStorage
                saveCartToStorage();
                
                // Refresh cart UI
                renderCart();
                
                // Update cart count
                updateCartCount();
                
                // Open cart
                openCart();
                
                // Show success message
                showToast('Product added to cart!', 'success');
            } else {
                showToast('Unable to add product to cart', 'error');
            }
        })
        .catch(error => {
            console.error('Error fetching product details:', error);
            showToast('Error adding product to cart', 'error');
        });
}

// Remove item from cart
function removeFromCart(productId) {
    // Filter out the item with the given product ID
    window.cart = window.cart.filter(item => item.id !== parseInt(productId));
    
    // Save cart to localStorage
    saveCartToStorage();
    
    // Refresh cart UI
    renderCart();
    
    // Update cart count
    updateCartCount();
    
    // Show success message
    showToast('Product removed from cart', 'success');
}

// Update item quantity in cart
function updateCartItemQuantity(productId, quantity) {
    if (quantity < 1) return;
    
    const itemIndex = window.cart.findIndex(item => item.id === parseInt(productId));
    
    if (itemIndex !== -1) {
        window.cart[itemIndex].quantity = quantity;
        
        // Save cart to localStorage
        saveCartToStorage();
        
        // Refresh cart UI
        renderCart();
        
        // Update cart count
        updateCartCount();
    }
}

// Clear entire cart
function clearCart() {
    // Empty the cart array
    window.cart = [];
    
    // Save empty cart to localStorage
    saveCartToStorage();
    
    // Refresh cart UI
    renderCart();
    
    // Update cart count
    updateCartCount();
    
    // Show success message
    showToast('Cart has been cleared', 'success');
}

// Save cart to localStorage
function saveCartToStorage() {
    localStorage.setItem('cart', JSON.stringify(window.cart));
    console.log('Saved cart to localStorage:', window.cart);
}

// Render cart contents
function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    
    if (!cartItemsContainer) {
        console.error('Cart items container not found');
        return;
    }
    
    // Clear cart items container
    cartItemsContainer.innerHTML = '';
    
    // Check if cart is empty
    if (!window.cart || window.cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart-message text-center py-5">
                <i class="bi bi-cart text-muted" style="font-size: 48px;"></i>
                <p class="mt-3">Your cart is empty</p>
                <button class="btn btn-primary mt-2" onclick="closeCart()">Continue Shopping</button>
            </div>
        `;
        
        // Update total
        const totalElement = document.getElementById('cart-total-price');
        if (totalElement) {
            totalElement.textContent = '$0.00';
        }
        return;
    }
    
    // Calculate total
    let total = 0;
    
    // Add each item to the cart UI
    window.cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItemElement = document.createElement('div');
        cartItemElement.className = 'cart-item';
        
        // Display price based on whether item is on sale or not
        let priceDisplay = '';
        if (item.onSale) {
            priceDisplay = `<div class="cart-item-price">$${parseFloat(item.price).toFixed(2)} <small class="text-muted text-decoration-line-through">$${parseFloat(item.originalPrice).toFixed(2)}</small></div>`;
        } else {
            priceDisplay = `<div class="cart-item-price">$${parseFloat(item.price).toFixed(2)}</div>`;
        }
        
        cartItemElement.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                ${priceDisplay}
                <div class="cart-item-quantity">
                    <button class="cart-quantity-btn decrease-quantity" data-product-id="${item.id}">-</button>
                    <input type="number" class="cart-quantity-input" value="${item.quantity}" min="1" data-product-id="${item.id}">
                    <button class="cart-quantity-btn increase-quantity" data-product-id="${item.id}">+</button>
                    <i class="bi bi-trash cart-item-remove" data-product-id="${item.id}"></i>
                </div>
            </div>
        `;
        
        cartItemsContainer.appendChild(cartItemElement);
    });
    
    // Update total price
    const totalElement = document.getElementById('cart-total-price');
    if (totalElement) {
        totalElement.textContent = `$${total.toFixed(2)}`;
    }
    
    // Add event listeners to quantity buttons and remove buttons
    setupCartItemEvents();
}

// Setup event listeners for cart item controls
function setupCartItemEvents() {
    // Decrease quantity buttons
    document.querySelectorAll('.decrease-quantity').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const quantityInput = document.querySelector(`.cart-quantity-input[data-product-id="${productId}"]`);
            let currentQuantity = parseInt(quantityInput.value);
            
            if (currentQuantity > 1) {
                updateCartItemQuantity(productId, currentQuantity - 1);
            }
        });
    });
    
    // Increase quantity buttons
    document.querySelectorAll('.increase-quantity').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const quantityInput = document.querySelector(`.cart-quantity-input[data-product-id="${productId}"]`);
            let currentQuantity = parseInt(quantityInput.value);
            
            updateCartItemQuantity(productId, currentQuantity + 1);
        });
    });
    
    // Quantity input change
    document.querySelectorAll('.cart-quantity-input').forEach(input => {
        input.addEventListener('change', function() {
            const productId = this.getAttribute('data-product-id');
            let quantity = parseInt(this.value);
            
            if (isNaN(quantity) || quantity < 1) {
                quantity = 1;
                this.value = 1;
            }
            
            updateCartItemQuantity(productId, quantity);
        });
    });
    
    // Remove buttons
    document.querySelectorAll('.cart-item-remove').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            removeFromCart(productId);
        });
    });
}

// Update cart count badge
function updateCartCount() {
    const cartCountElement = document.getElementById('cart-count');
    
    // Silently return if element doesn't exist
    if (!cartCountElement) return;
    
    // Calculate total items in cart
    const itemCount = window.cart.reduce((total, item) => total + item.quantity, 0);
    
    // Update cart count badge
    if (itemCount > 0) {
        cartCountElement.textContent = itemCount;
        cartCountElement.style.display = 'inline-block';
    } else {
        cartCountElement.style.display = 'none';
    }
}

// Open cart sidebar
function openCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.add('open');
        cartOverlay.classList.add('open');
        window.isCartOpen = true;
        console.log('Cart opened');
    } else {
        console.error('Cart sidebar or overlay not found');
    }
}

// Close cart sidebar
function closeCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.remove('open');
        cartOverlay.classList.remove('open');
        window.isCartOpen = false;
        console.log('Cart closed');
    }
}

// Toggle cart sidebar
function toggleCart() {
    if (window.isCartOpen) {
        closeCart();
    } else {
        openCart();
    }
}

// Process checkout
function checkout() {
    if (window.cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    // Calculate total amount
    const total = window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Prepare order data
    const orderData = {
        items: window.cart.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price
        })),
        total_amount: total
    };
    
    // Check if user is logged in
    fetch('/~miakuang/PurelyHandmade/server/api/auth.php?action=status', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.isLoggedIn) {
            // User is logged in, process order
            processOrder(orderData);
        } else {
            // User is not logged in, prompt to login
            showToast('Please login before creating an order', 'error');
            // Redirect to login page
            // window.location.href = '/~miakuang/PurelyHandmade/public/views/auth/login.html';
        }
    })
    .catch(error => {
        console.error('Error checking login status:', error);
        showToast('Checkout processing error', 'error');
    });
}

// Process order creation
function processOrder(orderData) {
    showToast('Processing order...', 'info');
    
    // Submit order to server
    fetch('/~miakuang/PurelyHandmade/server/api/orders.php?action=create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Order created successfully
            showToast('Order created successfully!', 'success');
            
            // Clear cart
            clearCart();
            
            // Close cart sidebar
            closeCart();
            
            // Optionally redirect to order confirmation page
            // window.location.href = `/~miakuang/PurelyHandmade/public/views/checkout/confirmation.html?order=${data.order_number}`;
        } else {
            showToast(`Order creation failed: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('Error creating order:', error);
        showToast('Order processing error', 'error');
    });
}

// Show toast notification
function showToast(message, type) {
    let title;
    switch (type) {
        case 'success':
            title = 'Success';
            break;
        case 'error':
            title = 'Error';
            break;
        case 'info':
            title = 'Information';
            break;
        default:
            title = 'Notice';
    }
    
    // Don't check for global showToast to avoid recursion
    // Create a direct implementation instead
    
    // Fallback implementation
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error('Toast container not found');
        return;
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Set toast content
    toast.innerHTML = `
        <div class="toast-header ${type === 'error' ? 'bg-danger text-white' : type === 'success' ? 'bg-success text-white' : ''}">
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
        ${message}
        </div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
    
    // Close button handler
    toast.querySelector('.btn-close').addEventListener('click', function() {
        toast.remove();
    });
}

// Global scope functions needed for HTML event handlers
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.clearCart = clearCart;
window.openCart = openCart;
window.closeCart = closeCart;
window.toggleCart = toggleCart;
window.checkout = checkout;
// Do NOT export showToast to window object to avoid recursion
