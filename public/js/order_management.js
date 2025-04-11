// Order Management Script
let ordersList = [];
let orderCurrentPage = 1;
let ordersPerPage = 10;
let totalOrders = 0;
let activeStatus = '';
let searchQuery = '';
let sortOption = 'newest';

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in and is admin
  checkAdminAccess();
  
  // Load layout components
  if (typeof loadLayoutComponents === 'function') {
    loadLayoutComponents();
  }
  
  // Initial orders loading
  loadOrders();
  
  // Add event listeners
  document.getElementById('search-button').addEventListener('click', performSearch);
  document.getElementById('order-search').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
  
  // Status filter
  document.getElementById('status-filter').addEventListener('change', function() {
    activeStatus = this.value;
    orderCurrentPage = 1; // Reset to first page
    loadOrders();
  });
  
  // Sort options
  document.getElementById('sort-by').addEventListener('change', function() {
    sortOption = this.value;
    loadOrders();
  });
  
  // Update order button
  document.getElementById('update-order-btn').addEventListener('click', updateOrderStatus);
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

// Load orders
function loadOrders() {
  // Show loading indicator
  const ordersTable = document.getElementById('orders-table');
  ordersTable.innerHTML = '<tr><td colspan="6" class="text-center">Loading orders...</td></tr>';
  
  // Prepare API params
  const params = {
    limit: ordersPerPage,
    offset: (orderCurrentPage - 1) * ordersPerPage
  };
  
  // Add status filter if selected
  if (activeStatus) {
    params.status = activeStatus;
  }
  
  // Add search query if any
  if (searchQuery) {
    params.search = searchQuery;
  }
  
  // Add sort option
  if (sortOption) {
    params.sort = sortOption;
  }
  
  // Use API client to get orders
  api.orders.getAllOrders(params)
    .then(res => {
      if (res.success && res.data) {
        // Store orders
        ordersList = res.data.orders || [];
        totalOrders = res.data.pagination ? res.data.pagination.total : 0;
        
        // Display orders
        displayOrders();
        
        // Update pagination
        updatePagination();
      } else {
        console.error('Failed to load orders:', res.message);
        ordersTable.innerHTML = `<tr><td colspan="6" class="text-center text-danger">
          Failed to load orders: ${res.message || 'Unknown error'}
        </td></tr>`;
      }
    })
    .catch(error => {
      console.error('Error loading orders:', error);
      let errorMessage = error.message || 'Unknown error';
      
      if (error.message && error.message.includes('404')) {
        errorMessage = 'Order API endpoint not found. This feature may not be implemented yet.';
      }
      
      ordersTable.innerHTML = `<tr><td colspan="6" class="text-center text-danger">
        Error loading orders: ${errorMessage}
      </td></tr>`;
    });
}

// Display orders in table
function displayOrders() {
  const ordersTable = document.getElementById('orders-table');
  
  // Clear existing rows
  ordersTable.innerHTML = '';
  
  if (ordersList.length === 0) {
    ordersTable.innerHTML = '<tr><td colspan="6" class="text-center">No orders found</td></tr>';
    return;
  }
  
  // Add order rows
  ordersList.forEach(order => {
    const row = document.createElement('tr');
    
    // Format date
    const orderDate = order.created_at ? new Date(order.created_at) : new Date();
    const formattedDate = orderDate.toLocaleDateString() + ' ' + orderDate.toLocaleTimeString();
    
    // Get status badge class
    let statusClass = 'bg-secondary';
    switch (order.status) {
      case 'pending':
        statusClass = 'bg-warning text-dark';
        break;
      case 'processing':
        statusClass = 'bg-info text-dark';
        break;
      case 'shipped':
        statusClass = 'bg-primary';
        break;
      case 'delivered':
        statusClass = 'bg-success';
        break;
      case 'cancelled':
        statusClass = 'bg-danger';
        break;
    }
    
    // Format customer name
    const customerName = order.user_name || order.username || 'Guest';
    
    // Create row content
    row.innerHTML = `
      <td>${order.order_number}</td>
      <td>${formattedDate}</td>
      <td>${customerName}</td>
      <td>$${parseFloat(order.total_amount).toFixed(2)}</td>
      <td><span class="badge ${statusClass}">${order.status}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewOrderDetails(${order.id})">
          <i class="bi bi-eye"></i> View
        </button>
      </td>
    `;
    
    ordersTable.appendChild(row);
  });
}

