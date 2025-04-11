// Manages user profile data, addresses, and security settings


// Variables to store user data
let currentUser = null;
let userAddresses = [];

// Initialize profile page
document.addEventListener('DOMContentLoaded', function() {
  console.log('Profile page initialized');
  
  // Wait for page layout to be completely loaded
  setTimeout(function() {
    loadUserProfile();
    setupEventListeners();
  }, 300);
});

function setupUIFirst() {
  displayLoadingState();
  setupEventListeners();
}


function displayLoadingState() {
  
  currentUser = {
    id: 0,
    name: 'Loading...',
    email: '...',
    role: 'user'
  };
  
  displayUserData();
}

// Load user profile data 
function loadUserProfile() {
  console.log('Loading user profile data - improved flow...');
  
  fetch(`${config.apiUrl}/auth.php?action=status`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store'
    }
  })
  .then(response => response.json())
  .then(statusData => {
    console.log('Auth status response:', statusData);
    
    // check if user is logged in
    if (!statusData.success || !statusData.data || !statusData.data.isLoggedIn) {
      console.warn('User is not logged in according to auth.php status check');
      showLoginPrompt();
      return;
    }
    
    // user is logged in, get the user ID to display
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('id');
    
    // get the current logged in user ID
    const currentUserId = statusData.data.user.id;
    console.log(`Current logged in user ID: ${currentUserId}`);
    
    // decide which user's profile to get
    // if there is a ID parameter and it is not the current user, check if it is an admin
    let targetUserId = currentUserId;
    const isAdmin = statusData.data.user.isAdmin;
    
    console.log('Admin status from auth.php:', {
      isAdmin: isAdmin,
      userData: statusData.data.user
    });
    
    if (urlUserId && urlUserId !== currentUserId.toString()) {
      if (isAdmin) {
        // admin can view any user
        targetUserId = urlUserId;
        console.log(`Admin viewing profile for user ID: ${targetUserId}`);
      } else {
        // non-admin can only view their own profile
        console.warn(`Non-admin attempting to view other user's profile. Redirecting to own profile.`);
        if (window.location.search !== `?id=${currentUserId}`) {
          window.location.href = `profile.html?id=${currentUserId}`;
          return;
        }
      }
    }
    
    // try to use the user data from the auth status check
    if (targetUserId == currentUserId) {
      console.log('Using user data from auth status check');
      // directly use the user data from auth.php
      const userData = statusData.data.user;
      
      // ensure the admin status is set correctly
      const isUserAdmin = userData.isAdmin === true;
      console.log('Setting user admin status:', {
        originalIsAdmin: userData.isAdmin,
        convertedIsAdmin: isUserAdmin,
        user: userData
      });
      
      currentUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        name: userData.name,
        avatar: userData.avatar,
        birthday: userData.birthday,
        gender: userData.gender,
        role: isUserAdmin ? 'admin' : 'user',
        is_admin: isUserAdmin,
        created_at: userData.joinDate
      };
      
      // display the user data
      displayUserData();
      
      
      if (isUserAdmin) {
        console.log('User is admin - showing admin tab and dashboard button');
        
        // display the admin tab and dashboard button
        const adminTabContainer = document.getElementById('admin-tab-container');
        if (adminTabContainer) {
          adminTabContainer.style.display = 'block';
          loadAdminSections();
        } else {
          console.warn('Admin tab container element not found');
        }
        
        // display the admin dashboard button
        const adminDashboardBtnContainer = document.getElementById('admin-dashboard-btn-container');
        if (adminDashboardBtnContainer) {
          console.log('Found admin dashboard button container - setting to display:block');
          adminDashboardBtnContainer.style.display = 'block';
          
          // add some highlighted styles
          adminDashboardBtnContainer.classList.add('p-3', 'bg-light', 'rounded', 'mb-3');
        } else {
          console.warn('Admin dashboard button container element not found');
        }
      } else {
        console.log('User is NOT admin - hiding admin elements');
      }
      
      return;
    }
    
    //view other user's profile
    console.log(`Fetching profile for user ID: ${targetUserId}`);
    fetch(`${config.apiUrl}/users.php?action=get_user&id=${targetUserId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })
    .then(response => {
      console.log(`API Response: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(userData => {
      console.log('User data response:', userData);
      
      if (userData.success && userData.data) {
        // successfully get the data
        currentUser = userData.data;
        displayUserData();
        
      } else {
        throw new Error(userData.message || 'Failed to load user data');
      }
    })
    .catch(error => {
      console.error('Error fetching other user profile:', error);
      showToast(`Error: ${error.message}`, 'error');
    });
  })
  .catch(error => {
    console.error('Auth status check error:', error);
    showLoginPrompt();
  });
}

