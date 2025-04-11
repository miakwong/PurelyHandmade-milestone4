// Review Management Script
let reviewsList = [];
let productsList = [];
let reviewCurrentPage = 1;
let reviewsPerPage = 10;
let totalReviews = 0;
let activeProductFilter = '';
let activeRatingFilter = '';
let searchQuery = '';
let sortOption = 'newest';

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in and is admin
  checkAdminAccess();

  // Load layout components
  if (typeof loadLayoutComponents === 'function') {
    loadLayoutComponents();
  }

  // Load products for filter dropdown
  loadProducts().then(() => {
    // Then load reviews
    loadReviews();
  });

  // Add event listeners
  document.getElementById('search-button').addEventListener('click', performSearch);
  document.getElementById('review-search').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });

  // Product filter
  document.getElementById('product-filter').addEventListener('change', function() {
    activeProductFilter = this.value;
    reviewCurrentPage = 1; // Reset to first page
    loadReviews();
  });

  // Rating filter
  document.getElementById('rating-filter').addEventListener('change', function() {
    activeRatingFilter = this.value;
    reviewCurrentPage = 1; // Reset to first page
    loadReviews();
  });

  // Sort options
  document.getElementById('sort-by').addEventListener('change', function() {
    sortOption = this.value;
    loadReviews();
  });

  // Save review changes button
  document.getElementById('save-review-changes').addEventListener('click', saveReviewChanges);

  // Delete review button from detail view
  document.getElementById('delete-review-button').addEventListener('click', function() {
    // Get review ID from current review
    const reviewId = window.currentReviewId;
    if (!reviewId) return;

    confirmDeleteReview(reviewId);
  });

  // Delete review button from confirm modal
  document.getElementById('confirm-delete-review').addEventListener('click', deleteReview);
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

// Load products for filter dropdown
function loadProducts() {
  return api.products.getProducts()
    .then(res => {
      if (res.success && res.data) {
        productsList = res.data;

        // Populate product filter dropdown
        const productFilter = document.getElementById('product-filter');

        // Clear existing options (except first one)
        productFilter.innerHTML = '<option value="">All Products</option>';

        // Add products
        productsList.forEach(product => {
          const option = document.createElement('option');
          option.value = product.id;
          option.textContent = product.name;
          productFilter.appendChild(option);
        });
      } else {
        console.error('Failed to load products:', res.message);
      }
    })
    .catch(error => {
      console.error('Error loading products:', error);
    });
}

// Load reviews
function loadReviews() {
  // Show loading indicator
  const reviewsTable = document.getElementById('reviews-table');
  reviewsTable.innerHTML = '<tr><td colspan="7" class="text-center">Loading reviews...</td></tr>';

  // We need to fetch all reviews and then filter on client side
  // Assuming we have a reviews API endpoint similar to products

  // You might need to adjust this if your API is different
  fetchAllReviews()
    .then(reviews => {
      // Store all reviews
      reviewsList = reviews;

      // Apply filters
      const filteredReviews = filterReviews(reviews);

      // Apply sorting
      sortReviews(filteredReviews);

      // Store total count for pagination
      totalReviews = filteredReviews.length;

      // Apply pagination
      const start = (reviewCurrentPage - 1) * reviewsPerPage;
      const end = start + reviewsPerPage;
      const paginatedReviews = filteredReviews.slice(start, end);

      // Display reviews
      displayReviews(paginatedReviews);

      // Update pagination
      updatePagination();
    })
    .catch(error => {
      console.error('Error loading reviews:', error);
      reviewsTable.innerHTML = `<tr><td colspan="7" class="text-center text-danger">
        Error loading reviews: ${error.message || 'Unknown error'}
      </td></tr>`;
    });
}

// Fetch all reviews
function fetchAllReviews() {
  return api.reviews.getAllReviews()
    .then(res => {
      if (!res.success) {
        throw new Error(res.message || 'Failed to load reviews');
      }

      // If the API returns reviews directly as an array
      if (Array.isArray(res.data)) {
        return res.data;
      }

      // If the API returns reviews inside a 'reviews' property
      if (res.data && Array.isArray(res.data.reviews)) {
        return res.data.reviews;
      }

      // If no reviews are found
      console.error('Unexpected API response format:', res);
      return [];
    });
}

