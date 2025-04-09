// UI 交互功能

// 初始化URL参数
function initializeUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  if (categoryParam) {
    activeCategoryId = parseInt(categoryParam);
  }
  return activeCategoryId;
}

// 显示Toast通知
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toast-container');
  
  if (!toastContainer) return;
  
  // 创建toast元素
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.backgroundColor = '#fff';
  toast.style.color = '#333';
  toast.style.borderRadius = '4px';
  toast.style.padding = '10px 15px';
  toast.style.marginBottom = '10px';
  toast.style.minWidth = '250px';
  toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.animation = 'slideIn 0.3s, fadeOut 0.5s 2.5s forwards';
  toast.style.position = 'relative';
  
  if (type === 'success') {
    toast.style.borderLeft = '4px solid #198754';
  } else if (type === 'error') {
    toast.style.borderLeft = '4px solid #dc3545';
  }
  
  // 添加内容
  toast.innerHTML = `
    <div style="flex: 1; padding-right: 10px;">${message}</div>
    <div style="cursor: pointer; font-size: 16px; color: #999;">&times;</div>
  `;
  
  // 添加到容器
  toastContainer.appendChild(toast);
  
  // 添加关闭按钮事件
  const closeBtn = toast.querySelector('div:last-child');
  closeBtn.addEventListener('click', function() {
    toast.remove();
  });
  
  // 自动3秒后移除
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// 初始化事件监听器
function initializeEventListeners() {
  // 排序选择器
  document.getElementById('sort-select').addEventListener('change', applyFiltersAndSort);
  
  // 每页显示产品数选择器
  document.getElementById('products-per-page').addEventListener('change', function() {
    setProductsPerPage(parseInt(this.value));
    applyFiltersAndSort();
  });
  
  // 价格筛选
  document.getElementById('apply-price-filter').addEventListener('click', applyFiltersAndSort);
  
  // 重置筛选器
  document.getElementById('reset-filters').addEventListener('click', resetFilters);
  
  // 评分筛选
  document.querySelectorAll('input[name="rating-filter"]').forEach(input => {
    input.addEventListener('change', applyFiltersAndSort);
  });
  
  // 特惠筛选
  document.getElementById('filter-sale').addEventListener('change', applyFiltersAndSort);
}

// 加载导航栏和页脚
function loadLayoutComponents() {
  const navbarUrl = config.production 
    ? `${config.baseUrl}/layout/navbar.html` 
    : 'layout/navbar.html';
    
  const footerUrl = config.production 
    ? `${config.baseUrl}/layout/footer.html` 
    : 'layout/footer.html';
    
  // 加载导航栏
  fetch(navbarUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load navbar (${response.status})`);
      }
      return response.text();
    })
    .then(html => {
      document.getElementById('navbar-placeholder').innerHTML = html;
      console.log('Navbar loaded successfully');
      
      // 在导航栏加载完成后，确保DOM元素已存在再更新购物车计数
      setTimeout(() => {
        if (typeof updateCartCount === 'function') {
          updateCartCount();
          console.log('Cart count updated after navbar loaded');
        } else {
          console.error('updateCartCount function not found');
        }
      }, 100);
    })
    .catch(error => {
      console.error('Error loading navbar:', error);
      document.getElementById('navbar-placeholder').innerHTML =
        '<div class="alert alert-danger">Failed to load navigation bar. Please check console for details.</div>';
    });

  // 加载页脚
  fetch(footerUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load footer (${response.status})`);
      }
      return response.text();
    })
    .then(html => {
      document.getElementById('footer-placeholder').innerHTML = html;
      console.log('Footer loaded successfully');
    })
    .catch(error => {
      console.error('Error loading footer:', error);
      document.getElementById('footer-placeholder').innerHTML =
        '<div class="alert alert-danger">Failed to load footer. Please check console for details.</div>';
    });
}

// 页面初始化
function initializePage() {
  // 加载导航栏和页脚
  loadLayoutComponents();
  
  // 初始化URL参数
  initializeUrlParams();
  
  // 加载分类和产品
  loadCategories();
  loadProducts();
  
  // 初始化筛选器折叠功能
  initializeFilterAccordion();
  
  // 初始化事件监听器
  initializeEventListeners();
} 