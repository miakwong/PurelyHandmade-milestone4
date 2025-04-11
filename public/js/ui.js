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
        })
        .catch(err => {
          console.error('Fallback navbar load failed:', err);
          document.getElementById('navbar-placeholder').innerHTML =
            '<div class="alert alert-danger">Failed to load navigation bar. Please refresh the page or check console for details.</div>';
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
          })
          .catch(err => {
            console.error('Fallback cart sidebar load failed:', err);
            // Do not show error for cart sidebar as it's not critical for page display
          });
      });
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
        })
        .catch(err => {
          console.error('Fallback footer load failed:', err);
          document.getElementById('footer-placeholder').innerHTML =
            '<div class="alert alert-danger">Failed to load footer. Please refresh the page or check console for details.</div>';
        });
    });
}

// Page initialization
function initializePage() {
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
}

// Attach UI functions to the global window object
window.showToast = showToast;
window.initializePage = initializePage;
window.loadLayoutComponents = loadLayoutComponents;