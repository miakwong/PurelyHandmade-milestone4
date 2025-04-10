/**
 * navbar.js - Handle navbar login state and user menu
 * Manages the navigation bar UI based on authentication status
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the navbar once it's loaded
  // We need to ensure navbar is loaded before initialization
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && 
          document.getElementById('userDropdown')) {
        // The navbar has been loaded, initialize it
        observer.disconnect();
        initializeNavbar();
      }
    });
  });
  
  // Start observing navbar placeholder
  const navbarPlaceholder = document.getElementById('navbar-placeholder');
  if (navbarPlaceholder) {
    observer.observe(navbarPlaceholder, { 
      childList: true, 
      subtree: true 
    });
  } else {
    // If navbar-placeholder doesn't exist, this could be a page 
    // where navbar is directly included, try to initialize directly
    setTimeout(initializeNavbar, 100);
  }
});

/**
 * Initialize navbar elements and authentication state
 */
function initializeNavbar() {
  console.log('Initializing navbar...');
  
  // Get navbar elements
  const userDropdown = document.getElementById('userDropdown');
  const dropdownMenu = document.querySelector('.dropdown-menu[aria-labelledby="userDropdown"]');
  
  console.log('Navbar elements found:', {
    userDropdown: !!userDropdown,
    dropdownMenu: !!dropdownMenu
  });
  
  if (!userDropdown || !dropdownMenu) {
    console.error('Navbar elements not found');
    return;
  }
  
  // Check authentication status
  checkAuthStatus();
  
  // Initialize Bootstrap dropdown (if not already initialized)
  if (typeof bootstrap !== 'undefined') {
    const dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
    dropdownElementList.map(function (dropdownToggleEl) {
      return new bootstrap.Dropdown(dropdownToggleEl);
    });
  }
}

/**
 * Check authentication status and update navbar accordingly
 */
function checkAuthStatus() {
  console.log('Checking auth status for navbar...');
  
  // Check if API is available
  if (!window.api || !window.api.auth) {
    console.error('API client not available for auth check');
    updateNavbarForLoggedOutUser();
    return;
  }
  
  try {
    api.auth.checkLoginStatus()
      .then(response => {
        console.log('Navbar auth check response:', response);
        
        // 更简化和明确的登录状态检查
        let isLoggedIn = false;
        let userData = {};
        
        // 检查响应是否成功
        if (!response || !response.success) {
          console.log('Auth check returned unsuccessful response');
          updateNavbarForLoggedOutUser();
          return;
        }
        
        // 从响应中提取登录状态
        if (response.data) {
          // 首先明确检查isLoggedIn标志
          if (response.data.isLoggedIn === true) {
            isLoggedIn = true;
            userData = response.data.user || response.data;
          } 
          // 如果response.data中有用户ID，则认为已登录
          else if (response.data.id || response.data.user_id) {
            isLoggedIn = true;
            userData = response.data;
          }
        }
        
        // 检查顶层的字段
        if (!isLoggedIn) {
          if (response.isLoggedIn === true) {
            isLoggedIn = true;
            userData = response.user || {};
          } else if (response.user && (response.user.id || response.user.user_id)) {
            isLoggedIn = true;
            userData = response.user;
          } else if (response.message === 'User is logged in') {
            isLoggedIn = true;
            // 尝试从response中找出用户数据
            userData = response.user || response.data || {};
          }
        }
        
        // 明确的未登录消息优先级最高
        if (response.message === 'Not logged in' || 
            (response.data && response.data.isLoggedIn === false)) {
          console.log('Received explicit not logged in message');
          isLoggedIn = false;
          userData = {};
        }
        
        console.log('Login status determined:', isLoggedIn ? 'Logged in' : 'Not logged in');
        
        if (isLoggedIn && Object.keys(userData).length > 0) {
          console.log('User is logged in with data:', userData);
          updateNavbarForLoggedInUser(userData);
          
          // 缓存用户数据供其他页面使用
          try {
            localStorage.setItem('userData', JSON.stringify(userData));
          } catch (e) {
            console.warn('Failed to cache user data:', e);
          }
        } else {
          console.log('User is not logged in or no user data available');
          updateNavbarForLoggedOutUser();
          
          // 清除缓存的用户数据
          try {
            localStorage.removeItem('userData');
          } catch (e) {
            console.warn('Failed to clear user data cache:', e);
          }
        }
      })
      .catch(error => {
        console.error('Error checking auth status:', error);
        updateNavbarForLoggedOutUser();
      });
  } catch (error) {
    console.error('Exception in checkAuthStatus:', error);
    updateNavbarForLoggedOutUser();
  }
}

/**
 * Debugging function to manually check auth status
 * Can be called from browser console
 */
