document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");
  
  if (!productId) {
    showErrorMessage("Product not found. Invalid product ID.");
    return;
  }

  loadProductDetails(productId);
  loadProductReviews(productId);
  setupReviewForm(productId);
});

// Load product details from the API
function loadProductDetails(productId) {
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
  
  if (!document.getElementById("loading-indicator")) {
    container.insertBefore(loadingIndicator, container.firstChild);
  }
  
  api.products.getProduct(productId)
    .then(data => {
      const indicator = document.getElementById("loading-indicator");
      if (indicator) indicator.remove();
      
      if (data.success && data.data) {
        displayProductDetails(data.data);
      } else {
        throw new Error(data.message || "Invalid product data");
      }
    })
    .catch(error => {
      showErrorMessage("Failed to load product details. Please try again later.");
    });
}

// Display product details on page
function displayProductDetails(product) {
  let categoryId = product.category_id || product.categoryId;
  let categoryName = product.categoryName || "Unknown Category";
  
  product.category_id = categoryId;
  product.categoryName = categoryName;
  
  const elements = {
    name: document.getElementById("product-name"),
    description: document.getElementById("product-description"),
    price: document.getElementById("product-price"),
    saleBadge: document.getElementById("sale-badge"),
    stockStatus: document.getElementById("stock-status"),
    stockInfo: document.getElementById('stock-info'),
    rating: document.getElementById("product-rating"),
    reviewCount: document.getElementById("review-count"),
    mainImage: document.getElementById("main-product-image"),
    thumbnailContainer: document.getElementById("thumbnail-container"),
    addToCartBtn: document.getElementById("add-to-cart-btn"),
    quantityInput: document.getElementById("product-quantity"),
    incrementBtn: document.getElementById("quantity-increment"),
    decrementBtn: document.getElementById("quantity-decrement"),
    buyNowBtn: document.getElementById("buy-now-btn"),
    detailsContent: document.getElementById("details-content")
  };
  
  if (elements.name) elements.name.textContent = product.name || "Product Name Not Available";
  if (elements.description) elements.description.textContent = product.description || "No description available";
  
  if (elements.detailsContent) {
    elements.detailsContent.innerHTML = `
      <p>${product.description || "No description available"}</p>
    `;
  }
  
  if (elements.price) {
    const regularPrice = parseFloat(product.price);
    const formattedRegularPrice = !isNaN(regularPrice) ? `$${regularPrice.toFixed(2)}` : '$0.00';
    
    const isSale = product.onSale === true || product.is_featured === 1 || product.is_featured === '1';
    const hasSalePrice = product.salePrice && parseFloat(product.salePrice) < regularPrice;
    
    if (isSale) {
      const salePrice = hasSalePrice 
        ? parseFloat(product.salePrice) 
        : parseFloat((regularPrice * 0.8).toFixed(2));
      
        const formattedSalePrice = !isNaN(salePrice) ? `$${salePrice.toFixed(2)}` : '$0.00';
        
      elements.price.innerHTML = `
            <span class="original-price text-muted"><s>${formattedRegularPrice}</s></span>
            <span class="sale-price text-danger">${formattedSalePrice}</span>
            <span class="badge bg-danger ms-2">Sale</span>
        `;
      
      if (elements.saleBadge) elements.saleBadge.style.display = "inline-block";
    } else {
      elements.price.innerHTML = `<span>${formattedRegularPrice}</span>`;
      
      if (elements.saleBadge) elements.saleBadge.style.display = "none";
    }
  }
  
  const isInStock = product.in_stock || (product.stock_quantity && product.stock_quantity > 0);
  const stockQuantity = product.stock_quantity || 0;
  
  if (elements.stockStatus) {
    elements.stockStatus.textContent = isInStock ? "In Stock" : "Out of Stock";
    elements.stockStatus.className = isInStock ? "text-success" : "text-danger";
  }
  
  if (elements.stockInfo) {
    elements.stockInfo.textContent = isInStock ? `${stockQuantity} in stock` : "Out of stock";
    elements.stockInfo.className = isInStock ? "text-success" : "text-danger";
  }
  
  if (elements.rating) {
    elements.rating.innerHTML = generateStarsHtml(product.rating);
  }
  
  if (elements.reviewCount) {
    elements.reviewCount.textContent = `(${product.reviewCount || 0} reviews)`;
  }
  
  if (elements.thumbnailContainer) {
    elements.thumbnailContainer.innerHTML = '';
  }
  
  const productImages = [];
  
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    productImages.push(...product.images);
  } else if (product.image) {
    productImages.push(product.image);
  }
  
  if (productImages.length > 0) {
    if (elements.mainImage) {
      elements.mainImage.src = productImages[0];
      elements.mainImage.alt = product.name;
    }
    
    generateThumbnails(productImages, product.name);
  } else if (elements.mainImage) {
    elements.mainImage.src = "/public/images/no-image.jpg";
    elements.mainImage.alt = "No image available";
  }
  
  updateBreadcrumbNavigation(product, categoryId, categoryName);
  
  if (elements.addToCartBtn) {
    elements.addToCartBtn.addEventListener("click", function() {
      const quantity = parseInt(elements.quantityInput?.value) || 1;
      
      if (typeof window.addToCart === 'function') {
        window.addToCart(product.id, quantity);
        window.showToast("Product added to cart!", "success");
        } else {
          window.showToast("Shopping cart functionality is temporarily unavailable.", "error");
      }
    });
  }
  
  const maxQuantity = stockQuantity || 10;
  setupQuantityControls(elements.quantityInput, elements.incrementBtn, elements.decrementBtn, maxQuantity);
  
  if (elements.addToCartBtn && elements.buyNowBtn) {
    const isAvailable = isInStock;
    elements.addToCartBtn.disabled = !isAvailable;
    elements.buyNowBtn.disabled = !isAvailable;
    
    if (isAvailable) {
      elements.addToCartBtn.classList.add('btn-primary');
      elements.addToCartBtn.classList.remove('btn-secondary');
      elements.buyNowBtn.classList.add('btn-outline-primary');
      elements.buyNowBtn.classList.remove('btn-secondary');
        } else {
      elements.addToCartBtn.classList.add('btn-secondary');
      elements.addToCartBtn.classList.remove('btn-primary');
      elements.buyNowBtn.classList.add('btn-secondary');
      elements.buyNowBtn.classList.remove('btn-outline-primary');
    }
  }
}

