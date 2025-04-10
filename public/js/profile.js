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
  fetch(`${config.apiUrl}/products.php`)
    .then(response => response.json())
    .then(res => {
      if(res.success) {
        // Process products data
        productsList = res.data.map(product => {
          // Make sure categoryId is available - might be category_id in API response
          if (product.category_id !== undefined && product.categoryId === undefined) {
            product.categoryId = parseInt(product.category_id);
          }
          
          // Set discount price for featured products (20% off = 80% of original price)
          // Convert is_featured to boolean and check if it's true
          const isFeatured = product.is_featured === 1 || product.is_featured === '1' || product.is_featured === true;
          
          if (isFeatured) {
            product.onSale = true;
            // Calculate sale price (20% discount = 80% of original price)
            const originalPrice = parseFloat(product.price);
            product.salePrice = parseFloat((originalPrice * 0.8).toFixed(2));
            console.log(`Product on sale: ${product.name}, Original: $${originalPrice}, Sale: $${product.salePrice}`);
          } else {
            product.onSale = false;
          }
          
          return product;
        });
        
        console.log('Products loaded and processed:', productsList.length);
        
        applyFiltersAndSort();
      } else {
        console.error('Error loading products:', res.message);
        document.getElementById('products-container').innerHTML = 
          '<p class="text-center w-100">An error occurred while loading products. Please try again later.</p>';
      }
    })
    .catch(error => {
      console.error('Error loading products:', error);
      document.getElementById('products-container').innerHTML = 
        '<p class="text-center w-100">An error occurred while loading products. Please try again later.</p>';
    });
}

// Load categories
function loadCategories() {
  // Use API to get categories
  fetch(`${config.apiUrl}/categories.php`)
    .then(response => response.json())
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
    console.log('Category ID from URL:', activeCategoryId);
    
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
  
  console.log('Filter criteria:', JSON.stringify(filterCriteria));
  
  // Apply filters
  filteredProducts = productsList.filter(product => {
    // Category filter
    if (filterCriteria.categories.length > 0) {
      // Get categoryId from product, ensuring it's a number
      const productCategoryId = parseInt(product.categoryId || product.category_id || 0);
      
      // Debug logging for category filtering
      if (productCategoryId === filterCriteria.categories[0]) {
        console.log('Product matches category:', product.name, productCategoryId);
      }
      
      if (!filterCriteria.categories.includes(productCategoryId)) {
        return false;
      }
    }
    
    // Price filter
    if (filterCriteria.priceMin !== null) {
      const price = product.onSale && product.salePrice ? product.salePrice : product.price;
      if (price < filterCriteria.priceMin) {
        return false;
      }
    }
    
    if (filterCriteria.priceMax !== null) {
      const price = product.onSale && product.salePrice ? product.salePrice : product.price;
      if (price > filterCriteria.priceMax) {
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
  
  console.log('Filtered products count:', filteredProducts.length);
  
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
  
  // Update breadcrumb and title
  if (activeCategoryId) {
    activeCategoryId = null;
    document.getElementById('breadcrumb-category').textContent = 'All Products';
    document.getElementById('product-list-title').textContent = 'All Products';
    
    // Remove URL parameter
    const url = new URL(window.location);
    url.searchParams.delete('category');
    window.history.replaceState({}, '', url);
  }
}

// Initialize filter accordion
function initializeFilterAccordion() {
  const filterTitles = document.querySelectorAll('.filter-group-title');
  
  filterTitles.forEach(title => {
    // Initialize all content sections to be visible by default
    const content = title.nextElementSibling;
    if (content) {
      content.style.maxHeight = content.scrollHeight + 'px';
    }
    
    // Update arrow initially
    const arrow = title.querySelector('i');
    if (arrow) {
      arrow.classList.remove('bi-chevron-down');
      arrow.classList.add('bi-chevron-up');
    }
    
    // Add click event
    title.addEventListener('click', function() {
      const content = this.nextElementSibling;
      if (!content) return;
      
      // Toggle arrow direction
      const arrow = this.querySelector('i');
      if (arrow) {
        arrow.classList.toggle('bi-chevron-down');
        arrow.classList.toggle('bi-chevron-up');
      }
      
      // Toggle content display
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
  
  // Make sure event listeners for filter controls are attached
  const priceApplyButton = document.getElementById('apply-price-filter');
  if (priceApplyButton) {
    priceApplyButton.addEventListener('click', applyFiltersAndSort);
  }
  
  const ratingInputs = document.querySelectorAll('input[name="rating-filter"]');
  ratingInputs.forEach(input => {
    input.addEventListener('change', applyFiltersAndSort);
  });
  
  const saleCheckbox = document.getElementById('filter-sale');
  if (saleCheckbox) {
    saleCheckbox.addEventListener('change', applyFiltersAndSort);
  }
  
  const resetButton = document.getElementById('reset-filters');
  if (resetButton) {
    resetButton.addEventListener('click', resetFilters);
  }
} 