// display login prompt
function showLoginPrompt() {
  console.log('Displaying login prompt');
  
  // find the profile-container element
  const container = document.getElementById('profile-container');
  if (container) {
    container.innerHTML = `
      <div class="alert alert-warning text-center p-4 my-4">
        <h4><i class="bi bi-exclamation-triangle me-2"></i>Login Required</h4>
        <p>You need to log in to view this profile.</p>
        <a href="${config.baseUrl}/public/views/auth/login.html" class="btn btn-primary">
          Log in
        </a>
      </div>
    `;
  } else {
    // if the container is not found, use toast
    showToast('Please log in to view this profile', 'warning');
    // 2 seconds later redirect to login page
    setTimeout(() => {
      window.location.href = `${config.baseUrl}/public/views/auth/login.html`;
    }, 2000);
  }
}

// use default user data
function useDefaultUserData() {
  console.log('Using default user data for display');
  
  currentUser = {
    id: 0,
    name: 'Guest User',
    username: 'guest',
    email: 'guest@example.com',
    role: 'user',
    created_at: new Date().toISOString()
  };
  
  displayUserData();
  loadUserAddresses(); // display mock address data
}

// Display user data in profile
function displayUserData() {
  
  // split name - only split from the name field
  let firstName = '';
  let lastName = '';
  let fullName = '';

  if (currentUser.name && currentUser.name.trim() !== '') {
    fullName = currentUser.name.trim();
    
    // 拆分name为first_name和last_name
    const nameParts = fullName.split(' ');
    if (nameParts.length > 0) {
      firstName = nameParts[0];
      if (nameParts.length > 1) {
        lastName = nameParts.slice(1).join(' ');
      }
    }
    
    currentUser.first_name = firstName;
    currentUser.last_name = lastName;
    
    console.log('Name split into:', { firstName, lastName });
  } else {
    console.warn('No name field available for splitting');
  }
  
  // Update profile
  const userFullName = document.getElementById('user-full-name');
  if (userFullName) {
    userFullName.textContent = fullName || '';
  }
  
  const userEmail = document.getElementById('user-email');
  if (userEmail) {
    userEmail.textContent = currentUser.email || '';
  }
  
  const joinDate = document.getElementById('join-date');
  if (joinDate && currentUser.created_at) {
    const date = new Date(currentUser.created_at);
    joinDate.textContent = date.toLocaleDateString();
  }
  
  // update details area 
  const firstNameElement = document.getElementById('first-name');
  if (firstNameElement) {
    firstNameElement.textContent = firstName || 'Not set';
    console.log('Setting first-name display to:', firstName || 'Not set');
  }
  
  const lastNameElement = document.getElementById('last-name');
  if (lastNameElement) {
    lastNameElement.textContent = lastName || 'Not set';
    console.log('Setting last-name display to:', lastName || 'Not set');
  }
  
  const emailDisplay = document.getElementById('email-display');
  if (emailDisplay) {
    emailDisplay.textContent = currentUser.email || '';
  }
  
  const birthdayDisplay = document.getElementById('birthday-display');
  if (birthdayDisplay) {
    if (currentUser.birthday) {
      const date = new Date(currentUser.birthday);
      birthdayDisplay.textContent = date.toLocaleDateString();
    } else {
      birthdayDisplay.textContent = 'Not set';
    }
  }
  
  const genderDisplay = document.getElementById('gender-display');
  if (genderDisplay) {
    genderDisplay.textContent = currentUser.gender || 'Not set';
  }
  
  // update avatar
  const profileImg = document.getElementById('profile-img');
  if (profileImg) {
    // avatar > image_url
    if (currentUser.avatar?.startsWith('http')) {
      profileImg.src = currentUser.avatar;
    } else if (/^[a-zA-Z0-9+/=]+$/.test(currentUser.avatar)) {
      profileImg.src = 'data:image/jpeg;base64,' + currentUser.avatar;
    } else {
      // other cases try to use as URL
      profileImg.src = currentUser.avatar;
    }
    } else if (currentUser.image_url) {
      profileImg.src = currentUser.image_url;
    }
  }
  
  // check if the user is an admin, show/hide the admin dashboard button
  const adminDashboardBtnContainer = document.getElementById('admin-dashboard-btn-container');
  if (adminDashboardBtnContainer) {
    // check if the user is an admin
    const isAdmin = currentUser.role === 'admin' || currentUser.is_admin === true;
    console.log('Admin status check in displayUserData:', {
      role: currentUser.role,
      is_admin: currentUser.is_admin,
      isAdmin: isAdmin,
      userData: currentUser
    });
    adminDashboardBtnContainer.style.display = isAdmin ? 'block' : 'none';

    if(isAdmin) {
      adminDashboardBtnContainer.style.display = 'block';
      
      // ensure the button is visible
      const parentElement = adminDashboardBtnContainer.parentElement;
      if (parentElement) {
        parentElement.insertBefore(adminDashboardBtnContainer, parentElement.firstChild);
        
        // add some highlighted styles
        adminDashboardBtnContainer.classList.add('p-3', 'bg-light', 'rounded', 'mb-3');
        
        setTimeout(() => {
          console.log('Admin button visibility:', adminDashboardBtnContainer.offsetParent !== null);
          console.log('Admin button computed style:', window.getComputedStyle(adminDashboardBtnContainer).display);
        }, 1000);
      }
    }
  }
  
  // update edit form fields
  const firstNameInput = document.getElementById('firstName');
  if (firstNameInput) {
    firstNameInput.value = firstName;
  }
  
  const lastNameInput = document.getElementById('lastName');
  if (lastNameInput) {
    lastNameInput.value = lastName;
  }
  
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.value = currentUser.email || '';
  }
  
  // birthday field
  const birthdayInput = document.getElementById('birthday');
  if (birthdayInput && currentUser.birthday) {
    try {
      // ensure the format is YYYY-MM-DD
      let birthdayValue = currentUser.birthday;
      
      if (!birthdayValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(birthdayValue);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          birthdayValue = `${year}-${month}-${day}`;
        }
      }
      
      birthdayInput.value = birthdayValue;
    } catch (error) {
      console.error('Error formatting birthday:', error);
    }
  }
  
  // gender radio button
  if (currentUser.gender) {
    const genderRadio = document.querySelector(`input[name="gender"][value="${currentUser.gender}"]`);
    if (genderRadio) {
      genderRadio.checked = true;
    }
  }

