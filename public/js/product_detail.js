document.addEventListener("DOMContentLoaded", function () {
  // URL Parameters
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");
  
  // Check if we have a valid product ID
  if (!productId) {
    showErrorMessage("Product not found. Invalid product ID.");
    return;
  }

  // Load product details
  loadProductDetails(productId);
  
  // Load reviews for this product
  loadProductReviews(productId);
  
  // Setup review form handlers
  setupReviewForm(productId);
});

//Load product details from the API
function loadProductDetails(productId) {
  // Use API to fetch product details
  fetch(`${config.apiUrl}/products.php?id=${productId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data.success && data.data) {
        displayProductDetails(data.data);
      } else {
        throw new Error(data?.message || "Invalid product data");
      }
    })
    .catch(error => {
      console.error("Error loading product:", error);
      showErrorMessage("Failed to load product details. Please try again later.");
    });
}

//Display product details 
function displayProductDetails(product) {
  // Set product name and details
  document.getElementById("product-name").textContent = product.name;
  document.getElementById("product-description").textContent = product.description;
  
  // Set product price
  if (product.onSale && product.salePrice) {
    document.getElementById("product-price").textContent = `$${product.salePrice.toFixed(2)}`;
    document.getElementById("product-original-price").textContent = `$${product.price.toFixed(2)}`;
    document.getElementById("product-original-price").style.display = "inline-block";
    document.getElementById("sale-badge").style.display = "inline-block";
  } else {
    document.getElementById("product-price").textContent = `$${product.price.toFixed(2)}`;
    document.getElementById("product-original-price").style.display = "none";
    document.getElementById("sale-badge").style.display = "none";
  }
  
  // Set stock information
  document.getElementById("stock-info").textContent = 
    product.in_stock ? `${product.stock_quantity} in stock` : "Out of stock";
  
  // Setup product rating stars
  const ratingElem = document.getElementById("product-rating");
  ratingElem.innerHTML = generateStarsHtml(product.rating);
  
  // Set review count
  document.getElementById("review-count").textContent = 
    `(${product.reviewCount || 0} reviews)`;
  
  // Set main product image
  const mainImage = document.getElementById("main-product-image");
  if (product.images && product.images.length > 0) {
    mainImage.src = product.images[0];
    mainImage.alt = product.name;
    
    // Generate thumbnails
    generateThumbnails(product.images, product.name);
  }
  
  // Update breadcrumb navigation
  if (product.category_id) {
    console.log('Fetching category for ID:', product.category_id);
    // get category info from API
    fetch(`${config.apiUrl}/categories.php?id=${product.category_id}`)
      .then(response => {
        console.log('Category API response status:', response.status);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Category API response data:', data);
        if (data.success && data.data) {
          const category = data.data;
          console.log('Category data:', category);
          // update breadcrumb links
          const breadcrumbCategory = document.getElementById("breadcrumb-category-link");
          const breadcrumbItem = document.getElementById("breadcrumb-item");
          
          if (breadcrumbCategory && breadcrumbItem) {
            breadcrumbCategory.textContent = category.name;
            breadcrumbCategory.href = `${config.baseUrl}/public/index.html?category=${category.id}`;
            breadcrumbItem.textContent = product.name;
          }
          
          // update category link in product meta
          const productCategory = document.getElementById("product-category");
          if (productCategory) {
            productCategory.textContent = category.name;
            productCategory.href = `${config.baseUrl}/public/index.html?category=${category.id}`;
          }
        } else {
          console.error('Invalid category data structure:', data);
          throw new Error(data?.message || 'Invalid category data');
        }
      })
      .catch(error => {
        console.error("Error loading category:", error);
        // Set default category text if category loading fails
        const productCategory = document.getElementById("product-category");
        if (productCategory) {
          productCategory.textContent = "Uncategorized";
          productCategory.href = `${config.baseUrl}/public/index.html`;
        }
      });
  }
  
  // Set tab content for product details
  document.getElementById("details-content").innerHTML = `
    <h4>Product Details</h4>
    <p>${product.description}</p>
  `;
  
  // Add to cart button handler
  document.getElementById("add-to-cart-btn").addEventListener("click", function() {
    const quantity = parseInt(document.getElementById("product-quantity").value) || 1;
    
    // Add to cart via API
    api.cart.addToCart(product.id, quantity)
      .then(response => {
        if (response.success) {
          showToast("Success", `Added ${product.name} to your cart!`, "success");
          updateCartCount();
        } else {
          showToast("Error", response.message, "error");
        }
      })
      .catch(error => {
        console.error("Error adding to cart:", error);
        showToast("Error", "Failed to add item to cart. Please try again.", "error");
      });
  });
  
  // Quantity control buttons
  document.getElementById("decrease-quantity").addEventListener("click", function() {
    const quantityInput = document.getElementById("product-quantity");
    const currentQuantity = parseInt(quantityInput.value) || 1;
    if (currentQuantity > 1) {
      quantityInput.value = currentQuantity - 1;
    }
  });
  
  document.getElementById("increase-quantity").addEventListener("click", function() {
    const quantityInput = document.getElementById("product-quantity");
    const currentQuantity = parseInt(quantityInput.value) || 1;
    const maxStock = product.stock_quantity || 10;
    if (currentQuantity < maxStock) {
      quantityInput.value = currentQuantity + 1;
    }
  });
  
  // Setup image gallery
  setupImageGallery();
  
  // Setup quantity control
  const { updateMaxStock } = setupQuantityControl();
  updateMaxStock(product.stock_quantity);
  
  // button setup
  const { updateButtonStates } = setupButtonStates();
  updateButtonStates(product.stock_quantity);
  
  // Display product rating
  displayRating(product.rating);
}

//Generate HTML for thumbnail images
function generateThumbnails(images, productName) {
  const thumbnailContainer = document.getElementById("thumbnail-container");
  thumbnailContainer.innerHTML = ''; // Clear existing thumbnails
  
  images.forEach((imgSrc, index) => {
    const thumbDiv = document.createElement("div");
    thumbDiv.className = "thumbnail-item";
    
    const img = document.createElement("img");
    img.src = imgSrc;
    img.alt = `${productName} - Image ${index + 1}`;
    img.className = "thumbnail-img" + (index === 0 ? " active" : "");
    
    // Click handler to change main image
    img.addEventListener("click", function() {
      document.getElementById("main-product-image").src = imgSrc;
      // Update active thumbnail
      document.querySelectorAll(".thumbnail-img").forEach(thumb => {
        thumb.classList.remove("active");
      });
      img.classList.add("active");
    });
    
    thumbDiv.appendChild(img);
    thumbnailContainer.appendChild(thumbDiv);
  });
}

//Load reviews for a product
function loadProductReviews(productId) {
  console.log('Loading reviews for product ID:', productId);
  
  // Validate product ID
  if (!productId || isNaN(productId)) {
    console.error('Invalid product ID:', productId);
    showErrorMessage('Invalid product ID');
    return;
  }

  fetch(`${config.apiUrl}/reviews.php?action=get&product_id=${productId}`, {
    credentials: 'include'
  })
    .then(response => {
      console.log('Reviews API response status:', response.status);
      
      // Handle different HTTP status codes
      if (response.status === 404) {
        throw new Error('Product not found');
      } else if (response.status === 500) {
        return response.text().then(text => {
          console.error('Server error response:', text);
          try {
            const data = JSON.parse(text);
            throw new Error(data.message || 'Server error occurred');
          } catch (e) {
            if (text.includes('<!DOCTYPE HTML')) {
              throw new Error('Server configuration error. Please try again later.');
            }
            throw new Error('Server error occurred: ' + text);
          }
        });
      } else if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    })
    .then(data => {
      console.log('Reviews API response data:', data);
      
      if (data.success && data.data) {
        const reviews = data.data.reviews || [];
        const stats = data.data.stats || {
          avg_rating: 0,
          total_reviews: 0,
          rating_distribution: {
            '5_star': 0,
            '4_star': 0,
            '3_star': 0,
            '2_star': 0,
            '1_star': 0
          }
        };
        
        console.log('Processed reviews:', reviews);
        console.log('Processed stats:', stats);
        
        displayReviews(reviews, stats);
      } else {
        console.error('Invalid reviews data structure:', data);
        document.getElementById("reviews-container").innerHTML = `
          <div class="alert alert-warning">
            <p>${data.message || 'No reviews available'}</p>
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('Error loading reviews:', error);
      console.error('Error stack:', error.stack);
      document.getElementById("reviews-container").innerHTML = `
        <div class="alert alert-danger">
          <p>Failed to load reviews: ${error.message}</p>
          <p>Please try again later or contact support if the problem persists.</p>
        </div>
      `;
    });
}

