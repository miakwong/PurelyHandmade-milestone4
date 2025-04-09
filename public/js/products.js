// 产品相关功能

// 产品变量
let productsList = [];
let categoriesList = [];
let filteredProducts = [];

// 筛选条件
let filterCriteria = {
  categories: [],
  priceMin: null,
  priceMax: null,
  rating: 0,
  onSale: false
};

// 加载产品
function loadProducts() {
  // 使用API获取产品
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

// 加载分类
function loadCategories() {
  // 使用API获取分类
  categories.getCategories()
    .then(data => {
      categoriesList = data;
      
      // 生成分类筛选选项
      const categoryFiltersContainer = document.getElementById('category-filters');
      const allCategoriesCheckbox = document.getElementById('category-all');
      
      // 监听全部分类复选框
      allCategoriesCheckbox.addEventListener('change', function() {
        if (this.checked) {
          // 取消选中其他所有分类
          document.querySelectorAll('.category-checkbox').forEach(checkbox => {
            checkbox.checked = false;
          });
          filterCriteria.categories = [];
        }
        applyFiltersAndSort();
      });
      
      // 添加各个分类复选框
      categoriesList.forEach(category => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'form-check';
        
        const checkbox = document.createElement('input');
        checkbox.className = 'form-check-input category-checkbox';
        checkbox.type = 'checkbox';
        checkbox.id = `category-${category.id}`;
        checkbox.value = category.id;
        
        // 如果URL参数中指定了此分类，选中它
        if (activeCategoryId === category.id) {
          checkbox.checked = true;
          allCategoriesCheckbox.checked = false;
          filterCriteria.categories.push(category.id);
          
          // 更新面包屑和标题
          document.getElementById('breadcrumb-category').textContent = category.name;
          document.getElementById('product-list-title').textContent = category.name;
        }
        
        checkbox.addEventListener('change', function() {
          if (this.checked) {
            // 取消选中"全部分类"
            document.getElementById('category-all').checked = false;
            
            // 添加到筛选分类
            filterCriteria.categories.push(parseInt(this.value));
          } else {
            // 从筛选分类中移除
            const index = filterCriteria.categories.indexOf(parseInt(this.value));
            if (index !== -1) {
              filterCriteria.categories.splice(index, 1);
            }
            
            // 如果没有选中任何分类，自动选中"全部分类"
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

// 应用筛选和排序
function applyFiltersAndSort() {
  // 获取价格范围
  const minPrice = document.getElementById('price-min').value;
  const maxPrice = document.getElementById('price-max').value;
  filterCriteria.priceMin = minPrice ? parseFloat(minPrice) : null;
  filterCriteria.priceMax = maxPrice ? parseFloat(maxPrice) : null;
  
  // 获取评分筛选
  const ratingValue = document.querySelector('input[name="rating-filter"]:checked').value;
  filterCriteria.rating = parseFloat(ratingValue);
  
  // 获取特惠筛选
  filterCriteria.onSale = document.getElementById('filter-sale').checked;
  
  // 应用筛选
  filteredProducts = productsList.filter(product => {
    // 分类筛选
    if (filterCriteria.categories.length > 0 && !filterCriteria.categories.includes(product.categoryId)) {
      return false;
    }
    
    // 价格筛选
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
    
    // 评分筛选
    if (filterCriteria.rating > 0 && product.rating < filterCriteria.rating) {
      return false;
    }
    
    // 特惠筛选
    if (filterCriteria.onSale && !product.onSale) {
      return false;
    }
    
    return true;
  });
  
  // 应用排序
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
      // 假设产品ID越大越新
      filteredProducts.sort((a, b) => b.id - a.id);
      break;
    case 'featured':
    default:
      // 保持原顺序或根据某些特征排序
      break;
  }
  
  // 更新产品计数
  document.getElementById('product-count').textContent = `Showing ${filteredProducts.length} products`;
  
  // 显示分页后的产品
  displayPaginatedProducts();
  
  // 更新分页控件
  updatePagination();
}

// 重置筛选器
function resetFilters() {
  // 重置分类
  document.getElementById('category-all').checked = true;
  document.querySelectorAll('.category-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });
  filterCriteria.categories = [];
  
  // 重置价格
  document.getElementById('price-min').value = '';
  document.getElementById('price-max').value = '';
  filterCriteria.priceMin = null;
  filterCriteria.priceMax = null;
  
  // 重置评分
  document.getElementById('rating-all').checked = true;
  filterCriteria.rating = 0;
  
  // 重置特惠
  document.getElementById('filter-sale').checked = false;
  filterCriteria.onSale = false;
  
  // 重置排序
  document.getElementById('sort-select').value = 'featured';
  
  // 重置分页
  currentPage = 1;
  
  // 更新产品显示
  applyFiltersAndSort();
  
  // 更新面包屑和标题
  if (activeCategoryId) {
    activeCategoryId = null;
    document.getElementById('breadcrumb-category').textContent = 'All Products';
    document.getElementById('product-list-title').textContent = 'All Products';
    
    // 移除URL参数
    const url = new URL(window.location);
    url.searchParams.delete('category');
    window.history.replaceState({}, '', url);
  }
}

// 初始化筛选器折叠功能
function initializeFilterAccordion() {
  const filterTitles = document.querySelectorAll('.filter-group-title');
  
  filterTitles.forEach(title => {
    title.addEventListener('click', function() {
      const content = this.nextElementSibling;
      
      // 切换箭头方向
      const arrow = this.querySelector('i');
      arrow.classList.toggle('bi-chevron-down');
      arrow.classList.toggle('bi-chevron-up');
      
      // 切换内容显示
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
} 