// Setup event listeners
function setupEventListeners() {
  // Avatar upload - 确保元素存在且事件处理正确
  setupAvatarUpload();
  
  // Save profile button
  const saveProfileBtn = document.getElementById('save-profile');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', updateUserProfile);
  }
  
  // Save address button
  const saveAddressBtn = document.getElementById('save-address');
  if (saveAddressBtn) {
    saveAddressBtn.addEventListener('click', saveAddress);
  }
  
  // Update address button
  const updateAddressBtn = document.getElementById('update-address');
  if (updateAddressBtn) {
    updateAddressBtn.addEventListener('click', updateAddress);
  }
  
  // Change password form
  const changePasswordForm = document.getElementById('change-password-form');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', changePassword);
  }
}

// 设置头像上传按钮和事件
function setupAvatarUpload() {
  const avatarUpload = document.getElementById('avatar-upload');
  if (!avatarUpload) {
    console.warn('Avatar upload input not found');
    return;
  }
  
  // 添加事件监听器
  avatarUpload.addEventListener('change', handleAvatarUpload);
  
  // 设置头像点击触发上传
  const avatarOverlay = document.querySelector('.avatar-overlay');
  if (avatarOverlay) {
    avatarOverlay.addEventListener('click', function() {
      console.log('Avatar overlay clicked');
      avatarUpload.click();
    });
  } else {
    console.warn('Avatar overlay element not found');
  }
  
  // 设置直接点击头像也能触发上传
  const profileImg = document.getElementById('profile-img');
  if (profileImg && !avatarOverlay) {
    profileImg.style.cursor = 'pointer';
    profileImg.addEventListener('click', function() {
      console.log('Profile image clicked');
      avatarUpload.click();
    });
  }
}

// Handle avatar upload
function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  console.log('Avatar file selected:', file.name);
  
  // 验证文件类型
  if (!file.type.match('image.*')) {
    showToast('Please select an image file', 'error');
    return;
  }
  
  // 文件大小限制 (2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToast('Image size should be less than 2MB', 'error');
    return;
  }
  
  // Preview image
  const profileImg = document.getElementById('profile-img');
  if (profileImg) {
    const reader = new FileReader();
    reader.onload = e => {
      const base64Image = e.target.result;
      profileImg.src = base64Image;
      
      // 保存base64图片到服务器
      updateAvatarOnServer(base64Image);
    };
    reader.readAsDataURL(file);
  }
}