// Update pagination
function updatePagination() {
  const totalPages = Math.ceil(totalOrders / ordersPerPage);
  const paginationElement = document.getElementById('pagination');
  
  // Clear existing pagination
  paginationElement.innerHTML = '';
  
  // Previous button
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${orderCurrentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#" ${orderCurrentPage !== 1 ? 'onclick="goToPage(' + (orderCurrentPage - 1) + '); return false;"' : ''}>Previous</a>`;
  paginationElement.appendChild(prevLi);
  
  // Page numbers
  const startPage = Math.max(1, orderCurrentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageLi = document.createElement('li');
    pageLi.className = `page-item ${i === orderCurrentPage ? 'active' : ''}`;
    pageLi.innerHTML = `<a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>`;
    paginationElement.appendChild(pageLi);
  }
  
  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${orderCurrentPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#" ${orderCurrentPage !== totalPages ? 'onclick="goToPage(' + (orderCurrentPage + 1) + '); return false;"' : ''}>Next</a>`;
  paginationElement.appendChild(nextLi);
}

// Go to specified page
function goToPage(pageNumber) {
  orderCurrentPage = pageNumber;
  loadOrders();
}

// Perform search
function performSearch() {
  searchQuery = document.getElementById('order-search').value.trim();
  orderCurrentPage = 1; // Reset to first page
  loadOrders();
}

// View order details
function viewOrderDetails(orderId) {
  // Find order in list
  const order = ordersList.find(o => o.id === orderId);
  
  if (!order) {
    console.error('Order not found:', orderId);
    return;
  }
  
  // Populate modal fields
  document.getElementById('detail-order-number').textContent = order.order_number;
  
  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  document.getElementById('detail-date').textContent = orderDate.toLocaleString();
  
  document.getElementById('detail-customer').textContent = order.user_name || order.username || 'Guest';
  
  // Set status badge
  const statusElement = document.getElementById('detail-status');
  statusElement.textContent = order.status;
  
  let statusClass = 'bg-secondary';
  switch (order.status) {
    case 'pending':
      statusClass = 'bg-warning text-dark';
      break;
    case 'processing':
      statusClass = 'bg-info text-dark';
      break;
    case 'shipped':
      statusClass = 'bg-primary';
      break;
    case 'delivered':
      statusClass = 'bg-success';
      break;
    case 'cancelled':
      statusClass = 'bg-danger';
      break;
  }
  
  // Update status badge class
  statusElement.className = `badge ${statusClass}`;
  
  // Set amount
  document.getElementById('detail-amount').textContent = parseFloat(order.total_amount).toFixed(2);
  
  // Set payment method
  document.getElementById('detail-payment').textContent = order.payment_method || 'Credit Card';
  
  // Set shipping address
  const shippingAddress = document.getElementById('detail-shipping');
  if (order.shipping_address) {
    shippingAddress.innerHTML = formatAddress(order.shipping_address);
  } else {
    shippingAddress.textContent = 'No shipping address provided';
  }
  
  // Set billing address
  const billingAddress = document.getElementById('detail-billing');
  if (order.billing_address) {
    billingAddress.innerHTML = formatAddress(order.billing_address);
  } else {
    billingAddress.textContent = 'No billing address provided';
  }
  
  // Populate order items
  const itemsContainer = document.getElementById('detail-items');
  itemsContainer.innerHTML = '';
  
  if (order.items && order.items.length > 0) {
    order.items.forEach(item => {
      const itemRow = document.createElement('div');
      itemRow.className = 'order-item-row d-flex align-items-center py-2';
      
      // Create item content
      itemRow.innerHTML = `
        <div class="me-3">
          <img src="${item.image || '../../images/placeholder.jpg'}" class="order-item-thumbnail" alt="${item.name}">
        </div>
        <div class="flex-grow-1">
          <div class="fw-bold">${item.name}</div>
          <div class="text-muted">Qty: ${item.quantity} × $${parseFloat(item.price).toFixed(2)}</div>
        </div>
        <div class="fw-bold">
          $${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}
        </div>
      `;
      
      itemsContainer.appendChild(itemRow);
    });
  } else {
    itemsContainer.innerHTML = '<p class="text-muted">No items found for this order</p>';
  }
  
  // Set customer notes
  document.getElementById('detail-notes').textContent = order.notes || 'No notes provided';
  
  // Set admin notes
  document.getElementById('admin-notes').value = order.admin_notes || '';
  
  // Set selected status in dropdown
  document.getElementById('update-status').value = order.status;
  
  // Store order ID for update
  document.getElementById('update-order-btn').setAttribute('data-order-id', orderId);
  
  // Show modal
  const orderDetailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
  orderDetailsModal.show();
}

// Format address for display
function formatAddress(address) {
  if (typeof address === 'string') {
    // If address is already a formatted string
    return address.replace(/\n/g, '<br>');
  }
  
  // If address is an object
  let formattedAddress = '';
  if (address.name) formattedAddress += address.name + '<br>';
  if (address.line1) formattedAddress += address.line1 + '<br>';
  if (address.line2) formattedAddress += address.line2 + '<br>';
  if (address.city) {
    formattedAddress += address.city;
    if (address.state) formattedAddress += ', ' + address.state;
    if (address.postal_code) formattedAddress += ' ' + address.postal_code;
    formattedAddress += '<br>';
  }
  if (address.country) formattedAddress += address.country;
  
  return formattedAddress || 'No address provided';
}

// Update order status
function updateOrderStatus() {
  const orderId = document.getElementById('update-order-btn').getAttribute('data-order-id');
  const newStatus = document.getElementById('update-status').value;
  const adminNotes = document.getElementById('admin-notes').value;
  
  if (!orderId) {
    console.error('No order ID found for update');
    return;
  }
  
  // Use API client to update order status
  api.orders.updateOrderStatus(orderId, newStatus, adminNotes)
    .then(res => {
      if (res.success) {
        // Close modal
        const orderDetailsModal = bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'));
        orderDetailsModal.hide();
        
        // Reload orders
        loadOrders();
        
        // Show success message
        alert('Order updated successfully');
      } else {
        throw new Error(res.message || 'Failed to update order');
      }
    })
    .catch(error => {
      console.error('Error updating order:', error);
      
      if (error.message && error.message.includes('404')) {
        alert('Order update API not implemented yet. Status changes will not be saved.');
      } else {
        alert('Error updating order: ' + error.message);
      }
    });
}

// Make functions available globally
window.goToPage = goToPage;
window.viewOrderDetails = viewOrderDetails;
