// Product Management Script
let productsList = [];
let categoriesList = [];
let filteredProducts = [];
let productCurrentPage = 1;
let productItemsPerPage = 10;
let totalProducts = 0;
let activeCategory = '';
let searchQuery = '';
let sortOption = 'newest';
let productImagesArray = [];
let editProductImagesArray = [];

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in and is admin
  checkAdminAccess();
  
  // Load layout components
  if (typeof loadLayoutComponents === 'function') {
    loadLayoutComponents();
  }
  
  // Load categories first for dropdowns
  loadCategories().then(() => {
    // Then load products
    loadProducts();
  });
  
  // Add event listeners
  document.getElementById('search-button').addEventListener('click', performSearch);
  document.getElementById('product-search').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
  
  // Category filter
  document.getElementById('category-filter').addEventListener('change', function() {
    activeCategory = this.value;
    productCurrentPage = 1; // Reset to first page
    loadProducts();
  });
  
  // Sort options
  document.getElementById('sort-by').addEventListener('change', function() {
    sortOption = this.value;
    loadProducts();
  });
  
  // Product image preview for add
  document.getElementById('add-images').addEventListener('change', handleAddProductImages);
  
  // Product image preview for edit
  document.getElementById('edit-images').addEventListener('change', handleEditProductImages);
  
  // Save new product button
  document.getElementById('save-new-product').addEventListener('click', saveNewProduct);
  
  // Save product changes button
  document.getElementById('save-product-changes').addEventListener('click', saveProductChanges);
  
  // Delete product button
  document.getElementById('confirm-delete-product').addEventListener('click', deleteProduct);
});

// Check admin access
function checkAdminAccess() {
  api.auth.checkLoginStatus()
    .then(res => {
      if (!res.success || !res.data.isLoggedIn || !res.data.user.isAdmin) {
        // Redirect to login if not logged in or not admin
        window.location.href = "../../index.html";
      }
    })
    .catch(error => {
      console.error('Error checking admin access:', error);
      window.location.href = "../../index.html";
    });
}

// Load categories
function loadCategories() {
  return api.categories.getCategories()
    .then(res => {
      if (res.success && res.data) {
        categoriesList = res.data;
        
        // Populate category filter dropdown
        const categoryFilter = document.getElementById('category-filter');
        const addCategorySelect = document.getElementById('add-category');
        const editCategorySelect = document.getElementById('edit-category');
        
        // Clear existing options (except first one)
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        addCategorySelect.innerHTML = '<option value="">Select Category</option>';
        editCategorySelect.innerHTML = '<option value="">Select Category</option>';
        
        // Add categories
        categoriesList.forEach(category => {
          // For filter dropdown
          const filterOption = document.createElement('option');
          filterOption.value = category.id;
          filterOption.textContent = category.name;
          categoryFilter.appendChild(filterOption);
          
          // For add modal
          const addOption = document.createElement('option');
          addOption.value = category.id;
          addOption.textContent = category.name;
          addCategorySelect.appendChild(addOption);
          
          // For edit modal
          const editOption = document.createElement('option');
          editOption.value = category.id;
          editOption.textContent = category.name;
          editCategorySelect.appendChild(editOption);
        });
      } else {
        console.error('Failed to load categories:', res.message);
      }
    })
    .catch(error => {
      console.error('Error loading categories:', error);
    });
}

// Load products
function loadProducts() {
  // Show loading indicator
  const productsTable = document.getElementById('products-table');
  productsTable.innerHTML = '<tr><td colspan="8" class="text-center">Loading products...</td></tr>';
  
  // Prepare filter params
  const params = {};
  
  // Add category filter if selected
  if (activeCategory) {
    params.category = activeCategory;
  }
  
  // Add search query if any
  if (searchQuery) {
    params.search = searchQuery;
  }
  
  api.products.getProducts(params)
    .then(res => {
      if (res.success && res.data) {
        // Store products
        productsList = res.data;
        totalProducts = productsList.length;
        
        // Apply sorting
        sortProducts();
        
        // Apply pagination
        const start = (productCurrentPage - 1) * productItemsPerPage;
        const end = start + productItemsPerPage;
        const paginatedProducts = productsList.slice(start, end);
        
        // Display products
        displayProducts(paginatedProducts);
        
        // Update pagination
        updatePagination();
      } else {
        console.error('Failed to load products:', res.message);
        productsTable.innerHTML = `<tr><td colspan="8" class="text-center text-danger">
          Failed to load products: ${res.message || 'Unknown error'}
        </td></tr>`;
      }
    })
    .catch(error => {
      console.error('Error loading products:', error);
      productsTable.innerHTML = `<tr><td colspan="8" class="text-center text-danger">
        Error loading products: ${error.message || 'Unknown error'}
      </td></tr>`;
    });
}

