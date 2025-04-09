// Pagination functionality

// Pagination variables
let currentPage = 1;
let productsPerPage = 12;

// Display paginated products
function displayPaginatedProducts() {
    const productsContainer = document.getElementById('products-container');
    productsContainer.innerHTML = '';

    if (filteredProducts.length === 0) {
        productsContainer.innerHTML = '<p class="text-center w-100">No products found matching your criteria. Please try different filters.</p>';
        return;
    }

    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = Math.min(startIndex + productsPerPage, filteredProducts.length);

    const productsToShow = filteredProducts.slice(startIndex, endIndex);

    productsToShow.forEach(product => {
        // Generate star rating HTML based on product's rating from the database
        // Ensure rating has a default value if not provided by the backend
        const rating = typeof product.rating === 'number' ? product.rating : 0;

        // Calculate stars display (full, half, empty)
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        let starsHtml = '<span class="text-warning">';
        // Add full stars
        for (let j = 0; j < fullStars; j++) {
            starsHtml += '<i class="bi bi-star-fill"></i> ';
        }
        // Add half star if needed
        if (hasHalfStar) {
            starsHtml += '<i class="bi bi-star-half"></i> ';
        }
        // Add empty stars
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let j = 0; j < emptyStars; j++) {
            starsHtml += '<i class="bi bi-star"></i> ';
        }

        // Add review count from database (default to 0 if not available)
        const reviewCount = typeof product.reviewCount === 'number' ? product.reviewCount : 0;

        // Show review count with appropriate plural/singular text
        const reviewText = reviewCount === 1 ? 'review' : 'reviews';
        starsHtml += `<span class="text-muted ms-1">(${reviewCount} ${reviewText})</span></span>`;

        // Price display
        let priceHtml = '';
        if (product.onSale && product.salePrice) {
            priceHtml = `
        <span class="product-price">$${product.salePrice.toFixed(2)}</span>
        <span class="product-price-discount">$${product.price.toFixed(2)}</span>
      `;
        } else {
            priceHtml = `<span class="product-price">$${product.price.toFixed(2)}</span>`;
        }

        // Ensure image path is valid
        const imagePath = product.images && product.images.length > 0 ? product.images[0] : 'images/placeholder.jpg';

        // Create product card HTML
        const productHtml = `
      <div class="col-lg-4 col-md-6 col-sm-6 product-item">
        <div class="product-card">
          <a href="views/product/product_detail.html?id=${product.id}" class="product-card-link">
            <img src="${imagePath}" class="card-img-top product-img" alt="${product.name}">
            ${product.onSale ? '<div class="product-badge">Sale</div>' : ''}
            <div class="card-body">
              <h5 class="card-title">${product.name}</h5>
              <div class="mb-2">${priceHtml}</div>
              <div class="mb-2">${starsHtml}</div>
              <p class="card-text text-muted">${product.description ? product.description.substring(0, 60) + '...' : 'No description available'}</p>
            </div>
          </a>
        </div>
        <button class="btn btn-primary btn-sm add-to-cart-btn" data-product-id="${product.id}">
          <i class="bi bi-cart-plus"></i> Add to Cart
        </button>
      </div>
    `;

        productsContainer.innerHTML += productHtml;
    });

    // Add "Add to Cart" button events
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const productId = parseInt(this.getAttribute('data-product-id'));

            // Check if addToCart function exists before calling it
            if (typeof addToCart === 'function') {
                addToCart(productId, 1);
            } else if (typeof window.addToCart === 'function') {
                window.addToCart(productId, 1);
            } else {
                console.error('Add to cart function not found. Make sure cart.js is loaded correctly.');
                // Check if showToast function exists before calling it
                if (typeof showToast === 'function') {
                    showToast('Error adding product to cart. Please try again.', 'error');
                } else if (typeof window.showToast === 'function') {
                    window.showToast('Error adding product to cart. Please try again.', 'error');
                } else {
                    console.error('showToast function not found. Make sure ui.js is loaded correctly.');
                    alert('Error adding product to cart. Please try again.');
                }
            }
        });
    });
}

// Update pagination controls
function updatePagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

    if (totalPages <= 1) {
        return;
    }

    // Previous page button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;

    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.setAttribute('aria-label', 'Previous');
    prevLink.innerHTML = '<span aria-hidden="true">&laquo;</span>';

    if (currentPage > 1) {
        prevLink.addEventListener('click', function(e) {
            e.preventDefault();
            currentPage--;
            displayPaginatedProducts();
            updatePagination();
            window.scrollTo(0, 0);
        });
    }

    prevLi.appendChild(prevLink);
    pagination.appendChild(prevLi);

    // Page number buttons
    // Display maximum 5 page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;

        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;

        if (i !== currentPage) {
            pageLink.addEventListener('click', function(e) {
                e.preventDefault();
                currentPage = i;
                displayPaginatedProducts();
                updatePagination();
                window.scrollTo(0, 0);
            });
        }

        pageLi.appendChild(pageLink);
        pagination.appendChild(pageLi);
    }

    // Next page button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;

    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.setAttribute('aria-label', 'Next');
    nextLink.innerHTML = '<span aria-hidden="true">&raquo;</span>';

    if (currentPage < totalPages) {
        nextLink.addEventListener('click', function(e) {
            e.preventDefault();
            currentPage++;
            displayPaginatedProducts();
            updatePagination();
            window.scrollTo(0, 0);
        });
    }

    nextLi.appendChild(nextLink);
    pagination.appendChild(nextLi);
}

// Set the number of products to display per page
function setProductsPerPage(count) {
    productsPerPage = count;
    currentPage = 1;
    displayPaginatedProducts();
    updatePagination();
}