// 发送base64图片到服务器
function updateAvatarOnServer(base64Image) {
  console.log('Updating avatar on server with base64 data');
  
  // 准备数据
  const userData = {
    avatar: base64Image
  };
  
  // 调用API更新头像
  const userId = currentUser.id;
  fetch(`${config.apiUrl}/users.php?id=${userId}`, {
    method: 'PUT', 
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData),
    credentials: 'include'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(response => {
    console.log('Avatar update response:', response);
    if (response.success) {
      showToast('Profile photo updated successfully', 'success');
      
      // 更新用户数据
      if (response.data) {
        currentUser = response.data;
      } else {
        currentUser.avatar = base64Image;
      }
    } else {
      throw new Error(response.message || 'Failed to update profile photo');
    }
  })
  .catch(error => {
    console.error('Error uploading avatar:', error);
    showToast('Error uploading profile photo. Please try again.', 'error');
  });
}

// Update user profile
function updateUserProfile() {
  // Get form values
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const birthday = document.getElementById('birthday').value;
  const genderEl = document.querySelector('input[name="gender"]:checked');
  const gender = genderEl ? genderEl.value : null;
  
  // Validation
  if (!firstName) {
    showError('profile-error', 'Please enter your first name');
    return;
  }
  
  if (!email || !isValidEmail(email)) {
    showError('profile-error', 'Please enter a valid email address');
    return;
  }
  
  // 构建name字段 - 始终由first_name和last_name组合而成
  const name = lastName ? `${firstName} ${lastName}` : firstName;
  console.log('Constructed name field:', name);
  
  // Create user data object, 明确只发送name字段
  const userData = {
    name: name,
    email: email,
    birthday: birthday || null,
    gender: gender || null
  };
  
  console.log('Updating profile with data:', userData);
  
  // Call API to update profile
  const userId = currentUser.id;
  const updateUrl = `${config.apiUrl}/users.php?id=${userId}`;
  
  fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData),
    credentials: 'include'
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(response => {
      console.log('Profile update response:', response);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update profile');
      }
      
      // Update current user data with the response data or our sent data
      if (response.data) {
        // 服务器返回了更新后的用户数据
        currentUser = response.data;
      } else {
        // 服务器没有返回数据，使用我们发送的数据更新
        Object.assign(currentUser, userData);
      }
      
      // Update display
      displayUserData();
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
      if (modal) {
        modal.hide();
      }
      
      // Show success message
      showToast('Profile updated successfully', 'success');
    })
    .catch(error => {
      console.error('Error updating profile:', error);
      showError('profile-error', error.message || 'Error updating profile. Please try again.');
    });
}

// Change password
function changePassword(event) {
  event.preventDefault();
  
  // Get form values
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    showError('password-error', 'Please fill in all password fields');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showError('password-error', 'New passwords do not match');
    return;
  }
  
  if (newPassword.length < 8) {
    showError('password-error', 'New password must be at least 8 characters');
    return;
  }
  
  // Create password change data
  const passwordData = {
    current_password: currentPassword,
    new_password: newPassword
  };
  
  // Call users.php to change password
  const passwordUrl = `${config.apiUrl}/users.php?action=change_password`;
  
  fetch(passwordUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(passwordData),
    credentials: 'include'
  })
    .then(response => {
      return response.json().then(data => {
        if (!response.ok) {
          data.status = response.status;
          throw data;
        }
        return data;
      });
    })
    .then(response => {
      if (!response.success) {
        throw new Error(response.message || 'Failed to change password');
      }
      
      // Clear form
      document.getElementById('current-password').value = '';
      document.getElementById('new-password').value = '';
      document.getElementById('confirm-password').value = '';
      
      // Hide error
      hideError('password-error');
      
      // Show success message
      showToast('Password changed successfully', 'success');
    })
    .catch(error => {
      console.error('Error changing password:', error);
      
      // 显示服务器返回的错误消息或通用错误
      const errorMessage = error.message || 'Error changing password. Please try again.';
      showError('password-error', errorMessage);
    });
}

// Address functions (placeholder implementations)
function saveAddress() {
  showToast('Address function not implemented', 'info');
}

function editAddress(addressId) {
  showToast(`Edit address ${addressId} - not implemented`, 'info');
}

function updateAddress() {
  showToast('Address update not implemented', 'info');
}

function deleteAddress(addressId) {
  showToast(`Delete address ${addressId} - not implemented`, 'info');
}

function setDefaultAddress(addressId) {
  showToast(`Set default address ${addressId} - not implemented`, 'info');
}

// Admin sections (placeholders)
function loadAdminSections() {
  console.log('Loading admin sections');
  loadProductsForAdmin();
  loadUsersForAdmin();
}

function loadProductsForAdmin() {
  // Implementation for loading products in admin view
  const productTableBody = document.getElementById('productTableBody');
  if (productTableBody) {
    productTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading products...</td></tr>';
  }
}

function loadUsersForAdmin() {
  // Implementation for loading users in admin view
  const userTableBody = document.getElementById('userTableBody');
  if (userTableBody) {
    userTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading users...</td></tr>';
  }
}

// Helper functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('d-none');
  }
}

function hideError(elementId) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.classList.add('d-none');
  }
}


// Expose functions to global scope
window.editAddress = editAddress;
window.deleteAddress = deleteAddress;
window.setDefaultAddress = setDefaultAddress; 