// Product related functionality

// Product variables
let productsList = [];
let categoriesList = [];
let filteredProducts = [];

// Make filteredProducts globally available
window.filteredProducts = filteredProducts;

// Filter criteria
let filterCriteria = {
  categories: [],
  priceMin: null,
  priceMax: null,
  rating: 0,
  onSale: false
};

// Load products
function loadProducts() {
  // Use API to get products
  fetch(`${config.apiUrl}/products.php`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    },
    // Ensure no credentials are included, so public data can be accessed even when not logged in
    credentials: 'omit'
  })
    .then(response => {
      // Check if response is successful
      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        // Try to parse JSON response to get more detailed error information
        return response.json()
          .then(errorData => {
            throw new Error(`API returned ${response.status}: ${JSON.stringify(errorData)}`);
          })
          .catch(e => {
            // If unable to parse JSON, use status code as error
            throw new Error(`API returned ${response.status}`);
          });
      }
      return response.json();
    })
    .then(res => {
      if(res.success) {
        // Process products data
        productsList = res.data.map(product => {
          product.price = typeof product.price === 'number' ? product.price : parseFloat(product.price || 0);
          product.rating = typeof product.rating === 'number' ? product.rating : parseFloat(product.rating || 0);
          product.reviewCount = typeof product.reviewCount === 'number' ? product.reviewCount : parseInt(product.reviewCount || 0);
          
          // Make sure categoryId is available - might be category_id in API response
          if (product.category_id !== undefined && product.categoryId === undefined) {
            product.categoryId = parseInt(product.category_id);
          } else if (product.categoryId !== undefined) {
            product.categoryId = parseInt(product.categoryId);
          }
          
          // Set discount price for featured products (20% off = 80% of original price)
          // Convert is_featured to boolean and check if it's true
          const isFeatured = product.is_featured === 1 || product.is_featured === '1' || product.is_featured === true;
          
          if (isFeatured) {
            product.onSale = true;
            // Calculate sale price (20% discount = 80% of original price)
            const originalPrice = parseFloat(product.price);
            product.salePrice = parseFloat((originalPrice * 0.8).toFixed(2));
          } else {
            product.onSale = false;
          }
          
          return product;
        });
        
        // Initialize event listener for products per page display
        initializeProductsPerPage();
        
        applyFiltersAndSort();
      } else {
        console.error('Error loading products:', res.message);
        handleProductLoadError('API responded with error: ' + res.message);
      }
    })
    .catch(error => {
      console.error('Error loading products:', error);
      handleProductLoadError(error.message || 'Failed to load products');
    });
}

// Helper function to handle product loading errors
function handleProductLoadError(errorMessage) {
  console.error('Product loading error:', errorMessage);
  
  // Check if products container exists
  const productsContainer = document.getElementById('products-container');
  if (productsContainer) {
    // Show user-friendly error message
    productsContainer.innerHTML = `
      <div class="alert alert-warning text-center w-100 my-4">
        <h4><i class="bi bi-exclamation-triangle me-2"></i>Unable to Load Products</h4>
        <p>We're having trouble connecting to our product database.</p>
        <p><small>Please try refreshing the page or check back later.</small></p>
        <button class="btn btn-outline-primary mt-2" onclick="location.reload()">
          Refresh Page
        </button>
      </div>
    `;
  }
  
  // Check if filters container exists and hide it if found
  const filtersContainer = document.getElementById('product-filters');
  if (filtersContainer) {
    filtersContainer.style.display = 'none';
  }
}

