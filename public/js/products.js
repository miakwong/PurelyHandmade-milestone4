// Product related functionality

// Product variables
let productsList = [];
let categoriesList = [];
let filteredProducts = [];

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
  products.getProducts()
    .then(data => {
      productsList = data;
      applyFiltersAndSort();
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
  categories.getCategories()
    .then(data => {
      categoriesList = data;
      
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
          
          // Update breadcrumb and title
          document.getElementById('breadcrumb-category').textContent = category.name;
          document.getElementById('product-list-title').textContent = category.name;
        }
        
        checkbox.addEventListener('change', function() {
          if (this.checked) {
            // Uncheck "All Categories"
            document.getElementById('category-all').checked = false;
            
            // Add to filtered categories
            filterCriteria.categories.push(parseInt(this.value));
          } else {
            // Remove from filtered categories
            const index = filterCriteria.categories.indexOf(parseInt(this.value));
            if (index !== -1) {
              filterCriteria.categories.splice(index, 1);
            }
            
            // If no categories are checked, automatically check "All Categories"
            if (document.querySelectorAll('.category-checkbox:checked').length === 0) {
              document.getElementById('category-all').checked = true;
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
    if (filterCriteria.categories.length > 0 && !filterCriteria.categories.includes(product.categoryId)) {
      return false;
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
    title.addEventListener('click', function() {
      const content = this.nextElementSibling;
      
      // Toggle arrow direction
      const arrow = this.querySelector('i');
      arrow.classList.toggle('bi-chevron-down');
      arrow.classList.toggle('bi-chevron-up');
      
      // Toggle content display
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
} 