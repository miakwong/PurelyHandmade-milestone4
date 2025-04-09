// 购物车功能

// 定义购物车API
const cart = {
  getCart: async () => {
    try {
      return await get('cart.php');
    } catch (error) {
      // 如果API请求失败，回退到localStorage
      const cartData = localStorage.getItem('cart');
      return cartData ? JSON.parse(cartData) : [];
    }
  },
  
  addToCart: async (productId, quantity) => {
    try {
      return await post('cart.php?action=add', { product_id: productId, quantity });
    } catch (error) {
      // 如果API请求失败，回退到localStorage
      const productsData = localStorage.getItem('products');
      if (!productsData) throw new Error('Products data not available');
      
      const products = JSON.parse(productsData);
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error('Product not found');
      
      // 获取现有购物车
      let cart = [];
      const cartData = localStorage.getItem('cart');
      if (cartData) {
        cart = JSON.parse(cartData);
      }
      
      // 检查产品是否已在购物车中
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
      
      // 保存到localStorage
      localStorage.setItem('cart', JSON.stringify(cart));
      
      return cart;
    }
  },
  
  updateCart: async (productId, quantity) => {
    try {
      return await post('cart.php?action=update', { product_id: productId, quantity });
    } catch (error) {
      // 如果API请求失败，回退到localStorage
      const cartData = localStorage.getItem('cart');
      if (!cartData) throw new Error('Cart not available');
      
      let cart = JSON.parse(cartData);
      const item = cart.find(item => item.id === productId);
      
      if (item) {
        if (quantity <= 0) {
          // 移除产品
          cart = cart.filter(item => item.id !== productId);
        } else {
          // 更新数量
          item.quantity = quantity;
        }
        
        // 保存到localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
      }
      
      return cart;
    }
  },
  
  removeFromCart: async (productId) => {
    try {
      return await post('cart.php?action=remove', { product_id: productId });
    } catch (error) {
      // 如果API请求失败，回退到localStorage
      const cartData = localStorage.getItem('cart');
      if (!cartData) throw new Error('Cart not available');
      
      let cart = JSON.parse(cartData);
      // 移除产品
      cart = cart.filter(item => item.id !== productId);
      
      // 保存到localStorage
      localStorage.setItem('cart', JSON.stringify(cart));
      
      return cart;
    }
  },
  
  clearCart: async () => {
    try {
      return await post('cart.php?action=clear');
    } catch (error) {
      // 如果API请求失败，回退到localStorage
      localStorage.removeItem('cart');
      return [];
    }
  }
};

// 添加到购物车
function addToCart(productId, quantity) {
  // 使用API添加到购物车
  cart.addToCart(productId, quantity)
    .then(response => {
      // 找到要添加的产品信息，用于显示名称
      const product = productsList.find(p => p.id === productId);
      if (product) {
        // 显示成功消息
        showToast(`${product.name} added to your cart!`, 'success');
      } else {
        showToast('Product added to your cart!', 'success');
      }
      
      // 更新导航栏购物车计数
      updateCartCount();
    })
    .catch(error => {
      console.error('Error adding to cart:', error);
      showToast('Error adding product to cart. Please try again.', 'error');
    });
}

// 更新购物车计数
function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  
  if (!cartCount) return;
  
  // 使用API获取购物车计数
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