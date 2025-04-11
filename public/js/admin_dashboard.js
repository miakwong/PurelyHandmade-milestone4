// Admin Dashboard Script
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in and is admin
  checkAdminAccess();
  
  // Load layout components
  if (typeof loadLayoutComponents === 'function') {
    loadLayoutComponents();
  }
  
  // Load dashboard data
  loadDashboardData();
});

// Check admin access
function checkAdminAccess() {
  api.auth.checkLoginStatus()
    .then(res => {
      if (!res.success || !res.data.isLoggedIn || !res.data.user.isAdmin) {
        // Redirect to login if not logged in or not admin
        window.location.href = "../../index.html";
      } else {
        // Display admin name
        document.getElementById('admin-name').textContent = res.data.user.username;
      }
    })
    .catch(error => {
      console.error('Error checking admin access:', error);
      window.location.href = "../../index.html";
    });
}

// Load dashboard data
function loadDashboardData() {
  // Load user count
  fetchUserCount();
  
  // Load product count
  fetchProductCount();
  
  // Load review count
  fetchReviewCount();
  
  // Load order count
  fetchOrderCount();
}

// Fetch user count
function fetchUserCount() {
  api.users.getUsers()
    .then(res => {
      if (res.success && res.data && res.data.pagination) {
        document.getElementById('user-count').textContent = res.data.pagination.total || 0;
      }
    })
    .catch(error => {
      console.error('Error fetching user count:', error);
      document.getElementById('user-count').textContent = 'Error';
    });
}

// Fetch product count
function fetchProductCount() {
  api.products.getProducts()
    .then(res => {
      if (res.success && res.data) {
        document.getElementById('product-count').textContent = res.data.length || 0;
      }
    })
    .catch(error => {
      console.error('Error fetching product count:', error);
      document.getElementById('product-count').textContent = 'Error';
    });
}

// Fetch review count - Note: This API might need to be implemented
function fetchReviewCount() {
  // Use apiUrl to ensure consistency with other API calls
  fetch(api.apiUrl('product_reviews.php') + '?action=count')
    .then(response => {
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        document.getElementById('review-count').textContent = data.data || 0;
      } else {
        throw new Error(data.message || 'Failed to load review count');
      }
    })
    .catch(error => {
      console.error('Error fetching review count:', error);
      document.getElementById('review-count').textContent = 'Error';
    });
}

// Fetch order count - Note: This API might need to be implemented
function fetchOrderCount() {
  // Use apiUrl to ensure consistency with other API calls
  fetch(api.apiUrl('orders.php') + '?action=count')
    .then(response => {
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        document.getElementById('order-count').textContent = data.data || 0;
      } else {
        throw new Error(data.message || 'Failed to load order count');
      }
    })
    .catch(error => {
      console.error('Error fetching order count:', error);
      document.getElementById('order-count').textContent = 'Error';
    });
} 