// Setup quantity controls
function setupQuantityControls(quantityInput, incrementBtn, decrementBtn, maxQuantity) {
  if (!quantityInput) return;
  
      quantityInput.value = 1;
      
      quantityInput.setAttribute("min", "1");
      quantityInput.setAttribute("max", maxQuantity.toString());
      
      quantityInput.addEventListener("change", () => {
          let value = parseInt(quantityInput.value, 10);
          
          if (isNaN(value) || value < 1) {
              value = 1;
          } else if (value > maxQuantity) {
              value = maxQuantity;
          }
          
          quantityInput.value = value;
      });

  if (incrementBtn) {
      incrementBtn.addEventListener("click", () => {
      let value = parseInt(quantityInput.value, 10) || 0;
              if (value < maxQuantity) {
                  quantityInput.value = value + 1;
          }
      });
  }

  if (decrementBtn) {
      decrementBtn.addEventListener("click", () => {
      let value = parseInt(quantityInput.value, 10) || 2;
              if (value > 1) {
                  quantityInput.value = value - 1;
          }
      });
  }
}

// Generate HTML for thumbnail images
function generateThumbnails(images, productName) {
  const thumbnailContainer = document.getElementById("thumbnail-container");
  if (!thumbnailContainer) return;
  
  thumbnailContainer.innerHTML = '';
  const mainImage = document.getElementById('main-product-image');
  
  images.forEach((imgSrc, index) => {
    const thumbDiv = document.createElement("div");
    thumbDiv.className = "thumbnail-item";
    
    const img = document.createElement("img");
    img.src = imgSrc;
    img.alt = `${productName} - Image ${index + 1}`;
    img.className = "thumbnail-img" + (index === 0 ? " active" : "");
    
    img.addEventListener("click", function() {
      if (mainImage) {
        mainImage.style.opacity = '0';
        
        setTimeout(() => {
          mainImage.src = imgSrc;
          mainImage.alt = this.alt;
          mainImage.style.opacity = '1';
        }, 300);
      }
      
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
function loadProductReviews(productId, forceRefresh = false) {
  const reviewList = document.getElementById("review-list");
  if (!reviewList) return;
  
  reviewList.innerHTML = `<div class="text-center py-3">Loading reviews...</div>`;
  
  const timestamp = forceRefresh ? `&_t=${new Date().getTime()}` : '';
  const url = getApiUrl(`product_reviews.php?product_id=${productId}${timestamp}`);

  fetch(url, {
    method: 'GET',
    credentials: 'include',
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      displayReviews(data.data.reviews, data.data.stats);
    } else {
      reviewList.innerHTML = `<div class="alert alert-warning">Failed to load reviews: ${data.message}</div>`;
    }
  })
  .catch(error => {
    reviewList.innerHTML = `<div class="alert alert-danger">Error loading reviews. Please try again later.</div>`;
  });
}

// Display reviews and statistics
function displayReviews(reviews, stats) {
  if (!reviews) reviews = [];
  if (!stats) stats = { avg_rating: 0, total_reviews: 0, rating_distribution: {} };
  
  const avgRating = parseFloat(stats.avg_rating) || 0;
  const totalReviews = parseInt(stats.total_reviews) || 0;
  
  const elements = {
    avgRating: document.getElementById("average-rating"),
    avgStars: document.getElementById("average-stars"),
    totalReviews: document.getElementById("total-reviews"),
    reviewList: document.getElementById("review-list")
  };
  
  if (elements.avgRating) elements.avgRating.textContent = avgRating.toFixed(1);
  if (elements.avgStars) elements.avgStars.innerHTML = generateStarsHtml(avgRating);
  if (elements.totalReviews) elements.totalReviews.textContent = `Based on ${totalReviews} reviews`;
  
  updateRatingBreakdown(stats);
  
  if (!elements.reviewList) return;
  
  elements.reviewList.innerHTML = '';
  
  if (reviews.length === 0) {
    elements.reviewList.innerHTML = `
      <div class="text-center my-4">
        <p>This product doesn't have any reviews yet. Be the first to review it!</p>
      </div>
    `;
    return;
  }
  
  reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  reviews.forEach(review => {
    const reviewEl = document.createElement("div");
    reviewEl.className = "review-item mb-4 pb-4 border-bottom";
    
    const date = new Date(review.created_at);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
    
    let userInfo = '';
    if (review.username) {
      userInfo = `<div class="mb-2 text-primary fw-bold">${review.username}</div>`;
    }
    
    reviewEl.innerHTML = `
      ${userInfo}
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div class="text-warning">
          ${generateStarsHtml(review.rating)}
        </div>
        <span class="text-muted small">${formattedDate}</span>
      </div>
      <p class="mb-1">${review.review_text}</p>
    `;
    
    elements.reviewList.appendChild(reviewEl);
  });
}

// Generate HTML for star ratings
function generateStarsHtml(rating) {
  let starsHtml = '';
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  starsHtml = '<i class="bi bi-star-fill"></i> '.repeat(fullStars);
  if (halfStar) starsHtml += '<i class="bi bi-star-half"></i> ';
  starsHtml += '<i class="bi bi-star"></i> '.repeat(emptyStars);
  
  return starsHtml;
}

// Update the rating breakdown display
function updateRatingBreakdown(stats) {
  const totalReviews = parseInt(stats.total_reviews) || 0;
  if (totalReviews === 0) return;
  
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  
  if (stats.rating_distribution) {
    Object.keys(stats.rating_distribution).forEach(key => {
      const rating = parseFloat(key.split('_')[0]);
      if (!isNaN(rating)) {
        const starLevel = Math.round(rating);
        if (starLevel >= 1 && starLevel <= 5) {
          starCounts[starLevel] += parseInt(stats.rating_distribution[key]) || 0;
        }
      }
    });
  }
  
  const starMapping = { 5: 'five', 4: 'four', 3: 'three', 2: 'two', 1: 'one' };
  
  for (let i = 5; i >= 1; i--) {
    const count = starCounts[i];
    const percentage = Math.round((count / totalReviews) * 100);
    const starName = starMapping[i];
    
    const countElement = document.getElementById(`${starName}-star-count`);
    const progressBar = document.getElementById(`${starName}-star-bar`);
    
    if (countElement) countElement.textContent = count;
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute("aria-valuenow", percentage);
    }
  }
}

// Setup review form
function setupReviewForm(productId) {
  const reviewForm = document.getElementById("review-form");
  if (!reviewForm) return;

  // Check login status
  api.auth.checkLoginStatus()
    .then(response => {
      let isLoggedIn = false;
      let userData = null;
      
      if (response.success) {
        if (response.isLoggedIn === true) {
          isLoggedIn = true;
          userData = response.user || {};
        } 
        else if (response.data && response.data.isLoggedIn === true) {
          isLoggedIn = true;
          userData = response.data.user || {};
        }
        else if (response.message === 'User is logged in') {
          isLoggedIn = true;
          userData = response.user || response.data?.user || {};
        }
      }
      
      if (isLoggedIn && userData) {
        const nameInput = document.getElementById("review-name");
        const emailInput = document.getElementById("review-email");
        
        if (nameInput) {
          nameInput.value = userData.username || "";
          nameInput.disabled = true;
        }
        
        if (emailInput) {
          emailInput.value = userData.email || "";
          emailInput.disabled = true;
        }
        
        setupRatingStars();
        
        reviewForm.addEventListener("submit", function(event) {
          event.preventDefault();
          
          const ratingInput = document.getElementById("rating-value");
          const reviewTextInput = document.getElementById("review-text");
          
          if (!ratingInput || !reviewTextInput) {
            window.showToast("Form elements not found", "error");
            return;
          }
          
          const rating = parseInt(ratingInput.value);
          const reviewText = reviewTextInput.value.trim();
          
          if (rating < 1 || rating > 5) {
            window.showToast("Please select a rating", "error");
            return;
          }
          
          if (reviewText.length < 3) {
            window.showToast("Review text must be at least 3 characters", "error");
            return;
          }
          
          const apiUrl = getApiUrl('product_reviews.php');

          fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              product_id: productId,
              rating: rating,
              review_text: reviewText
            })
          })
          .then(response => {
            return response.text().then(text => {
              if (!text || text.trim() === '') {
                throw new Error("Server returned empty response");
              }
              
              try {
                return JSON.parse(text);
              } catch(e) {
                throw new Error("Invalid JSON response: " + text);
              }
            });
          })
          .then(data => {
            if (data.success) {
              window.showToast("Review has been submitted", "success");
              document.getElementById("review-form").reset();
              loadProductReviews(productId, true);
            } else {
              window.showToast(data.message || "Failed to submit review", "error");
            }
          })
          .catch((error) => {
            window.showToast("Failed to submit review: " + error.message, "error");
          });
        });
      } else {
        reviewForm.innerHTML = `
          <div class="alert alert-info">
            <p>You need to <a href="../auth/login.html">log in</a> to write a review.</p>
          </div>
        `;
      }
    })
    .catch(error => {
      reviewForm.innerHTML = `
        <div class="alert alert-info">
          <p>You need to <a href="../auth/login.html">log in</a> to write a review.</p>
        </div>
      `;
    });
}

