// User Management Script
let usersList = [];
let userCurrentPage = 1;
let usersPerPage = 10;
let totalUsers = 0;
let activeFilter = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in and is admin
  checkAdminAccess();
  
  // Load layout components
  if (typeof loadLayoutComponents === 'function') {
    loadLayoutComponents();
  }
  
  // Initial users loading
  loadUsers();
  
  // Add event listeners
  document.getElementById('search-button').addEventListener('click', performSearch);
  document.getElementById('user-search').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
  
  // Filter buttons
  document.getElementById('filter-all').addEventListener('click', function() {
    setActiveFilter('all');
  });
  
  document.getElementById('filter-admin').addEventListener('click', function() {
    setActiveFilter('admin');
  });
  
  document.getElementById('filter-user').addEventListener('click', function() {
    setActiveFilter('user');
  });
  
  // Save user changes button
  document.getElementById('save-user-changes').addEventListener('click', saveUserChanges);
  
  // Delete user button
  document.getElementById('confirm-delete-user').addEventListener('click', deleteUser);
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

// Load users
function loadUsers() {
  // Show loading indicator
  const usersTable = document.getElementById('users-table');
  usersTable.innerHTML = '<tr><td colspan="7" class="text-center">Loading users...</td></tr>';
  
  // Prepare API params
  const params = {
    limit: usersPerPage,
    offset: (userCurrentPage - 1) * usersPerPage
  };
  
  // Add search query if any
  if (searchQuery) {
    params.search = searchQuery;
  }
  
  // First check admin status to make sure we have permissions
  api.auth.checkLoginStatus()
    .then(status => {
      if (!status.success || !status.data || !status.data.isLoggedIn) {
        console.error('Not logged in. Redirecting to login page.');
        window.location.href = "../../index.html";
        return Promise.reject('Not logged in');
      }
      
      if (!status.data.user || !status.data.user.isAdmin) {
        console.error('User is not an admin. Redirecting to login page.');
        window.location.href = "../../index.html";
        return Promise.reject('Not admin');
      }
      
      console.log('Admin status confirmed, loading users...');
      
      // Make the API call with error handling for fetch itself
      return fetch(api.apiUrl('users.php') + '?' + new URLSearchParams(params).toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }).then(response => {
        // Log the raw response for debugging
        return response.text().then(text => {
          console.log('Raw API response:', text);
          
          try {
            // Try to parse the response as JSON
            const data = JSON.parse(text);
            return data;
          } catch (e) {
            console.error('JSON parse error:', e, 'Raw response was:', text);
            throw new Error('Invalid response format');
          }
        });
      });
    })
    .then(res => {
      if (res.success && res.data) {
        // Store users and total count
        usersList = res.data.users || [];
        totalUsers = res.data.pagination ? res.data.pagination.total : 0;
        
        // Apply filtering if needed
        if (activeFilter !== 'all') {
          usersList = usersList.filter(user => {
            if (activeFilter === 'admin') {
              return user.is_admin || user.role === 'admin';
            } else {
              return !user.is_admin && user.role !== 'admin';
            }
          });
        }
        
        // Display users
        displayUsers();
        
        // Update pagination
        updatePagination();
      } else {
        console.error('Failed to load users:', res.message);
        usersTable.innerHTML = `<tr><td colspan="7" class="text-center text-danger">
          Failed to load users: ${res.message || 'Unknown error'}
        </td></tr>`;
      }
    })
    .catch(error => {
      console.error('Error loading users:', error);
      let errorMessage = error.message || 'Unknown error';
      
      // Add specific handling for 403 errors
      if (error.message && error.message.includes('403')) {
        errorMessage = 'Permission denied. Please make sure you are logged in as an administrator.';
        // Attempt to re-authenticate
        setTimeout(() => {
          checkAdminAccess();
        }, 1000);
      } else if (error.message && error.message.includes('Invalid response format')) {
        errorMessage = 'Server returned invalid data. Please contact the administrator.';
      }
      
      usersTable.innerHTML = `<tr><td colspan="7" class="text-center text-danger">
        Error loading users: ${errorMessage}
      </td></tr>`;
    });
}

// Display users
function displayUsers() {
  const usersTable = document.getElementById('users-table');
  
  // Clear existing rows
  usersTable.innerHTML = '';
  
  if (usersList.length === 0) {
    usersTable.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
    return;
  }
  
  // Add user rows
  usersList.forEach(user => {
    const row = document.createElement('tr');
    
    // Format date
    const joinDate = user.created_at ? new Date(user.created_at) : new Date();
    const formattedDate = joinDate.toLocaleDateString();
    
    // Create row content
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.name || ''}</td>
      <td>
        <span class="badge ${user.is_admin || user.role === 'admin' ? 'bg-primary' : 'bg-secondary'}">
          ${user.is_admin || user.role === 'admin' ? 'Admin' : 'User'}
        </span>
      </td>
      <td>${formattedDate}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser(${user.id})">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteUser(${user.id}, '${user.username}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    
    usersTable.appendChild(row);
  });
}