function debugAuthStatus() {
  console.log('Manual auth status check initiated');
  
  if (!window.api || !window.api.auth) {
    console.error('API client not available for debug check');
    return;
  }
  
  api.auth.checkLoginStatus()
    .then(response => {
      console.log('DEBUG - Auth check response:', response);
      
      // Check login status using the same logic as checkAuthStatus
      if (response.success) {
        // 使用与checkAuthStatus相同的逻辑
        let isLoggedIn = false;
        
        if (response.isLoggedIn === true) {
          isLoggedIn = true;
        } else if (response.message === 'User is logged in') {
          isLoggedIn = true;
        } else if (response.data && response.data.isLoggedIn === true) {
          isLoggedIn = true;
        } else if (response.user && Object.keys(response.user).length > 0 && response.user.id) {
          isLoggedIn = true;
        }
        
        const userData = response.user || (isLoggedIn ? response.data : {}) || {};
        
        if (isLoggedIn) {
          console.log('DEBUG - User is logged in:', userData);
          alert('Logged in as: ' + (userData.username || userData.name || userData.email || 'Unknown user'));
        } else {
          console.log('DEBUG - User is not logged in');
          alert('Not logged in: ' + (response.message || 'Unknown reason'));
        }
      } else {
        console.log('DEBUG - Auth check failed:', response.message);
        alert('Auth check failed: ' + (response.message || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('DEBUG - Error checking auth status:', error);
      alert('Auth check error: ' + error.message);
    });
}

/**
 * Update navbar for logged in user
 * @param {Object} user - User data object
 */
function updateNavbarForLoggedInUser(user) {
  console.log('Updating navbar for logged in user:', user);
  
  // Get navbar elements again to ensure we have the latest references
  const userDropdown = document.getElementById('userDropdown');
  const dropdownMenu = document.querySelector('.dropdown-menu[aria-labelledby="userDropdown"]');
  
  if (!userDropdown || !dropdownMenu) {
    console.error('Navbar elements not found during update');
    // Try with a more general selector as fallback
    const fallbackMenu = document.querySelector('.dropdown-menu');
    if (fallbackMenu) {
      console.log('Found dropdown menu with fallback selector');
      updateDropdownMenu(userDropdown, fallbackMenu, user);
    }
    return;
  }
  
  updateDropdownMenu(userDropdown, dropdownMenu, user);
}

/**
 * Update the dropdown menu elements
 */
function updateDropdownMenu(userDropdown, dropdownMenu, user) {
  // Update dropdown button - show only icon without username
  if (userDropdown) {
    userDropdown.innerHTML = `
      <i class="material-icons-outlined">account_circle</i>
    `;
  }
  
  if (dropdownMenu) {
    // Get base URL from config
    const baseUrl = window.config && window.config.baseUrl ? window.config.baseUrl : '';
    
    // Get user ID
    const userId = user.id || '';
    
    // Construct URLs using config baseUrl and user ID
    const profileUrl = `${baseUrl}/public/views/auth/profile.html?id=${userId}`;
    const ordersUrl = `${baseUrl}/public/views/user/orders.html`;
    const adminUrl = `${baseUrl}/public/views/admin/dashboard.html`;
    
    // Update dropdown menu items
    dropdownMenu.innerHTML = `
      <li><a class="dropdown-item" href="${profileUrl}">Profile</a></li>
      <li><a class="dropdown-item" href="${ordersUrl}">My Orders</a></li>
      <li><hr class="dropdown-divider"></li>
      <li><a class="dropdown-item" href="#" id="logout-link">Logout</a></li>
    `;
    
    // Show admin link if user is admin
    if (user.isAdmin || user.is_admin) {
      const adminLink = document.createElement('li');
      adminLink.innerHTML = `<a class="dropdown-item" href="${adminUrl}">Admin Dashboard</a>`;
      dropdownMenu.insertBefore(adminLink, dropdownMenu.firstChild);
    }
    
    // Add logout handler
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
      logoutLink.addEventListener('click', handleLogout);
    }
    
    console.log('Dropdown menu updated for logged in user');
  } else {
    console.error('Failed to update dropdown menu - element not found');
  }
}

/**
 * Update navbar for logged out user
 */
function updateNavbarForLoggedOutUser() {
  const userDropdown = document.getElementById('userDropdown');
  const dropdownMenu = document.querySelector('.dropdown-menu[aria-labelledby="userDropdown"]');
  
  // 添加调试日志
  console.log('Updating navbar for logged out user');
  console.log('userDropdown element:', userDropdown);
  console.log('dropdownMenu element:', dropdownMenu);
  
  if (userDropdown && dropdownMenu) {
    // Get base URL from config
    const baseUrl = window.config && window.config.baseUrl ? window.config.baseUrl : '';
    
    // Construct URLs using config baseUrl
    const loginUrl = `${baseUrl}/public/views/auth/login.html`;
    const registerUrl = `${baseUrl}/public/views/auth/register.html`;
    
    // Reset dropdown button
    userDropdown.innerHTML = `<i class="material-icons-outlined">account_circle</i>`;
    
    // Update dropdown menu items
    dropdownMenu.innerHTML = `
      <li><a class="dropdown-item" href="${loginUrl}" id="login-link">Login</a></li>
      <li><a class="dropdown-item" href="${registerUrl}" id="register-link">Register</a></li>
    `;
    
    console.log('Dropdown menu updated successfully for logged out user');
  } else {
    // 如果找不到特定的下拉菜单，尝试使用更通用的选择器
    console.warn('Failed to find menu elements with specific selectors, trying fallback selectors');
    
    // 尝试其他选择器
    const fallbackDropdown = document.querySelector('.dropdown-toggle');
    const fallbackMenu = document.querySelector('.dropdown-menu');
    
    if (fallbackDropdown && fallbackMenu) {
      // Get base URL
      const baseUrl = window.config && window.config.baseUrl ? window.config.baseUrl : '';
      
      // Construct URLs
      const loginUrl = `${baseUrl}/public/views/auth/login.html`;
      const registerUrl = `${baseUrl}/public/views/auth/register.html`;
      
      // Update dropdown button
      fallbackDropdown.innerHTML = `<i class="material-icons-outlined">account_circle</i>`;
      
      // Update menu
      fallbackMenu.innerHTML = `
        <li><a class="dropdown-item" href="${loginUrl}" id="login-link">Login</a></li>
        <li><a class="dropdown-item" href="${registerUrl}" id="register-link">Register</a></li>
      `;
      
      console.log('Dropdown menu updated with fallback selectors');
    } else {
      console.error('Failed to update dropdown menu - no suitable elements found');
    }
  }
}

/**
 * Handle logout action
 * @param {Event} event - Click event
 */
function handleLogout(event) {
  event.preventDefault();
  
  if (!window.api || !window.api.auth) {
    console.error('API client not available');
    return;
  }
  
  
  api.auth.logout()
    .then(response => {
      if (response.success) {
        // 清除所有本地用户状态
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
        
        // 清除所有认证相关的cookie
        document.cookie = 'PHPSESSID=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'username=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'remember_me=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        // Clear cart after logout
        clearCart();
        
        // 立即更新导航栏到登出状态
        updateNavbarForLoggedOutUser();
        
        console.log('Successfully logged out');
        
        // Show success message
        if (window.showToast) {
          showToast('Logged out successfully', 'success');
        }
        
        // 确保UI已更新后再重定向
        setTimeout(() => {
          // 如果不在首页，则重定向到首页
          if (!window.location.href.includes('/index.html')) {
            console.log('Redirecting to homepage...');
            window.location.href = `${config.baseUrl}/public/index.html`;
          } else {
            // 如果已经在首页，刷新页面以确保所有状态都重置
            console.log('Refreshing page to reset state...');
            window.location.reload();
          }
        }, 1500);
      } else {
        console.error('Logout failed:', response.message);
        if (window.showToast) {
          showToast('Logout failed: ' + response.message, 'error');
        }
      }
    })
    .catch(error => {
      console.error('Logout error:', error);
      // 即使API调用失败，也尝试清除本地状态
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      document.cookie = 'PHPSESSID=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      updateNavbarForLoggedOutUser();
      
      if (window.showToast) {
        showToast('Error during logout, but local session cleared: ' + error.message, 'warning');
      }
      
      // 尝试重定向到首页
      setTimeout(() => {
        window.location.href = `${config.baseUrl}/public/index.html`;
      }, 1500);
    });
}

/**
 * Clear the shopping cart
 */
function clearCart() {
  // If cart.js functions are available
  if (window.clearCart) {
    window.clearCart();
  }
  
  // Clear local storage cart backup
  localStorage.removeItem('cart');
  
  // Update cart count display
  const cartCount = document.getElementById('cart-count');
  if (cartCount) {
    cartCount.textContent = '0';
    cartCount.style.display = 'none';
  }
  
  // If there's a cart API, clear server-side cart as well
  if (window.api && window.api.cart && window.api.cart.clearCart) {
    window.api.cart.clearCart()
      .then(response => {
        console.log('Server cart cleared:', response);
      })
      .catch(error => {
        console.error('Failed to clear server cart:', error);
      });
  }
}

// Expose functions to global scope
window.initializeNavbar = initializeNavbar;
window.checkAuthStatus = checkAuthStatus;
window.debugAuthStatus = debugAuthStatus; 