// Setup rating stars functionality
function setupRatingStars() {
  const ratingStars = document.querySelectorAll(".rating-star");
  if (ratingStars.length === 0) return;
  
  ratingStars.forEach(star => {
    star.addEventListener("click", function() {
      const rating = parseInt(this.getAttribute("data-rating"));
      const ratingValueInput = document.getElementById("rating-value");
      if (ratingValueInput) {
        ratingValueInput.value = rating;
      }
      
      ratingStars.forEach(s => {
        const starRating = parseInt(s.getAttribute("data-rating"));
        s.classList.remove("bi-star-fill", "bi-star");
        s.classList.add(starRating <= rating ? "bi-star-fill" : "bi-star");
      });
    });
    
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
}

// Show an error message
function showErrorMessage(message) {
  const container = document.querySelector(".container");
  if (!container) return;
  
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

// Simplified breadcrumb navigation update
function updateBreadcrumbNavigation(product, categoryId, categoryName) {
  if (!product) return;
  
  const breadcrumbCategory = document.getElementById("breadcrumb-category-link");
  const breadcrumbItem = document.getElementById("breadcrumb-item");
  const productCategory = document.getElementById("product-category");
  
  if (!categoryId) {
    if (breadcrumbCategory) {
      breadcrumbCategory.textContent = "All Products";
      breadcrumbCategory.href = "../../index.html";
    }
    
    if (breadcrumbItem) {
      breadcrumbItem.textContent = product.name || "Product";
    }
    
    if (productCategory) {
      productCategory.textContent = "All Products";
      productCategory.href = "../../index.html";
    }
    return;
  }
  
  if (categoryName && categoryName !== "Unknown Category") {
    updateBreadcrumbElements(breadcrumbCategory, breadcrumbItem, productCategory, 
                             categoryName, categoryId, product.name);
    return;
  }
  
  api.categories.getCategory(categoryId)
    .then(data => {
      let fetchedCategoryName = "Unknown Category";
      if (data?.success) {
        fetchedCategoryName = data.data?.name || data.category?.name || "Unknown Category";
      }
      
      updateBreadcrumbElements(breadcrumbCategory, breadcrumbItem, productCategory, 
                               fetchedCategoryName, categoryId, product.name);
    })
    .catch(() => {
      updateBreadcrumbElements(breadcrumbCategory, breadcrumbItem, productCategory, 
                               "Products", null, product.name);
    });
}

// Helper function to update breadcrumb elements
function updateBreadcrumbElements(breadcrumbCategory, breadcrumbItem, productCategory, 
                                 categoryName, categoryId, productName) {
  const categoryLink = categoryId ? `../../index.html?category=${categoryId}` : "../../index.html";
  
  if (breadcrumbCategory) { 
    breadcrumbCategory.textContent = categoryName;
    breadcrumbCategory.href = categoryLink;
  }
  
  if (breadcrumbItem) {
    breadcrumbItem.textContent = productName || "Product";
  }
  
  if (productCategory) {
    productCategory.textContent = categoryName;
    productCategory.href = categoryLink;
  }
}