// Update pagination
function updatePagination() {
  const totalPages = Math.ceil(totalUsers / usersPerPage);
  const paginationElement = document.getElementById('pagination');
  
  // Clear existing pagination
  paginationElement.innerHTML = '';
  
  // Previous button
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${userCurrentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#" ${userCurrentPage !== 1 ? 'onclick="goToPage(' + (userCurrentPage - 1) + '); return false;"' : ''}>Previous</a>`;
  paginationElement.appendChild(prevLi);
  
  // Page numbers
  const startPage = Math.max(1, userCurrentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageLi = document.createElement('li');
    pageLi.className = `page-item ${i === userCurrentPage ? 'active' : ''}`;
    pageLi.innerHTML = `<a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>`;
    paginationElement.appendChild(pageLi);
  }
  
  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${userCurrentPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#" ${userCurrentPage !== totalPages ? 'onclick="goToPage(' + (userCurrentPage + 1) + '); return false;"' : ''}>Next</a>`;
  paginationElement.appendChild(nextLi);
}

// Go to specified page
function goToPage(pageNumber) {
  userCurrentPage = pageNumber;
  loadUsers();
}

// Perform search
function performSearch() {
  searchQuery = document.getElementById('user-search').value.trim();
  userCurrentPage = 1; // Reset to first page
  loadUsers();
}

// Set active filter
function setActiveFilter(filter) {
  activeFilter = filter;
  
  // Update active button
  document.querySelectorAll('#filter-all, #filter-admin, #filter-user').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.getElementById('filter-' + filter).classList.add('active');
  
  // Reload users with filter
  userCurrentPage = 1; // Reset to first page
  loadUsers();
}

// Edit user
function editUser(userId) {
  // Find user
  const user = usersList.find(u => u.id === userId);
  
  if (!user) {
    console.error('User not found:', userId);
    return;
  }
  
  // Populate form fields
  document.getElementById('edit-user-id').value = user.id;
  document.getElementById('edit-username').value = user.username;
  document.getElementById('edit-email').value = user.email;
  document.getElementById('edit-name').value = user.name || '';
  
  // Set role radio button
  if (user.is_admin || user.role === 'admin') {
    document.getElementById('edit-role-admin').checked = true;
  } else {
    document.getElementById('edit-role-user').checked = true;
  }
  
  // Clear password field
  document.getElementById('edit-password').value = '';
  
  // Show modal
  const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
  editUserModal.show();
}

// Save user changes
function saveUserChanges() {
  const userId = document.getElementById('edit-user-id').value;
  
  // Get form values
  const userData = {
    username: document.getElementById('edit-username').value,
    email: document.getElementById('edit-email').value,
    name: document.getElementById('edit-name').value,
    role: document.querySelector('input[name="edit-role"]:checked').value
  };
  
  // Add password if provided
  const password = document.getElementById('edit-password').value;
  if (password) {
    userData.password = password;
  }
  
  // Update user
  api.users.updateUserById(userId, userData)
    .then(res => {
      if (res.success) {
        // Hide modal
        const editUserModal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
        editUserModal.hide();
        
        // Reload users
        loadUsers();
        
        // Show success alert
        alert('User updated successfully');
      } else {
        console.error('Failed to update user:', res.message);
        alert('Failed to update user: ' + (res.message || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error updating user:', error);
      alert('Error updating user: ' + (error.message || 'Unknown error'));
    });
}

// Confirm delete user
function confirmDeleteUser(userId, username) {
  // Set delete user data
  document.getElementById('delete-user-name').textContent = username;
  
  // Set user ID to delete
  window.userIdToDelete = userId;
  
  // Show confirm modal
  const deleteUserModal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
  deleteUserModal.show();
}

// Delete user
function deleteUser() {
  const userId = window.userIdToDelete;
  
  if (!userId) {
    console.error('No user ID to delete');
    return;
  }
  
  // Delete user
  api.users.deleteUser(userId)
    .then(res => {
      if (res.success) {
        // Hide modal
        const deleteUserModal = bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'));
        deleteUserModal.hide();
        
        // Reload users
        loadUsers();
        
        // Show success alert
        alert('User deleted successfully');
      } else {
        console.error('Failed to delete user:', res.message);
        alert('Failed to delete user: ' + (res.message || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + (error.message || 'Unknown error'));
    });
  
  // Clear user ID
  window.userIdToDelete = null;
} 