// Filter reviews based on active filters
function filterReviews(reviews) {
  return reviews.filter(review => {
    // Product filter
    if (activeProductFilter && review.product_id != activeProductFilter) {
      return false;
    }

    // Rating filter
    if (activeRatingFilter && review.rating != activeRatingFilter) {
      return false;
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();

      // Search in review text
      if (review.review_text.toLowerCase().includes(query)) {
        return true;
      }

      // Search in username
      if (review.username.toLowerCase().includes(query)) {
        return true;
      }

      // If we reach here, no match was found
      return false;
    }

    // If we reach here, all filters passed
    return true;
  });
}

// Sort reviews based on selected option
function sortReviews(reviews) {
  switch (sortOption) {
    case 'newest':
      reviews.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      break;
    case 'oldest':
      reviews.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateA - dateB;
      });
      break;
    case 'rating_high':
      reviews.sort((a, b) => b.rating - a.rating);
      break;
    case 'rating_low':
      reviews.sort((a, b) => a.rating - b.rating);
      break;
  }
}

// Display reviews in table
function displayReviews(reviews) {
  const reviewsTable = document.getElementById('reviews-table');

  // Clear existing rows
  reviewsTable.innerHTML = '';

  if (reviews.length === 0) {
    reviewsTable.innerHTML = '<tr><td colspan="7" class="text-center">No reviews found</td></tr>';
    return;
  }

  // Add review rows
  reviews.forEach(review => {
    const row = document.createElement('tr');

    // Find product
    const product = productsList.find(p => p.id == review.product_id);
    const productName = product ? product.name : (review.product_name || 'Unknown Product');

    // Safely get product image URL - ensure it's a valid URL and string type
    let productImage = '';
    if (product && product.images && product.images.length > 0 && typeof product.images[0] === 'string') {
      // Validate URL format
      try {
        new URL(product.images[0]);
        productImage = product.images[0];
      } catch (e) {
        console.warn('Invalid product image URL:', product.images[0]);
      }
    } else if (review.product_image && typeof review.product_image === 'string') {
      // If product image URL was returned directly through API
      try {
        new URL(review.product_image);
        productImage = review.product_image;
      } catch (e) {
        console.warn('Invalid product image URL from API:', review.product_image);
      }
    }

    // Safely get user avatar URL
    let avatarHtml = '<i class="bi bi-person-circle me-2 fs-5"></i>';
    if (review.avatar && typeof review.avatar === 'string') {
      try {
        // Try to parse avatar URL as valid URL
        new URL(review.avatar);
        avatarHtml = `<img src="${review.avatar}" alt="${review.username}" class="user-thumbnail me-2" onerror="this.onerror=null; this.src='../../images/user-placeholder.png'; this.style.display='none'; this.parentNode.innerHTML='<i class=\\'bi bi-person-circle me-2 fs-5\\'></i>';">`;
      } catch (e) {
        console.warn('Invalid avatar URL:', review.avatar);
      }
    }

    // Format date
    const reviewDate = new Date(review.created_at);
    const formattedDate = reviewDate.toLocaleDateString() + ' ' + reviewDate.toLocaleTimeString();

    // Format rating as stars
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

    // Create row content
    row.innerHTML = `
      <td>${review.id}</td>
      <td>
        <div class="d-flex align-items-center">
          ${productImage ? `<img src="${productImage}" alt="${productName}" class="product-thumbnail me-2" onerror="this.onerror=null; this.style.display='none';">` : ''}
          <span>${productName}</span>
        </div>
      </td>
      <td>
        <div class="d-flex align-items-center">
          ${avatarHtml}
          <span>${review.username}</span>
        </div>
      </td>
      <td><span class="star-rating">${stars}</span></td>
      <td class="review-text">${truncateText(review.review_text, 100)}</td>
      <td>${formattedDate}</td>
      <td>
        <button class="btn btn-sm btn-outline-info me-1" onclick="viewReview(${review.id})">
          <i class="bi bi-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editReview(${review.id})">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteReview(${review.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;

    reviewsTable.appendChild(row);
  });
}

// Truncate text with ellipsis
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Update pagination
function updatePagination() {
  const totalPages = Math.ceil(totalReviews / reviewsPerPage);
  const paginationElement = document.getElementById('pagination');

  // Clear existing pagination
  paginationElement.innerHTML = '';

  // Previous button
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${reviewCurrentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#" ${reviewCurrentPage !== 1 ? 'onclick="goToPage(' + (reviewCurrentPage - 1) + '); return false;"' : ''}>Previous</a>`;
  paginationElement.appendChild(prevLi);

  // Page numbers
  const startPage = Math.max(1, reviewCurrentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);

  for (let i = startPage; i <= endPage; i++) {
    const pageLi = document.createElement('li');
    pageLi.className = `page-item ${i === reviewCurrentPage ? 'active' : ''}`;
    pageLi.innerHTML = `<a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>`;
    paginationElement.appendChild(pageLi);
  }

  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${reviewCurrentPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#" ${reviewCurrentPage !== totalPages ? 'onclick="goToPage(' + (reviewCurrentPage + 1) + '); return false;"' : ''}>Next</a>`;
  paginationElement.appendChild(nextLi);
}

// Go to specified page
function goToPage(pageNumber) {
  reviewCurrentPage = pageNumber;
  loadReviews();
}

// Perform search
function performSearch() {
  searchQuery = document.getElementById('review-search').value.trim();
  reviewCurrentPage = 1; // Reset to first page
  loadReviews();
}

// View review details
function viewReview(reviewId) {
  // Find review
  const review = reviewsList.find(r => r.id == reviewId);

  if (!review) {
    console.error('Review not found:', reviewId);
    return;
  }

  // Find product
  const product = productsList.find(p => p.id == review.product_id);

  // Store current review ID for delete button
  window.currentReviewId = review.id;

  // Populate modal
  document.getElementById('view-product-name').textContent = product ? product.name : (review.product_name || 'Unknown Product');
  document.getElementById('view-product-category').textContent = product && product.categoryId ?
    getCategoryName(product.categoryId) : '';

  // Set product image
  const productImage = document.getElementById('view-product-img');
  productImage.style.display = 'none'; // Hide by default, show only if valid image exists

  // get product image
  let imageUrl = '';
  if (product && product.images && product.images.length > 0 && typeof product.images[0] === 'string') {
    imageUrl = product.images[0];
  } else if (review.product_image && typeof review.product_image === 'string') {
    imageUrl = review.product_image;
  }

  if (imageUrl) {
    try {
      new URL(imageUrl);
      productImage.src = imageUrl;
      productImage.style.display = 'block';
      productImage.onerror = function() {
        this.style.display = 'none';
      };
    } catch (e) {
      console.warn('Invalid product image URL in view:', imageUrl);
    }
  }

  // Set user info
  document.getElementById('view-username').textContent = review.username;
  document.getElementById('view-review-date').textContent = new Date(review.created_at).toLocaleString();

  // Set user image
  const userImage = document.getElementById('view-user-img');
  userImage.style.display = 'none'; // Hide by default

  if (review.avatar && typeof review.avatar === 'string') {
    try {
      new URL(review.avatar);
      userImage.src = review.avatar;
      userImage.style.display = 'block';
      userImage.onerror = function() {
        this.style.display = 'none';
      };
    } catch (e) {
      console.warn('Invalid avatar URL in view:', review.avatar);
    }
  }

  // Set rating stars
  document.getElementById('view-rating').innerHTML = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

  // Set review text
  document.getElementById('view-review-text').innerHTML = review.review_text;

  // Show modal
  const viewReviewModal = new bootstrap.Modal(document.getElementById('viewReviewModal'));
  viewReviewModal.show();
}

// Helper to get category name
function getCategoryName(categoryId) {
  for (const product of productsList) {
    if (product.categoryId == categoryId || product.category_id == categoryId) {
      return categoriesList ?
        categoriesList.find(c => c.id == categoryId)?.name :
        'Category ' + categoryId;
    }
  }
  return '';
}

// Edit review
function editReview(reviewId) {
  // Find review
  const review = reviewsList.find(r => r.id == reviewId);

  if (!review) {
    console.error('Review not found:', reviewId);
    return;
  }

  // Find product
  const product = productsList.find(p => p.id == review.product_id);

  // Set review ID for save button
  document.getElementById('edit-review-id').value = review.id;

  // Populate modal
  document.getElementById('edit-product-name').textContent = product ? product.name : (review.product_name || 'Unknown Product');
  document.getElementById('edit-product-category').textContent = product && product.categoryId ?
    getCategoryName(product.categoryId) : '';

  // Set product image
  const productImage = document.getElementById('edit-product-img');
  productImage.style.display = 'none'; // Hide by default

  // Get product image, prioritize from products list, fallback to API-returned product_image
  let imageUrl = '';
  if (product && product.images && product.images.length > 0 && typeof product.images[0] === 'string') {
    imageUrl = product.images[0];
  } else if (review.product_image && typeof review.product_image === 'string') {
    imageUrl = review.product_image;
  }

  if (imageUrl) {
    try {
      new URL(imageUrl);
      productImage.src = imageUrl;
      productImage.style.display = 'block';
      productImage.onerror = function() {
        this.style.display = 'none';
      };
    } catch (e) {
      console.warn('Invalid product image URL in edit:', imageUrl);
    }
  }

  // Set user info
  document.getElementById('edit-username').textContent = review.username;

  // Set user image
  const userImage = document.getElementById('edit-user-img');
  userImage.style.display = 'none'; // Hide by default

  if (review.avatar && typeof review.avatar === 'string') {
    try {
      new URL(review.avatar);
      userImage.src = review.avatar;
      userImage.style.display = 'block';
      userImage.onerror = function() {
        this.style.display = 'none';
      };
    } catch (e) {
      console.warn('Invalid avatar URL in edit:', review.avatar);
    }
  }

  // Set rating value
  document.getElementById('edit-rating').value = review.rating;

  // Set review text
  document.getElementById('edit-review-text').value = review.review_text;

  // Show modal
  const editReviewModal = new bootstrap.Modal(document.getElementById('editReviewModal'));
  editReviewModal.show();
}

// Save review changes
function saveReviewChanges() {
  const reviewId = document.getElementById('edit-review-id').value;

  // Get form values
  const rating = document.getElementById('edit-rating').value;
  const reviewText = document.getElementById('edit-review-text').value;

  // Validate
  if (!rating || !reviewText) {
    alert('Please fill in all fields');
    return;
  }

  // Update review
  api.reviews.updateReview(reviewId, rating, reviewText)
    .then(res => {
      if (res.success) {
        // Hide modal
        const editReviewModal = bootstrap.Modal.getInstance(document.getElementById('editReviewModal'));
        editReviewModal.hide();

        // Reload reviews
        loadReviews();

        // Show success alert
        alert('Review updated successfully');
      } else {
        console.error('Failed to update review:', res.message);
        alert('Failed to update review: ' + (res.message || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error updating review:', error);
      alert('Error updating review: ' + (error.message || 'Unknown error'));
    });
}

// Confirm delete review
function confirmDeleteReview(reviewId) {
  // Set review ID to delete
  window.reviewIdToDelete = reviewId;

  // Hide any open modals
  try {
    const viewReviewModal = bootstrap.Modal.getInstance(document.getElementById('viewReviewModal'));
    if (viewReviewModal) {
      viewReviewModal.hide();
    }
  } catch (e) {
    console.error('Error hiding view modal:', e);
  }

  // Show confirm modal
  const deleteReviewModal = new bootstrap.Modal(document.getElementById('deleteReviewModal'));
  deleteReviewModal.show();
}

// Delete review
function deleteReview() {
  const reviewId = window.reviewIdToDelete;

  if (!reviewId) {
    console.error('No review ID to delete');
    return;
  }

  // Delete review
  api.reviews.deleteReview(reviewId)
    .then(res => {
      if (res.success) {
        // Hide modal
        const deleteReviewModal = bootstrap.Modal.getInstance(document.getElementById('deleteReviewModal'));
        deleteReviewModal.hide();

        // Reload reviews
        loadReviews();

        // Show success alert
        alert('Review deleted successfully');
      } else {
        console.error('Failed to delete review:', res.message);
        alert('Failed to delete review: ' + (res.message || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error deleting review:', error);
      alert('Error deleting review: ' + (error.message || 'Unknown error'));
    });

  // Clear review ID
  window.reviewIdToDelete = null;
}