// Sort products based on selected option
function sortProducts() {
  switch (sortOption) {
    case 'newest':
      productsList.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      break;
    case 'oldest':
      productsList.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateA - dateB;
      });
      break;
    case 'name_asc':
      productsList.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name_desc':
      productsList.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'price_asc':
      productsList.sort((a, b) => {
        const priceA = a.onSale && a.salePrice ? parseFloat(a.salePrice) : parseFloat(a.price);
        const priceB = b.onSale && b.salePrice ? parseFloat(b.salePrice) : parseFloat(b.price);
        return priceA - priceB;
      });
      break;
    case 'price_desc':
      productsList.sort((a, b) => {
        const priceA = a.onSale && a.salePrice ? parseFloat(a.salePrice) : parseFloat(a.price);
        const priceB = b.onSale && b.salePrice ? parseFloat(b.salePrice) : parseFloat(b.price);
        return priceB - priceA;
      });
      break;
  }
}

// Display products in table
function displayProducts(products) {
  const productsTable = document.getElementById('products-table');
  
  // Clear existing rows
  productsTable.innerHTML = '';
  
  if (products.length === 0) {
    productsTable.innerHTML = '<tr><td colspan="8" class="text-center">No products found</td></tr>';
    return;
  }
  
  // Add product rows
  products.forEach(product => {
    const row = document.createElement('tr');
    
    // Find category name
    const category = categoriesList.find(c => c.id == product.categoryId || c.id == product.category_id);
    const categoryName = category ? category.name : 'Unknown';
    
    // Get main image URL
    const mainImage = product.images && product.images.length > 0 ? product.images[0] : '';
    
    // Calculate actual price (considering sale)
    const displayPrice = product.onSale && product.salePrice ? 
      `<span class="text-danger">$${parseFloat(product.salePrice).toFixed(2)}</span> <small class="text-decoration-line-through">$${parseFloat(product.price).toFixed(2)}</small>` :
      `$${parseFloat(product.price).toFixed(2)}`;
    
    // Create row content
    row.innerHTML = `
      <td>${product.id}</td>
      <td>
        ${mainImage ? `<img src="${mainImage}" alt="${product.name}" class="product-thumbnail">` : 'No image'}
      </td>
      <td>${product.name}</td>
      <td>${categoryName}</td>
      <td>${displayPrice}</td>
      <td>${product.stock_quantity || product.stock || 0}</td>
      <td>
        <span class="badge ${product.is_featured ? 'bg-success' : 'bg-secondary'}">
          ${product.is_featured ? 'Yes' : 'No'}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editProduct(${product.id})">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteProduct(${product.id}, '${product.name}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    
    productsTable.appendChild(row);
  });
}

// Update pagination
function updatePagination() {
  const totalPages = Math.ceil(totalProducts / productItemsPerPage);
  const paginationElement = document.getElementById('pagination');
  
  // Clear existing pagination
  paginationElement.innerHTML = '';
  
  // Previous button
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${productCurrentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#" ${productCurrentPage !== 1 ? 'onclick="goToPage(' + (productCurrentPage - 1) + '); return false;"' : ''}>Previous</a>`;
  paginationElement.appendChild(prevLi);
  
  // Page numbers
  const startPage = Math.max(1, productCurrentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageLi = document.createElement('li');
    pageLi.className = `page-item ${i === productCurrentPage ? 'active' : ''}`;
    pageLi.innerHTML = `<a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>`;
    paginationElement.appendChild(pageLi);
  }
  
  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${productCurrentPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#" ${productCurrentPage !== totalPages ? 'onclick="goToPage(' + (productCurrentPage + 1) + '); return false;"' : ''}>Next</a>`;
  paginationElement.appendChild(nextLi);
}

// Go to specified page
function goToPage(pageNumber) {
  productCurrentPage = pageNumber;
  loadProducts();
}

// Perform search
function performSearch() {
  searchQuery = document.getElementById('product-search').value.trim();
  productCurrentPage = 1; // Reset to first page
  loadProducts();
}

// Handle product images selection for add
function handleAddProductImages(event) {
  const imageFiles = event.target.files;
  const previewContainer = document.getElementById('add-image-previews');
  
  // Clear previews
  previewContainer.innerHTML = '';
  productImagesArray = [];
  
  if (imageFiles.length === 0) return;
  
  // Add previews for each image
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    
    // Store file for upload
    productImagesArray.push(file);
    
    // Create preview
    const preview = document.createElement('div');
    preview.className = 'position-relative';
    
    const img = document.createElement('img');
    img.className = 'thumbnail-preview';
    img.file = file;
    preview.appendChild(img);
    
    // Primary badge for first image
    if (i === 0) {
      const primaryBadge = document.createElement('span');
      primaryBadge.className = 'badge bg-primary position-absolute top-0 end-0 m-1';
      primaryBadge.textContent = 'Primary';
      preview.appendChild(primaryBadge);
    }
    
    previewContainer.appendChild(preview);
    
    // Read and show preview
    const reader = new FileReader();
    reader.onload = (function(aImg) {
      return function(e) {
        aImg.src = e.target.result;
      };
    })(img);
    reader.readAsDataURL(file);
  }
}

// Handle product images selection for edit
function handleEditProductImages(event) {
  const imageFiles = event.target.files;
  const previewContainer = document.getElementById('edit-image-previews');
  
  // Clear previews
  previewContainer.innerHTML = '';
  editProductImagesArray = [];
  
  if (imageFiles.length === 0) return;
  
  // Add previews for each image
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    
    // Store file for upload
    editProductImagesArray.push(file);
    
    // Create preview
    const preview = document.createElement('div');
    preview.className = 'position-relative';
    
    const img = document.createElement('img');
    img.className = 'thumbnail-preview';
    img.file = file;
    preview.appendChild(img);
    
    previewContainer.appendChild(preview);
    
    // Read and show preview
    const reader = new FileReader();
    reader.onload = (function(aImg) {
      return function(e) {
        aImg.src = e.target.result;
      };
    })(img);
    reader.readAsDataURL(file);
  }
}

// Save new product
function saveNewProduct() {
  // Get form values
  const productData = {
    name: document.getElementById('add-name').value,
    description: document.getElementById('add-description').value,
    price: parseFloat(document.getElementById('add-price').value),
    categoryId: document.getElementById('add-category').value,
    stock_quantity: parseInt(document.getElementById('add-stock').value),
    is_featured: document.getElementById('add-featured').checked ? 1 : 0,
    in_stock: document.getElementById('add-in-stock').checked ? 1 : 0
  };
  
  // Generate slug from name
  productData.slug = productData.name
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
  
  // Check required fields
  if (!productData.name || !productData.description || !productData.price || !productData.categoryId) {
    alert('Please fill in all required fields');
    return;
  }
  
  // Create product
  api.products.createProduct(productData, productImagesArray)
    .then(res => {
      if (res.success) {
        // Hide modal
        const addProductModal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
        addProductModal.hide();
        
        // Reset form
        document.getElementById('add-product-form').reset();
        document.getElementById('add-image-previews').innerHTML = '';
        productImagesArray = [];
        
        // Reload products
        loadProducts();
        
        // Show success alert
        alert('Product created successfully');
      } else {
        console.error('Failed to create product:', res.message);
        alert('Failed to create product: ' + (res.message || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error creating product:', error);
      alert('Error creating product: ' + (error.message || 'Unknown error'));
    });
}

// Edit product
function editProduct(productId) {
  // Find product
  const product = productsList.find(p => p.id === productId);
  
  if (!product) {
    console.error('Product not found:', productId);
    return;
  }
  
  // Populate form fields
  document.getElementById('edit-product-id').value = product.id;
  document.getElementById('edit-name').value = product.name;
  document.getElementById('edit-description').value = product.description;
  document.getElementById('edit-price').value = parseFloat(product.price).toFixed(2);
  document.getElementById('edit-stock').value = product.stock_quantity || product.stock || 0;
  document.getElementById('edit-category').value = product.categoryId || product.category_id || '';
  document.getElementById('edit-featured').checked = product.is_featured === 1 || product.is_featured === true;
  document.getElementById('edit-in-stock').checked = product.in_stock === 1 || product.in_stock === true;
  
  // Display current images
  const currentImagesContainer = document.getElementById('current-images');
  currentImagesContainer.innerHTML = '';
  
  if (product.images && product.images.length > 0) {
    product.images.forEach((imageUrl, index) => {
      const imageDiv = document.createElement('div');
      imageDiv.className = 'position-relative';
      
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = `Product image ${index + 1}`;
      img.className = 'thumbnail-preview';
      imageDiv.appendChild(img);
      
      // Primary indicator for first image
      if (index === 0) {
        const primaryBadge = document.createElement('span');
        primaryBadge.className = 'badge bg-primary position-absolute top-0 end-0 m-1';
        primaryBadge.textContent = 'Primary';
        imageDiv.appendChild(primaryBadge);
      }
      
      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sm btn-danger position-absolute bottom-0 end-0 m-1';
      deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
      deleteBtn.onclick = function() {
        if (confirm('Remove this image?')) {
          imageDiv.remove();
        }
      };
      imageDiv.appendChild(deleteBtn);
      
      currentImagesContainer.appendChild(imageDiv);
    });
  } else {
    currentImagesContainer.innerHTML = '<p class="text-muted">No images available</p>';
  }
  
  // Clear new image previews
  document.getElementById('edit-image-previews').innerHTML = '';
  editProductImagesArray = [];
  
  // Show modal
  const editProductModal = new bootstrap.Modal(document.getElementById('editProductModal'));
  editProductModal.show();
}

// Save product changes
function saveProductChanges() {
  const productId = document.getElementById('edit-product-id').value;
  
  // Get form values
  const productData = {
    name: document.getElementById('edit-name').value,
    description: document.getElementById('edit-description').value,
    price: parseFloat(document.getElementById('edit-price').value),
    categoryId: document.getElementById('edit-category').value,
    stock_quantity: parseInt(document.getElementById('edit-stock').value),
    is_featured: document.getElementById('edit-featured').checked ? 1 : 0,
    in_stock: document.getElementById('edit-in-stock').checked ? 1 : 0
  };
  
  // Generate slug from name
  productData.slug = productData.name
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
  
  // Check required fields
  if (!productData.name || !productData.description || !productData.price || !productData.categoryId) {
    alert('Please fill in all required fields');
    return;
  }
  
  // Update product
  api.products.updateProduct(productId, productData, editProductImagesArray.length > 0 ? editProductImagesArray : null)
    .then(res => {
      if (res.success) {
        // Hide modal
        const editProductModal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
        editProductModal.hide();
        
        // Reload products
        loadProducts();
        
        // Show success alert
        alert('Product updated successfully');
      } else {
        console.error('Failed to update product:', res.message);
        alert('Failed to update product: ' + (res.message || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error updating product:', error);
      alert('Error updating product: ' + (error.message || 'Unknown error'));
    });
}

// Confirm delete product
function confirmDeleteProduct(productId, productName) {
  // Set delete product data
  document.getElementById('delete-product-name').textContent = productName;
  
  // Set product ID to delete
  window.productIdToDelete = productId;
  
  // Show confirm modal
  const deleteProductModal = new bootstrap.Modal(document.getElementById('deleteProductModal'));
  deleteProductModal.show();
}

// Delete product
function deleteProduct() {
  const productId = window.productIdToDelete;
  
  if (!productId) {
    console.error('No product ID to delete');
    return;
  }
  
  // Delete product
  api.products.deleteProduct(productId)
    .then(res => {
      if (res.success) {
        // Hide modal
        const deleteProductModal = bootstrap.Modal.getInstance(document.getElementById('deleteProductModal'));
        deleteProductModal.hide();
        
        // Reload products
        loadProducts();
        
        // Show success alert
        alert('Product deleted successfully');
      } else {
        console.error('Failed to delete product:', res.message);
        alert('Failed to delete product: ' + (res.message || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error deleting product:', error);
      alert('Error deleting product: ' + (error.message || 'Unknown error'));
    });
  
  // Clear product ID
  window.productIdToDelete = null;
} 