// Load categories
function loadCategories() {
  // Use API to get categories
  fetch(`${config.apiUrl}/categories.php`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    },
    // Ensure no credentials are included, so public data can be accessed even when not logged in
    credentials: 'omit'
  })
    .then(response => {
      // Check if response is successful
      if (!response.ok) {
        console.error(`Categories API error: ${response.status}`);
        throw new Error(`API returned ${response.status}`);
      }
      return response.json();
    })
    .then(res => {
      if(!res.success) {
        console.error('Error loading categories:', res.message);
        return;
      }
      
      categoriesList = res.data;
      
      // Generate category filter options
      const categoryFiltersContainer = document.getElementById('category-filters');
      const allCategoriesCheckbox = document.getElementById('category-all');
      
      // Listen for all categories checkbox
      allCategoriesCheckbox.addEventListener('change', function() {
        if (this.checked) {
          // Uncheck all other categories
          document.querySelectorAll('.category-checkbox').forEach(checkbox => {
            checkbox.checked = false;
          });
          filterCriteria.categories = [];
          
          // Remove category parameter from URL
          const url = new URL(window.location);
          url.searchParams.delete('category');
          window.history.replaceState({}, '', url);
          
          // Reset active category ID
          activeCategoryId = null;
        }
        applyFiltersAndSort();
      });
      
      // Add individual category checkboxes
      categoriesList.forEach(category => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'form-check';
        
        const checkbox = document.createElement('input');
        checkbox.className = 'form-check-input category-checkbox';
        checkbox.type = 'checkbox';
        checkbox.id = `category-${category.id}`;
        checkbox.value = category.id;
        
        // If this category is specified in URL parameters, check it
        if (activeCategoryId === category.id) {
          checkbox.checked = true;
          allCategoriesCheckbox.checked = false;
          filterCriteria.categories.push(category.id);
          
          // Update title
          document.getElementById('product-list-title').textContent = category.name;
        }
        
        checkbox.addEventListener('change', function() {
          const categoryId = parseInt(this.value);
          
          if (this.checked) {
            // Uncheck "All Categories"
            document.getElementById('category-all').checked = false;
            
            // Add to filtered categories
            filterCriteria.categories.push(categoryId);
            
            // Update URL with this category
            const url = new URL(window.location);
            url.searchParams.set('category', categoryId);
            window.history.replaceState({}, '', url);
            
            // Update active category ID
            activeCategoryId = categoryId;
            
            // Update title if only one category is selected
            if (document.querySelectorAll('.category-checkbox:checked').length === 1) {
              const categoryName = categoriesList.find(c => c.id === categoryId)?.name || 'Products';
              document.getElementById('product-list-title').textContent = categoryName;
            }
          } else {
            // Remove from filtered categories
            const index = filterCriteria.categories.indexOf(categoryId);
            if (index !== -1) {
              filterCriteria.categories.splice(index, 1);
            }
            
            // If no categories are checked, automatically check "All Categories"
            const checkedCategories = document.querySelectorAll('.category-checkbox:checked');
            if (checkedCategories.length === 0) {
              document.getElementById('category-all').checked = true;
              
              // Remove category parameter from URL
              const url = new URL(window.location);
              url.searchParams.delete('category');
              window.history.replaceState({}, '', url);
              
              // Reset active category ID
              activeCategoryId = null;
              
              // Reset title
              document.getElementById('product-list-title').textContent = 'All Products';
            } else if (checkedCategories.length === 1) {
              // If only one category remains selected, update URL and title
              const remainingCategoryId = parseInt(checkedCategories[0].value);
              const url = new URL(window.location);
              url.searchParams.set('category', remainingCategoryId);
              window.history.replaceState({}, '', url);
              
              // Update active category ID
              activeCategoryId = remainingCategoryId;
              
              // Update title
              const categoryName = categoriesList.find(c => c.id === remainingCategoryId)?.name || 'Products';
              document.getElementById('product-list-title').textContent = categoryName;
            }
          }
          
          applyFiltersAndSort();
        });
        
        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = `category-${category.id}`;
        label.textContent = category.name;
        
        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);
        categoryFiltersContainer.appendChild(checkboxDiv);
      });
    })
    .catch(error => {
      console.error('Error loading categories:', error);
    });
}

// Initialize page from URL parameters
function initializeUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('category')) {
    const categoryParam = urlParams.get('category');
    activeCategoryId = parseInt(categoryParam);
    
    // Add to filter criteria
    if (!isNaN(activeCategoryId)) {
      filterCriteria.categories = [activeCategoryId];
    }
  }
}

// Apply filters and sorting
function applyFiltersAndSort() {
  // Get price range
  const minPrice = document.getElementById('price-min').value;
  const maxPrice = document.getElementById('price-max').value;
  filterCriteria.priceMin = minPrice ? parseFloat(minPrice) : null;
  filterCriteria.priceMax = maxPrice ? parseFloat(maxPrice) : null;
  
  // Get rating filter
  const ratingValue = document.querySelector('input[name="rating-filter"]:checked').value;
  filterCriteria.rating = parseFloat(ratingValue);
  
  // Get sale filter
  filterCriteria.onSale = document.getElementById('filter-sale').checked;
  
  // Apply filters
  filteredProducts = productsList.filter(product => {
    // Category filter
    if (filterCriteria.categories.length > 0) {
      // Get categoryId from product, ensuring it's a number
      const productCategoryId = parseInt(product.categoryId || product.category_id || 0);
      
      if (!filterCriteria.categories.includes(productCategoryId)) {
        return false;
      }
    }
    
    // Price filter
    if (filterCriteria.priceMin !== null) {
      const productPrice = product.onSale && product.salePrice ? parseFloat(product.salePrice) : parseFloat(product.price);
      if (productPrice < filterCriteria.priceMin) {
        return false;
      }
    }
    
    if (filterCriteria.priceMax !== null) {
      const productPrice = product.onSale && product.salePrice ? parseFloat(product.salePrice) : parseFloat(product.price);
      if (productPrice > filterCriteria.priceMax) {
        return false;
      }
    }
    
    // Rating filter
    if (filterCriteria.rating > 0 && product.rating < filterCriteria.rating) {
      return false;
    }
    
    // Sale filter
    if (filterCriteria.onSale && !product.onSale) {
      return false;
    }
    
    return true;
  });
  
  // Make sure window.filteredProducts is updated
  window.filteredProducts = filteredProducts;
  
  // Apply sorting
  const sortOption = document.getElementById('sort-select').value;
  
  switch (sortOption) {
    case 'price-low':
      filteredProducts.sort((a, b) => {
        const priceA = a.onSale && a.salePrice ? a.salePrice : a.price;
        const priceB = b.onSale && b.salePrice ? b.salePrice : b.price;
        return priceA - priceB;
      });
      break;
    case 'price-high':
      filteredProducts.sort((a, b) => {
        const priceA = a.onSale && a.salePrice ? a.salePrice : a.price;
        const priceB = b.onSale && b.salePrice ? b.salePrice : b.price;
        return priceB - priceA;
      });
      break;
    case 'rating':
      filteredProducts.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      // Assume newer products have higher IDs
      filteredProducts.sort((a, b) => b.id - a.id);
      break;
    case 'featured':
    default:
      // Keep original order or sort by some feature
      break;
  }
  
  // Update product count
  document.getElementById('product-count').textContent = `Showing ${filteredProducts.length} products`;
  
  // Display paginated products
  displayPaginatedProducts();
  
  // Update pagination controls
  updatePagination();
}

