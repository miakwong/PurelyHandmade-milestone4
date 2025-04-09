// Cart functionality

// Define cart API object
const cart = {
  getCart: async () => {
    try {
      return await get('cart.php');
    } catch (error) {
      // If API request fails, fallback to localStorage
      const cartData = localStorage.getItem('cart');
      return cartData ? JSON.parse(cartData) : [];
    }
  },
  
  addToCart: async (productId, quantity) => {
    try {
      return await post('cart.php?action=add', { product_id: productId, quantity });
    } catch (error) {
      // If API request fails, fallback to localStorage
      const productsData = localStorage.getItem('products');
      if (!productsData) throw new Error('Products data not available');
      
      const products = JSON.parse(productsData);
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error('Product not found');
      
      // Get existing cart
      let cart = [];
      const cartData = localStorage.getItem('cart');
      if (cartData) {
        cart = JSON.parse(cartData);
      }
      
      // Check if product is already in the cart
      const existingItem = cart.find(item => item.id === productId);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.onSale && product.salePrice ? product.salePrice : product.price,
          image: product.images[0],
          quantity: quantity
        });
      }
      
      // Save to localStorage
      localStorage.setItem('cart', JSON.stringify(cart));
      
      return cart;
    }
  },
  
  updateCart: async (productId, quantity) => {
    try {
      return await post('cart.php?action=update', { product_id: productId, quantity });
    } catch (error) {
      // If API request fails, fallback to localStorage
      const cartData = localStorage.getItem('cart');
      if (!cartData) throw new Error('Cart not available');
      
      let cart = JSON.parse(cartData);
      const item = cart.find(item => item.id === productId);
      
      if (item) {
        if (quantity <= 0) {
          // Remove product
          cart = cart.filter(item => item.id !== productId);
        } else {
          // Update quantity
          item.quantity = quantity;
        }
        
        // Save to localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
      }
      
      return cart;
    }
  },
  
  removeFromCart: async (productId) => {
    try {
      return await post('cart.php?action=remove', { product_id: productId });
    } catch (error) {
      // If API request fails, fallback to localStorage
      const cartData = localStorage.getItem('cart');
      if (!cartData) throw new Error('Cart not available');
      
      let cart = JSON.parse(cartData);
      // Remove product
      cart = cart.filter(item => item.id !== productId);
      
      // Save to localStorage
      localStorage.setItem('cart', JSON.stringify(cart));
      
      return cart;
    }
  },
  
  clearCart: async () => {
    try {
      return await post('cart.php?action=clear');
    } catch (error) {
      // If API request fails, fallback to localStorage
      localStorage.removeItem('cart');
      return [];
    }
  }
};

// Add to cart function
function addToCart(productId, quantity) {
  // Use API to add to cart
  cart.addToCart(productId, quantity)
    .then(response => {
      // Find product information to display name
      const product = productsList.find(p => p.id === productId);
      if (product) {
        // Show success message
        showToast(`${product.name} added to your cart!`, 'success');
      } else {
        showToast('Product added to your cart!', 'success');
      }
      
      // Update cart count in navbar
      updateCartCount();
    })
    .catch(error => {
      console.error('Error adding to cart:', error);
      showToast('Error adding product to cart. Please try again.', 'error');
    });
}

// Update cart count function
function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  
  if (!cartCount) return;
  
  // Use API to get cart count
  cart.getCart()
    .then(cartData => {
      const count = cartData.reduce((total, item) => total + item.quantity, 0);
      cartCount.textContent = count;
      cartCount.style.display = count > 0 ? 'inline-block' : 'none';
    })
    .catch(error => {
      console.error('Error getting cart:', error);
      cartCount.style.display = 'none';
    });
}

// Attach functions and the cart object to the window object to make them globally available
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
window.cart = cart; 