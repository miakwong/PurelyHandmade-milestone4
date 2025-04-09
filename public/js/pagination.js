// 分页功能

// 分页变量
let currentPage = 1;
let productsPerPage = 12;

// 显示分页后的产品
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
    // 生成星级评分HTML
    const fullStars = Math.floor(product.rating);
    const hasHalfStar = product.rating % 1 >= 0.5;
    
    let starsHtml = '<span class="text-warning">';
    for (let j = 0; j < fullStars; j++) {
      starsHtml += '<i class="bi bi-star-fill"></i> ';
    }
    if (hasHalfStar) {
      starsHtml += '<i class="bi bi-star-half"></i> ';
    }
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let j = 0; j < emptyStars; j++) {
      starsHtml += '<i class="bi bi-star"></i> ';
    }
    starsHtml += `<span class="text-muted ms-1">(${product.reviewCount})</span></span>`;
    
    // 价格显示
    let priceHtml = '';
    if (product.onSale && product.salePrice) {
      priceHtml = `
        <span class="product-price">$${product.salePrice.toFixed(2)}</span>
        <span class="product-price-discount">$${product.price.toFixed(2)}</span>
      `;
    } else {
      priceHtml = `<span class="product-price">$${product.price.toFixed(2)}</span>`;
    }
    
    // 创建产品卡片HTML
    const productHtml = `
      <div class="col-lg-4 col-md-6 col-sm-6 product-item">
        <div class="product-card">
          <a href="views/product/product_detail.html?id=${product.id}" class="product-card-link">
            <img src="${product.images[0]}" class="card-img-top product-img" alt="${product.name}">
            ${product.onSale ? '<div class="product-badge">Sale</div>' : ''}
            <div class="card-body">
              <h5 class="card-title">${product.name}</h5>
              <div class="mb-2">${priceHtml}</div>
              <div class="mb-2">${starsHtml}</div>
              <p class="card-text text-muted">${product.description.substring(0, 60)}...</p>
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
  
  // 添加Add to Cart按钮事件
  document.querySelectorAll('.add-to-cart-btn').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = parseInt(this.getAttribute('data-product-id'));
      addToCart(productId, 1);
    });
  });
}

// 更新分页控件
function updatePagination() {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  
  if (totalPages <= 1) {
    return;
  }
  
  // 上一页按钮
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
  
  // 页码按钮
  // 最多显示5个页码
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
  
  // 下一页按钮
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

// 设置每页显示的产品数量
function setProductsPerPage(count) {
  productsPerPage = count;
  currentPage = 1;
  displayPaginatedProducts();
  updatePagination();
} 