// Reset filters
function resetFilters() {
  // Reset categories
  document.getElementById('category-all').checked = true;
  document.querySelectorAll('.category-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });
  filterCriteria.categories = [];
  
  // Reset price
  document.getElementById('price-min').value = '';
  document.getElementById('price-max').value = '';
  filterCriteria.priceMin = null;
  filterCriteria.priceMax = null;
  
  // Reset rating
  document.getElementById('rating-all').checked = true;
  filterCriteria.rating = 0;
  
  // Reset sale
  document.getElementById('filter-sale').checked = false;
  filterCriteria.onSale = false;
  
  // Reset sorting
  document.getElementById('sort-select').value = 'featured';
  
  // Reset pagination
  currentPage = 1;
  
  // Update product display
  applyFiltersAndSort();
}

// Initialize filter accordion
function initializeFilterAccordion() {
  const filterTitles = document.querySelectorAll('.filter-group-title');
  
  filterTitles.forEach(title => {
    // Get content element
    const content = title.nextElementSibling;
    if (!content) return;
    
    // Add CSS styles to make content initially visible
    content.style.display = 'block';
    
    // Initial arrow direction is up (indicating content is expanded)
    const arrow = title.querySelector('i');
    if (arrow) {
      arrow.classList.remove('bi-chevron-down');
      arrow.classList.add('bi-chevron-up');
    }
    
    // Add click event
    title.addEventListener('click', function() {
      const content = this.nextElementSibling;
      if (!content) return;
      
      // Toggle content visibility
      const isVisible = content.style.display !== 'none';
      
      // Toggle display state
      if (isVisible) {
        content.style.display = 'none';
      } else {
        content.style.display = 'block';
      }
      
      // Toggle arrow direction - down means collapsed, up means expanded
      const arrow = this.querySelector('i');
      if (arrow) {
        if (isVisible) {
          // If visible, will be hidden after click, arrow should point down
          arrow.classList.remove('bi-chevron-up');
          arrow.classList.add('bi-chevron-down');
        } else {
          // If hidden, will be visible after click, arrow should point up
          arrow.classList.remove('bi-chevron-down');
          arrow.classList.add('bi-chevron-up');
        }
      }
    });
  });
  
  // Ensure filter event listeners are attached
  // Price filter
  const priceApplyButton = document.getElementById('apply-price-filter');
  if (priceApplyButton) {
    priceApplyButton.addEventListener('click', applyFiltersAndSort);
  }
  
  // Rating filter
  const ratingInputs = document.querySelectorAll('input[name="rating-filter"]');
  ratingInputs.forEach(input => {
    input.addEventListener('change', applyFiltersAndSort);
  });
  
  // Sale filter
  const saleCheckbox = document.getElementById('filter-sale');
  if (saleCheckbox) {
    saleCheckbox.addEventListener('change', applyFiltersAndSort);
  }
  
  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', applyFiltersAndSort);
  }
  
  // Reset filter button
  const resetButton = document.getElementById('reset-filters');
  if (resetButton) {
    resetButton.addEventListener('click', resetFilters);
  }
}

// Initialize products per page selector
function initializeProductsPerPage() {
  const productsPerPageSelect = document.getElementById('products-per-page');
  if (productsPerPageSelect) {
    // Set initial value
    const selectedValue = parseInt(productsPerPageSelect.value);
    if (window.setProductsPerPage && !isNaN(selectedValue)) {
      window.setProductsPerPage(selectedValue);
    }
    
    // Add event listener
    productsPerPageSelect.addEventListener('change', function() {
      const value = parseInt(this.value);
      if (window.setProductsPerPage && !isNaN(value)) {
        window.setProductsPerPage(value);
      }
    });
  }
} 