// Cart functionality

// Define cart API object
const cartAPI = {
  // 内部方法：检查登录状态
  _checkLogin: async function() {
    const isLoggedIn = await checkUserLogin();
    if (!isLoggedIn) {
      if (typeof showToast === 'function') {
        showToast('Please log in to view your cart', 'warning');
      } else {
        alert('Please log in to view your cart');
      }
      
      setTimeout(() => {
        window.location.href = (window.location.pathname.includes('/views/') ? '../auth/login.html' : 'views/auth/login.html');
      }, 1500);
      
      return false;
    }
    return true;
  },

  getCart: async () => {
    try {
      if (!await cartAPI._checkLogin()) return [];
      return await get('cart.php');
    } catch (error) {
      const cartData = localStorage.getItem('cart');
      return cartData ? JSON.parse(cartData) : [];
    }
  },
  
  addToCart: async (productId, quantity) => {
    try {
      if (!await cartAPI._checkLogin()) return { success: false, message: "Login required" };
      return await post('cart.php', { product_id: productId, quantity });
    } catch (error) {
      throw error;
    }
  },
  
  updateCart: async (productId, quantity) => {
    try {
      if (!await cartAPI._checkLogin()) return { success: false, message: "Login required" };
      return await put('cart.php', { product_id: productId, quantity });
    } catch (error) {
      throw error;
    }
  },
  
  removeFromCart: async (productId) => {
    try {
      if (!await cartAPI._checkLogin()) return { success: false, message: "Login required" };
      return await del(`cart.php?productId=${productId}`);
    } catch (error) {
      throw error;
    }
  },
  
  clearCart: async () => {
    try {
      if (!await cartAPI._checkLogin()) return { success: false, message: "Login required" };
      return await post('cart.php?clear=1');
    } catch (error) {
      throw error;
    }
  }
};

// Function to check if user is logged in
function checkUserLogin() {
  // Call auth.php with the correct action parameter
  const authUrl = `${config.apiUrl}/auth.php?action=status`;
  console.log("Checking login status:", authUrl);
  
  return fetch(authUrl)
    .then(response => {
      return response.json();
    })
    .then(data => {
      console.log("Auth status response:", data);
      // Check for success field in the response
      return data.success === true;
    })
    .catch(error => {
      console.error('Error checking auth status:', error);
      // Assume user is not logged in if there's an error
      return false;
    });
}

// Add to cart function
function addToCart(productId, quantity) {
  cartAPI.addToCart(productId, quantity)
    .then(response => {
      if (response.success) {
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
      }
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
  
  // Check if user is logged in
  checkUserLogin()
    .then(isLoggedIn => {
      if (!isLoggedIn) {
        cartCount.style.display = 'none';
        return;
      }
      
      // Get cart data
      cartAPI.getCart()
        .then(cartData => {
          const count = cartData.reduce((total, item) => total + item.quantity, 0);
          cartCount.textContent = count;
          cartCount.style.display = count > 0 ? 'inline-block' : 'none';
        })
        .catch(error => {
          console.error('Error getting cart:', error);
          cartCount.style.display = 'none';
        });
    })
    .catch(error => {
      console.error('Error checking login status:', error);
      cartCount.style.display = 'none';
    });
}

// Attach functions and the cart object to the window object to make them globally available
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
window.checkUserLogin = checkUserLogin;
window.cart = cartAPI; 