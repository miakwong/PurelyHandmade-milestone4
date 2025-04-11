// UI interaction functions


// Initialize URL parameters
function initializeUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  if (categoryParam) {
    activeCategoryId = parseInt(categoryParam);
  }
  return activeCategoryId;
}

// Display Toast notifications
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toast-container');
  
  if (!toastContainer) return;
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.backgroundColor = '#fff';
  toast.style.color = '#333';
  toast.style.borderRadius = '4px';
  toast.style.padding = '10px 15px';
  toast.style.marginBottom = '10px';
  toast.style.minWidth = '250px';
  toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.animation = 'slideIn 0.3s, fadeOut 0.5s 2.5s forwards';
  toast.style.position = 'relative';
  
  if (type === 'success') {
    toast.style.borderLeft = '4px solid #75b798';
  } else if (type === 'error') {
    toast.style.borderLeft = '4px solid #e29da5';
  }
  
  // Add content
  toast.innerHTML = `
    <div style="flex: 1; padding-right: 10px;">${message}</div>
    <div style="cursor: pointer; font-size: 16px; color: #999;">&times;</div>
  `;
  
  // Append to container
  toastContainer.appendChild(toast);
  
  // Add close button event
  const closeBtn = toast.querySelector('div:last-child');
  closeBtn.addEventListener('click', function() {
    toast.remove();
  });
  
  // Automatically remove after 3 seconds
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Initialize event listeners
function initializeEventListeners() {
  // Sort selector
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', applyFiltersAndSort);
  }
  
  // Products per page selector
  const productsPerPage = document.getElementById('products-per-page');
  if (productsPerPage) {
    productsPerPage.addEventListener('change', function() {
      setProductsPerPage(parseInt(this.value));
      applyFiltersAndSort();
    });
  }
  
  // Price filter
  const applyPriceFilter = document.getElementById('apply-price-filter');
  if (applyPriceFilter) {
    applyPriceFilter.addEventListener('click', applyFiltersAndSort);
  }
  
  // Reset filters
  const resetFiltersBtn = document.getElementById('reset-filters');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', resetFilters);
  }
  
  // Rating filter
  const ratingInputs = document.querySelectorAll('input[name="rating-filter"]');
  if (ratingInputs.length > 0) {
    ratingInputs.forEach(input => {
      input.addEventListener('change', applyFiltersAndSort);
    });
  }
  
  // Deals filter
  const filterSale = document.getElementById('filter-sale');
  if (filterSale) {
    filterSale.addEventListener('change', applyFiltersAndSort);
  }
}

