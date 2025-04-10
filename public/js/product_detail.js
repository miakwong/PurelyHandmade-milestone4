document.addEventListener("DOMContentLoaded", function () {
  // Get product ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");
  
  // Check if we have a valid product ID
  if (!productId) {
    showErrorMessage("Product not found. Invalid product ID.");
    return;
  }

  // Load product details and reviews
  loadProductDetails(productId);
  loadProductReviews(productId);
  
  // Setup review form handlers
  setupReviewForm(productId);
});

// Load product details from the API
function loadProductDetails(productId) {
  // Show loading indicator
  const container = document.querySelector(".container");
  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "text-center my-5";
  loadingIndicator.id = "loading-indicator";
  loadingIndicator.innerHTML = `
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
    <p class="mt-2">Loading product details...</p>
  `;
  
  // Insert the loading indicator if it doesn't exist
  if (!document.getElementById("loading-indicator")) {
    container.insertBefore(loadingIndicator, container.firstChild);
  }
  
  // Fetch product data from API
  api.products.getProduct(productId)
    .then(data => {
      // Remove loading indicator
      const indicator = document.getElementById("loading-indicator");
      if (indicator) {
        indicator.remove();
      }
      
      if (data.success && data.data) {
        displayProductDetails(data.data);
      } else {
        throw new Error(data.message || "Invalid product data");
      }
    })
    .catch(error => {
      console.error("Error loading product:", error);
      showErrorMessage("Failed to load product details. Please try again later. Error: " + error.message);
    });
}

