document.addEventListener("DOMContentLoaded", function () {
  // URL Parameters
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");
  
  // Check if we have a valid product ID
  if (!productId) {
    showErrorMessage("Product not found. Invalid product ID.");
    return;
  }
  
  // Image directory path
  const imgPath = "/server/uploads/images/";
  
  // Load product details
  loadProductDetails(productId);
  
  // Load reviews for this product
  loadProductReviews(productId);
  
  // Setup review form handlers
  setupReviewForm(productId);
});

/**
 * Load product details from the API
 * @param {number} productId - ID of the product to load
 */
function loadProductDetails(productId) {
  // Use API to fetch product details
  api.products.getProduct(productId)
    .then(response => {
      if (response.success) {
        displayProductDetails(response.product);
      } else {
        showErrorMessage("Error loading product: " + response.message);
      }
    })
    .catch(error => {
      console.error("Error loading product:", error);
      showErrorMessage("Failed to load product details. Please try again later.");
    });
}

/**
 * Display product details in the UI
 * @param {Object} product - Product data from the API
 */
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
    product.stock > 0 ? `${product.stock} in stock` : "Out of stock";
  
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
  if (product.categoryId) {
    api.categories.getCategory(product.categoryId)
      .then(response => {
        if (response.success) {
          const category = response.category;
          document.getElementById("breadcrumb-category-link").textContent = category.name;
          document.getElementById("breadcrumb-category-link").setAttribute("href", `../../index.html?category=${category.id}`);
          document.getElementById("breadcrumb-item").textContent = product.name;
        }
      })
      .catch(error => console.error("Error loading category:", error));
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
    const maxStock = product.stock || 10;
    if (currentQuantity < maxStock) {
      quantityInput.value = currentQuantity + 1;
    }
  });
}

/**
 * Generate HTML for thumbnail images
 * @param {Array} images - Array of image URLs
 * @param {string} productName - Product name for alt text
 */
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

/**
 * Load reviews for a product
 * @param {number} productId - ID of the product to load reviews for
 */
function loadProductReviews(productId) {
  api.reviews.getProductReviews(productId)
    .then(response => {
      if (response.success) {
        displayReviews(response.reviews, response.stats);
      } else {
        console.error("Error loading reviews:", response.message);
        document.getElementById("reviews-container").innerHTML = `
          <div class="alert alert-warning">
            Unable to load reviews. ${response.message}
          </div>
        `;
      }
    })
    .catch(error => {
      console.error("Error loading reviews:", error);
      document.getElementById("reviews-container").innerHTML = `
        <div class="alert alert-warning">
          Unable to load reviews. Please try again later.
        </div>
      `;
    });
}

/**
 * Display reviews and statistics in the UI
 * @param {Array} reviews - Array of review objects
 * @param {Object} stats - Review statistics
 */
function displayReviews(reviews, stats) {
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
  
  if (reviews.length === 0) {
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
          <h5 class="mb-0">${review.username}</h5>
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

/**
 * Update the rating breakdown display
 * @param {Object} stats - Review statistics
 */
function updateRatingBreakdown(stats) {
  const totalReviews = parseInt(stats.total_reviews) || 0;
  if (totalReviews === 0) return;
  
  // Update star counts and progress bars
  for (let i = 1; i <= 5; i++) {
    const count = parseInt(stats[`${getStarName(i)}_star`]) || 0;
    const percentage = Math.round((count / totalReviews) * 100);
    
    document.getElementById(`${getStarName(i)}-star-count`).textContent = count;
    const progressBar = document.getElementById(`${getStarName(i)}-star-bar`);
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute("aria-valuenow", percentage);
  }
}

/**
 * Get the name of a star rating (one, two, three, etc.)
 * @param {number} num - Star rating number (1-5)
 * @returns {string} Star name
 */
function getStarName(num) {
  const names = ["one", "two", "three", "four", "five"];
  return names[num - 1];
}

/**
 * Generate HTML for star ratings
 * @param {number} rating - Star rating (0-5)
 * @returns {string} HTML for star rating
 */
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

/**
 * Setup the review form handlers
 * @param {number} productId - ID of the product being reviewed
 */
function setupReviewForm(productId) {
  // Check login status to show appropriate form
  api.auth.checkLoginStatus()
    .then(response => {
      if (response.success && response.isLoggedIn) {
        // User is logged in, show form with their info pre-filled
        document.getElementById("review-name").value = response.user.username;
        document.getElementById("review-name").disabled = true;
        document.getElementById("review-email").value = response.user.email;
        document.getElementById("review-email").disabled = true;
      } else {
        // Show login prompt
        const reviewForm = document.getElementById("review-form");
        reviewForm.innerHTML = `
          <div class="alert alert-info">
            <p>You need to <a href="../user/login.html">log in</a> to write a review.</p>
          </div>
        `;
      }
    })
    .catch(error => {
      console.error("Error checking login status:", error);
    });
  
  // Rating star selection
  const ratingStars = document.querySelectorAll(".rating-star");
  ratingStars.forEach(star => {
    star.addEventListener("click", function() {
      const rating = parseInt(this.getAttribute("data-rating"));
      document.getElementById("rating-value").value = rating;
      
      // Update visual state of stars
      ratingStars.forEach(s => {
        const starRating = parseInt(s.getAttribute("data-rating"));
        s.classList.remove("bi-star-fill", "bi-star");
        s.classList.add(starRating <= rating ? "bi-star-fill" : "bi-star");
      });
    });
    
    // Hover effects
    star.addEventListener("mouseenter", function() {
      const hoverRating = parseInt(this.getAttribute("data-rating"));
      ratingStars.forEach(s => {
        const starRating = parseInt(s.getAttribute("data-rating"));
        if (starRating <= hoverRating) {
          s.classList.add("text-warning");
        }
      });
    });
    
    star.addEventListener("mouseleave", function() {
      ratingStars.forEach(s => {
        s.classList.remove("text-warning");
      });
    });
  });
  
  // Review form submission
  const reviewForm = document.getElementById("review-form");
  reviewForm.addEventListener("submit", function(event) {
    event.preventDefault();
    
    // Get form values
    const rating = parseInt(document.getElementById("rating-value").value);
    const reviewText = document.getElementById("review-text").value.trim();
    
    // Validate form
    if (rating < 1 || rating > 5) {
      showToast("Error", "Please select a rating", "error");
      return;
    }
    
    if (reviewText.length < 10) {
      showToast("Error", "Review text must be at least 10 characters", "error");
      return;
    }
    
    // Submit review via API
    api.reviews.addReview(productId, rating, reviewText)
      .then(response => {
        if (response.success) {
          showToast("Success", "Your review has been submitted!", "success");
          
          // Clear form
          document.getElementById("rating-value").value = 0;
          document.getElementById("review-text").value = "";
          ratingStars.forEach(s => {
            s.classList.remove("bi-star-fill");
            s.classList.add("bi-star");
          });
          
          // Reload reviews to show the new one
          loadProductReviews(productId);
        } else {
          showToast("Error", response.message, "error");
        }
      })
      .catch(error => {
        console.error("Error submitting review:", error);
        showToast("Error", "Failed to submit review. Please try again later.", "error");
      });
  });
}

/**
 * Show a toast notification
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, info)
 */
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