// Show loading state
function showLoadingOverlay() {
  // 禁止页面滚动和交互
  document.body.style.overflow = 'hidden';
  document.body.style.pointerEvents = 'none';
  
  // 检查是否已存在overlay
  if (document.getElementById('loading-overlay')) {
    return;
  }
  
  // 创建overlay元素
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(255, 255, 255)'; // 白色蒙版
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  
  // 添加猫咪动画 CSS
  if (!document.getElementById('cat-animation-style')) {
    const style = document.createElement('style');
    style.id = 'cat-animation-style';
    style.textContent = `
      @keyframes cat-walk {
        0% { transform: translateX(150px); }
        100% { transform: translateX(-150px); }
      }
      
      @keyframes cat-tail {
        0%, 100% { transform: rotate(-10deg); }
        50% { transform: rotate(10deg); }
      }
      
      @keyframes cat-paw {
        0%, 50%, 100% { transform: translateY(0); }
        25% { transform: translateY(-5px); }
        75% { transform: translateY(-5px); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // 创建一个线条小猫走路的SVG
  const catContainer = document.createElement('div');
  catContainer.style.position = 'relative';
  catContainer.style.width = '300px';
  catContainer.style.height = '100px';
  catContainer.style.animation = 'cat-walk 3s linear infinite';
  
  // 简单的SVG线条小猫
  catContainer.innerHTML = `
    <svg width="100" height="60" viewBox="0 0 100 60" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
      <!-- 猫咪身体 -->
      <path d="M30,30 Q45,10 60,30" stroke="#333" fill="none" stroke-width="2" />
      
      <!-- 猫咪头部 -->
      <circle cx="65" cy="25" r="10" stroke="#333" fill="none" stroke-width="2" />
      
      <!-- 猫咪耳朵 -->
      <path d="M62,17 L59,10 L65,15" stroke="#333" fill="none" stroke-width="2" />
      <path d="M72,17 L75,10 L69,15" stroke="#333" fill="none" stroke-width="2" />
      
      <!-- 猫咪眼睛 -->
      <circle cx="62" cy="23" r="1" fill="#333" />
      <circle cx="68" cy="23" r="1" fill="#333" />
      
      <!-- 猫咪胡须 -->
      <line x1="60" y1="27" x2="50" y2="25" stroke="#333" stroke-width="1" />
      <line x1="60" y1="28" x2="50" y2="28" stroke="#333" stroke-width="1" />
      <line x1="60" y1="29" x2="50" y2="31" stroke="#333" stroke-width="1" />
      
      <line x1="70" y1="27" x2="80" y2="25" stroke="#333" stroke-width="1" />
      <line x1="70" y1="28" x2="80" y2="28" stroke="#333" stroke-width="1" />
      <line x1="70" y1="29" x2="80" y2="31" stroke="#333" stroke-width="1" />
      
      <!-- 猫咪尾巴 -->
      <path d="M30,30 Q15,20 10,10" stroke="#333" fill="none" stroke-width="2" style="animation: cat-tail 1s ease-in-out infinite;" />
      
      <!-- 猫咪前脚 -->
      <line x1="40" y1="30" x2="40" y2="40" stroke="#333" stroke-width="2" class="front-paw-left" style="animation: cat-paw 0.5s ease-in-out infinite alternate;" />
      <line x1="50" y1="30" x2="50" y2="40" stroke="#333" stroke-width="2" class="front-paw-right" style="animation: cat-paw 0.5s ease-in-out infinite alternate-reverse;" />
      
      <!-- 猫咪后脚 -->
      <line x1="25" y1="30" x2="25" y2="40" stroke="#333" stroke-width="2" class="back-paw-left" style="animation: cat-paw 0.5s ease-in-out infinite alternate-reverse;" />
      <line x1="35" y1="30" x2="35" y2="40" stroke="#333" stroke-width="2" class="back-paw-right" style="animation: cat-paw 0.5s ease-in-out infinite alternate;" />
    </svg>
  `;
  
  // 添加Loading文字
  const loadingText = document.createElement('div');
  loadingText.style.position = 'absolute';
  loadingText.style.bottom = '10px';
  loadingText.style.left = '50%';
  loadingText.style.transform = 'translateX(-50%)';
  loadingText.style.fontFamily = 'Arial, sans-serif';
  loadingText.style.fontSize = '14px';
  loadingText.style.color = '#666';
  loadingText.textContent = 'Loading...';
  
  catContainer.appendChild(loadingText);
  overlay.appendChild(catContainer);
  document.body.appendChild(overlay);
}

// Hide loading state
function hideLoadingOverlay() {
  // 恢复页面滚动和交互
  document.body.style.overflow = '';
  document.body.style.pointerEvents = '';
  
  // 移除loading蒙版
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    // 添加淡出效果
    overlay.style.transition = 'opacity 0.5s';
    overlay.style.opacity = '0';
    
    // 移除元素
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 500);
  }
}

// Load navbar and footer
function loadLayoutComponents() {
  // Correctly handle paths for production vs development
  let navbarUrl, footerUrl, cartSidebarUrl;
  
  // In production (on cosc360 server)
  if (config.production) {
    navbarUrl = `${config.baseUrl}/public/layout/navbar.html`;
    footerUrl = `${config.baseUrl}/public/layout/footer.html`;
    cartSidebarUrl = `${config.baseUrl}/public/layout/cart-sidebar.html`;
  } else {
    // In development
    navbarUrl = 'layout/navbar.html';
    footerUrl = 'layout/footer.html';
    cartSidebarUrl = 'layout/cart-sidebar.html';
  }
  
  console.log('Loading navbar from:', navbarUrl);
  console.log('Loading footer from:', footerUrl);
  console.log('Loading cart sidebar from:', cartSidebarUrl);
  
  // Show loading state
  showLoadingOverlay();
  
  // Track loading progress
  let componentsLoaded = 0;
  const totalComponents = 3; // Navbar, footer, cart sidebar
  
  function checkAllLoaded() {
    componentsLoaded++;
    if (componentsLoaded >= totalComponents) {
      // Give a small delay to ensure DOM updates
      setTimeout(() => {
        hideLoadingOverlay();
      }, 300);
    }
  }
    
  // Load navbar
  fetch(navbarUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load navbar (${response.status} ${response.statusText}) from ${navbarUrl}`);
      }
      return response.text();
    })
    .then(html => {
      document.getElementById('navbar-placeholder').innerHTML = html;
      console.log('Navbar loaded successfully');
      checkAllLoaded();
    })
    .catch(error => {
      console.error('Error loading navbar:', error);
      // Try alternative path as fallback
      const fallbackUrl = config.production ? 
        `${config.baseUrl}/layout/navbar.html` : 
        `../layout/navbar.html`;
      
      console.log('Trying fallback navbar path:', fallbackUrl);
      
      fetch(fallbackUrl)
        .then(response => response.text())
        .then(html => {
          document.getElementById('navbar-placeholder').innerHTML = html;
          console.log('Navbar loaded from fallback path');
          checkAllLoaded();
        })
        .catch(err => {
          console.error('Fallback navbar load failed:', err);
          document.getElementById('navbar-placeholder').innerHTML =
            '<div class="alert alert-danger">Failed to load navigation bar. Please refresh the page or check console for details.</div>';
          checkAllLoaded();
        });
    });

  // Load cart sidebar
  const cartSidebarPlaceholder = document.getElementById('cart-sidebar-placeholder');
  if (cartSidebarPlaceholder) {
    fetch(cartSidebarUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load cart sidebar (${response.status})`);
        }
        return response.text();
      })
      .then(html => {
        cartSidebarPlaceholder.innerHTML = html;
        console.log('Cart sidebar loaded successfully');
        checkAllLoaded();
      })
      .catch(error => {
        console.error('Error loading cart sidebar:', error);
        // Try alternative path as fallback
        const fallbackUrl = config.production ? 
          `${config.baseUrl}/layout/cart-sidebar.html` : 
          `../layout/cart-sidebar.html`;
        
        console.log('Trying fallback cart sidebar path:', fallbackUrl);
        
        fetch(fallbackUrl)
          .then(response => response.text())
          .then(html => {
            cartSidebarPlaceholder.innerHTML = html;
            console.log('Cart sidebar loaded from fallback path');
            checkAllLoaded();
          })
          .catch(err => {
            console.error('Fallback cart sidebar load failed:', err);
            // Do not show error for cart sidebar as it's not critical for page display
            checkAllLoaded();
          });
      });
  } else {
    // No cart sidebar placeholder, mark as loaded
    checkAllLoaded();
  }

  // Load footer
  fetch(footerUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load footer (${response.status})`);
      }
      return response.text();
    })
    .then(html => {
      document.getElementById('footer-placeholder').innerHTML = html;
      console.log('Footer loaded successfully');
      checkAllLoaded();
    })
    .catch(error => {
      console.error('Error loading footer:', error);
      // Try alternative path as fallback
      const fallbackUrl = config.production ? 
        `${config.baseUrl}/layout/footer.html` : 
        `../layout/footer.html`;
      
      console.log('Trying fallback footer path:', fallbackUrl);
      
      fetch(fallbackUrl)
        .then(response => response.text())
        .then(html => {
          document.getElementById('footer-placeholder').innerHTML = html;
          console.log('Footer loaded from fallback path');
          checkAllLoaded();
        })
        .catch(err => {
          console.error('Fallback footer load failed:', err);
          document.getElementById('footer-placeholder').innerHTML =
            '<div class="alert alert-danger">Failed to load footer. Please refresh the page or check console for details.</div>';
          checkAllLoaded();
        });
    });
}

// Page initialization
function initializePage() {
  // Show loading overlay immediately
  showLoadingOverlay();
  
  // Load navbar and footer
  loadLayoutComponents();
  
  // Initialize URL parameters
  initializeUrlParams();
  
  // Load categories and products if functions exist
  if (typeof loadCategories === 'function') {
    loadCategories();
  }
  
  if (typeof loadProducts === 'function') {
    loadProducts();
  }
  
  // Initialize filter accordion functionality if function exists
  if (typeof initializeFilterAccordion === 'function') {
    initializeFilterAccordion();
  }
  
  // Initialize event listeners
  initializeEventListeners();
  
  // Add event listener for when the page is fully loaded
  window.addEventListener('load', function() {
    // Hide loading overlay when everything is loaded
    setTimeout(hideLoadingOverlay, 500);
  });
}

// Attach UI functions to the global window object
window.showToast = showToast;
window.initializePage = initializePage;
window.loadLayoutComponents = loadLayoutComponents;
window.showLoadingOverlay = showLoadingOverlay;
window.hideLoadingOverlay = hideLoadingOverlay;