//Display reviews and statistics
function displayReviews(reviews, stats) {
  console.log('Displaying reviews:', reviews);
  console.log('Displaying stats:', stats);
  
  // Update review statistics
  const avgRating = parseFloat(stats.avg_rating) || 0;
  const totalReviews = parseInt(stats.total_reviews) || 0;
  
  document.getElementById("average-rating").textContent = avgRating.toFixed(1);
  document.getElementById("average-stars").innerHTML = generateStarsHtml(avgRating);
  document.getElementById("total-reviews").textContent = `Based on ${totalReviews} reviews`;
  
  // Update rating breakdown
  updateRatingBreakdown(stats);
  
  // Display review list
  const reviewListContainer = document.getElementById("review-list");
  reviewListContainer.innerHTML = ''; // Clear existing reviews
  
  if (!reviews || reviews.length === 0) {
    reviewListContainer.innerHTML = `
      <div class="text-center my-4">
        <p>This product doesn't have any reviews yet. Be the first to review it!</p>
      </div>
    `;
    return;
  }
  
  // Sort reviews by date (newest first)
  reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  // Display each review
  reviews.forEach(review => {
    const reviewEl = document.createElement("div");
    reviewEl.className = "review-item mb-4 pb-4 border-bottom";
    
    const date = new Date(review.created_at);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
    
    reviewEl.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h6 class="mb-0">${review.user_name || review.username}</h6>
          <div class="text-warning">
            ${generateStarsHtml(review.rating)}
          </div>
        </div>
        <span class="text-muted small">${formattedDate}</span>
      </div>
      <p class="mb-0">${review.review_text}</p>
    `;
    
    reviewListContainer.appendChild(reviewEl);
  });
}

//Update the rating breakdown display
function updateRatingBreakdown(stats) {
  const totalReviews = parseInt(stats.total_reviews) || 0;
  if (totalReviews === 0) return;
  
  // Update star counts and progress bars
  const starMapping = {
    5: 'five',
    4: 'four',
    3: 'three',
    2: 'two',
    1: 'one'
  };
  
  for (let i = 5; i >= 1; i--) {
    const count = parseInt(stats.rating_distribution[`${i}_star`]) || 0;
    const percentage = Math.round((count / totalReviews) * 100);
    const starName = starMapping[i];
    
    // Update count display
    const countElement = document.getElementById(`${starName}-star-count`);
    if (countElement) {
      countElement.textContent = count;
    }
    
    // Update progress bar
    const progressBar = document.getElementById(`${starName}-star-bar`);
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute("aria-valuenow", percentage);
    }
  }
}

//Stars part
function getStarName(num) {
  const names = ["one", "two", "three", "four", "five"];
  return names[num - 1];
}

// Generate HTML for star ratings
function generateStarsHtml(rating) {
  let starsHtml = '';
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  // Add full stars
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<i class="bi bi-star-fill"></i> ';
  }
  
  // Add half star if needed
  if (halfStar) {
    starsHtml += '<i class="bi bi-star-half"></i> ';
  }
  
  // Add empty stars
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<i class="bi bi-star"></i> ';
  }
  
  return starsHtml;
}

// display rating stars
function displayRating(rating) {
  const ratingContainer = document.getElementById('product-rating');
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  let starsHtml = '';
  
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<i class="bi bi-star-fill"></i>';
  }
  
  if (hasHalfStar) {
    starsHtml += '<i class="bi bi-star-half"></i>';
  }
  
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<i class="bi bi-star"></i>';
  }
  
  ratingContainer.innerHTML = starsHtml;
}

// Setup review form
function setupReviewForm(productId) {
  const reviewForm = document.getElementById('review-form');
  if (!reviewForm) {
    console.warn('Review form not found');
    return;
  }

  // Check login status from backend
  fetch(`${config.apiUrl}/auth.php?action=status`, {
    method: 'GET',
    credentials: 'include'
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (!data.success) {
        throw new Error(data?.message || 'Failed to check login status');
      }
      return data.data.isLoggedIn;
    })
    .then(isLoggedIn => {
      if (!isLoggedIn) {
        // Hide review form and show login prompt
        const reviewSection = document.getElementById('review-section');
        if (reviewSection) {
          reviewSection.innerHTML = `
            <div class="alert alert-info">
              Please <a href="${config.baseUrl}/public/views/auth/login.html">login</a> to leave a review.
            </div>
          `;
        }
        return;
      }

      // User is logged in, setup review form
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const rating = document.getElementById('review-rating').value;
        const comment = document.getElementById('review-comment').value;
        
        try {
          const response = await fetch(`${config.apiUrl}/reviews.php?action=add`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              product_id: productId,
              rating: parseFloat(rating),
              review_text: comment
            }),
            credentials: 'include'
          });
          
          const result = await response.json();
          
          if (result.success) {
            showToast('Success', 'Review submitted successfully', 'success');
            // Reload reviews
            loadProductReviews(productId);
            // Reset form
            reviewForm.reset();
          } else {
            showToast('Error', result?.message || 'Failed to submit review', 'error');
          }
        } catch (error) {
          console.error('Error submitting review:', error);
          showToast('Error', 'Failed to submit review', 'error');
        }
      });
    })
    .catch(error => {
      console.error('Error checking login status:', error);
      showToast('Error', 'Failed to check login status', 'error');
    });
}

//Show a toast notification
function showToast(title, message, type) {
  const toastContainer = document.getElementById("toast-container");
  
  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast show`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");
  
  // Set toast content
  toast.innerHTML = `
    <div class="toast-header ${type === 'error' ? 'bg-danger text-white' : type === 'success' ? 'bg-success text-white' : ''}">
      <strong class="me-auto">${title}</strong>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      ${message}
    </div>
  `;
  
  // Add toast to container
  toastContainer.appendChild(toast);
  
  // Auto-remove toast after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
  
  // Close button handler
  toast.querySelector(".btn-close").addEventListener("click", function() {
    toast.remove();
  });
}
/**
 * Show an error message in the product container
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  const container = document.querySelector(".container");
  container.innerHTML = `
    <div class="alert alert-danger my-5">
      <h4 class="alert-heading">Error!</h4>
      <p>${message}</p>
      <hr>
      <p class="mb-0">
        <a href="../../index.html" class="btn btn-primary">Return to Home Page</a>
      </p>
    </div>
  `;
}

// Setup image gallery
function setupImageGallery() {
  const mainImage = document.getElementById('main-product-image');
  const thumbnails = document.querySelectorAll('.thumbnail-img');
  
  thumbnails.forEach(thumb => {
    thumb.addEventListener('click', function() {
      // fade out
      mainImage.style.opacity = '0';
      
      setTimeout(() => {
        mainImage.src = this.src;
        mainImage.alt = this.alt;
        
        // fade in
        mainImage.style.opacity = '1';
        
        // update active thumbnail
        thumbnails.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
      }, 300);
    });
  });
}

//control quantity
function setupQuantityControl() {
  const decreaseBtn = document.getElementById('decrease-quantity');
  const increaseBtn = document.getElementById('increase-quantity');
  const quantityInput = document.getElementById('product-quantity');
  const stockInfo = document.getElementById('stock-info');
  
  let maxStock = 10; // default max stock
  
  //update max stock
  function updateMaxStock(stock) {
    maxStock = stock;
    quantityInput.max = maxStock;
    stockInfo.textContent = `${maxStock} in stock`;
  }
  
  decreaseBtn.addEventListener('click', () => {
    let value = parseInt(quantityInput.value);
    if (value > 1) {
      quantityInput.value = value - 1;
    }
  });
  
  increaseBtn.addEventListener('click', () => {
    let value = parseInt(quantityInput.value);
    if (value < maxStock) {
      quantityInput.value = value + 1;
    }
  });
  
  quantityInput.addEventListener('change', () => {
    let value = parseInt(quantityInput.value);
    if (value < 1) quantityInput.value = 1;
    if (value > maxStock) quantityInput.value = maxStock;
  });
  
  return { updateMaxStock };
}

// Button states logic
function setupButtonStates() {
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const buyNowBtn = document.getElementById('buy-now-btn');
  const wishlistBtn = document.getElementById('add-to-wishlist-btn');
  
  let isInWishlist = false;
  
  function updateButtonStates(stock) {
    const isAvailable = stock > 0;
    addToCartBtn.disabled = !isAvailable;
    buyNowBtn.disabled = !isAvailable;
    
    if (isAvailable) {
      addToCartBtn.classList.remove('btn-secondary');
      addToCartBtn.classList.add('btn-primary');
      buyNowBtn.classList.remove('btn-secondary');
      buyNowBtn.classList.add('btn-outline-primary');
    } else {
      addToCartBtn.classList.remove('btn-primary');
      addToCartBtn.classList.add('btn-secondary');
      buyNowBtn.classList.remove('btn-outline-primary');
      buyNowBtn.classList.add('btn-secondary');
    }
  }
  
  // wishlist add/remove
  wishlistBtn.addEventListener('click', () => {
    isInWishlist = !isInWishlist;
    wishlistBtn.querySelector('i').classList.toggle('bi-heart-fill');
    wishlistBtn.querySelector('i').classList.toggle('bi-heart');
    
    if (isInWishlist) {
      showToast('Added to wishlist', 'success');
    } else {
      showToast('Removed from wishlist', 'info');
    }
  });
  
  return { updateButtonStates };
}