// Display product details on page
function displayProductDetails(product) {
  console.log("Product data received:", product); // 调试信息
  
  // Set product name and details
  document.getElementById("product-name").textContent = product.name;
  document.getElementById("product-description").textContent = product.description;
  
  // Handle price display
  const priceElement = document.getElementById("product-price");
  if (priceElement) {
    // Parse price as float and check validity
    const regularPrice = parseFloat(product.price);
    const formattedRegularPrice = !isNaN(regularPrice) ? `$${regularPrice.toFixed(2)}` : '$0.00';
    
    // Check if product is on sale and has valid sale price
    if (product.onSale && product.salePrice && parseFloat(product.salePrice) < regularPrice) {
        const salePrice = parseFloat(product.salePrice);
        const formattedSalePrice = !isNaN(salePrice) ? `$${salePrice.toFixed(2)}` : '$0.00';
        
        priceElement.innerHTML = `
            <span class="original-price text-muted"><s>${formattedRegularPrice}</s></span>
            <span class="sale-price text-danger">${formattedSalePrice}</span>
            <span class="badge bg-danger ms-2">Sale</span>
        `;
    } else {
        // Regular price display
        priceElement.innerHTML = `<span>${formattedRegularPrice}</span>`;
    }
  }
  
  // Set stock status
  const stockStatusElement = document.getElementById("stock-status");
  if (stockStatusElement) {
    if (product.in_stock || (product.stock_quantity && product.stock_quantity > 0)) {
        stockStatusElement.textContent = "In Stock";
        stockStatusElement.classList.add("text-success");
        stockStatusElement.classList.remove("text-danger");
    } else {
        stockStatusElement.textContent = "Out of Stock";
        stockStatusElement.classList.add("text-danger");
        stockStatusElement.classList.remove("text-success");
    }
  }
  
  // Setup product rating stars
  const ratingElem = document.getElementById("product-rating");
  ratingElem.innerHTML = generateStarsHtml(product.rating);
  
  // Set review count
  document.getElementById("review-count").textContent = 
    `(${product.reviewCount || 0} reviews)`;
  
  // Handle images
  const mainImageElement = document.getElementById("main-product-image");
  const thumbnailContainer = document.getElementById("thumbnail-container");
  
  // Clear any existing thumbnails
  if (thumbnailContainer) {
    thumbnailContainer.innerHTML = '';
  }
  
  // Database image handling
  console.log("Product images:", product.images); // 调试图片数组
  
  // Check if we have an images array from product_images table
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    console.log(`Found ${product.images.length} images in array`); // 调试图片数量
    
    // Set the main image to the first image in the array
    if (mainImageElement) {
      mainImageElement.src = product.images[0];
      mainImageElement.alt = product.name;
    }
    
    // Generate thumbnails from the images array
    generateThumbnails(product.images, product.name);
  } 
  // Handle case with single image from products table
  else if (product.image) {
    console.log("Only found single image:", product.image); // 调试单图片情况
    
    if (mainImageElement) {
      mainImageElement.src = product.image;
      mainImageElement.alt = product.name;
    }
    
    // Create a single thumbnail for the main image
    generateThumbnails([product.image], product.name);
  } 
  // No images available
  else {
    console.log("No images found for product"); // 调试无图片情况
    
    // Set a default "no image" placeholder
    if (mainImageElement) {
      mainImageElement.src = "/public/images/no-image.jpg";
      mainImageElement.alt = "No image available";
    }
  }
  
  // Update stock status message
  const stockInfoElement = document.getElementById('stock-info');
  if (stockInfoElement) {
    if (product.in_stock && product.stock_quantity > 0) {
      stockInfoElement.textContent = `${product.stock_quantity} in stock`;
      stockInfoElement.classList.add('text-success');
      stockInfoElement.classList.remove('text-danger');
    } else {
      stockInfoElement.textContent = "Out of stock";
      stockInfoElement.classList.add('text-danger');
      stockInfoElement.classList.remove('text-success');
    }
  }
  
  // Update breadcrumb navigation
  if (product.category_id) {
    api.categories.getCategory(product.category_id)
      .then(data => {
        if (data.success && data.category) {
          const category = data.category;
          
          // update breadcrumb links
          const breadcrumbCategory = document.getElementById("breadcrumb-category-link");
          const breadcrumbItem = document.getElementById("breadcrumb-item");
          
          if (breadcrumbCategory && breadcrumbItem) {
            breadcrumbCategory.textContent = category.name;
            // Fix the href for category link to ensure it works correctly
            breadcrumbCategory.href = `/~miakuang/PurelyHandmade/public/index.html?category=${category.id}`;
            breadcrumbItem.textContent = product.name;
          }
          
          // update category link in product meta
          const productCategory = document.getElementById("product-category");
          if (productCategory) {
            productCategory.textContent = category.name;
            productCategory.href = `/~miakuang/PurelyHandmade/public/index.html?category=${category.id}`;
          }
        } else {
          console.error("Category data not found or invalid");
        }
      })
      .catch(error => {
        console.error("Error loading category:", error);
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
  
  // Set up quantity selector
  const quantityInput = document.getElementById("product-quantity");
  const incrementBtn = document.getElementById("quantity-increment");
  const decrementBtn = document.getElementById("quantity-decrement");
  const maxQuantity = product.stock_quantity || 10; // Default to 10 if stock not specified

  if (quantityInput) {
      // Set initial value
      quantityInput.value = 1;
      
      // Update min/max attributes
      quantityInput.setAttribute("min", "1");
      quantityInput.setAttribute("max", maxQuantity.toString());
      
      // Handle manual input
      quantityInput.addEventListener("change", () => {
          let value = parseInt(quantityInput.value, 10);
          
          // Validate the value
          if (isNaN(value) || value < 1) {
              value = 1;
          } else if (value > maxQuantity) {
              value = maxQuantity;
          }
          
          // Update the input value
          quantityInput.value = value;
      });
  }

  if (incrementBtn) {
      incrementBtn.addEventListener("click", () => {
          if (quantityInput) {
              let value = parseInt(quantityInput.value, 10);
              if (isNaN(value)) {
                  value = 0;
              }
              
              if (value < maxQuantity) {
                  quantityInput.value = value + 1;
              }
          }
      });
  }

  if (decrementBtn) {
      decrementBtn.addEventListener("click", () => {
          if (quantityInput) {
              let value = parseInt(quantityInput.value, 10);
              if (isNaN(value)) {
                  value = 2; // This will result in 1 after decrement
              }
              
              if (value > 1) {
                  quantityInput.value = value - 1;
              }
          }
      });
  }
  
  // Setup image gallery
  setupImageGallery();
  
  // Setup quantity control
  const { updateMaxStock } = setupQuantityControl();
  updateMaxStock(product.stock_quantity);
  
  // button setup
  const { updateButtonStates } = setupButtonStates();
  updateButtonStates(product.stock_quantity);
}

// Generate HTML for thumbnail images
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

// Load reviews for a product
function loadProductReviews(productId) {
  // Show loading indicator in reviews tab
  const reviewsContainer = document.getElementById("reviews-container");
  reviewsContainer.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Loading reviews...</p>
    </div>
  `;

  // Fetch reviews from API
  api.reviews.getProductReviews(productId)
    .then(data => {
      if (data.success) {
        displayReviews(data.reviews, data.stats);
      } else {
        reviewsContainer.innerHTML = `
          <div class="alert alert-warning">
            <p>${data.message || 'Failed to load reviews'}</p>
          </div>
        `;
      }
    })
    .catch(error => {
      console.error("Error loading reviews:", error);
      reviewsContainer.innerHTML = `
        <div class="alert alert-danger">
          <p>Failed to load reviews. Please try again later. Error: ${error.message}</p>
        </div>
      `;
    });
}

// Display reviews and statistics
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
        <div class="text-warning">
          ${generateStarsHtml(review.rating)}
        </div>
        <span class="text-muted small">${formattedDate}</span>
      </div>
      <p class="mb-0">${review.review_text}</p>
    `;
    
    reviewListContainer.appendChild(reviewEl);
  });
}

// Update the rating breakdown display
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

// Setup review form
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

// Show a toast notification
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

// Show an error message
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

// Setup quantity control
function setupQuantityControl() {
  const decreaseBtn = document.getElementById('decrease-quantity');
  const increaseBtn = document.getElementById('increase-quantity');
  const quantityInput = document.getElementById('product-quantity');
  const stockInfo = document.getElementById('stock-info');
  
  let maxStock = 10; // default max stock
  
  // Update max stock
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
  
  return { updateButtonStates };
}

