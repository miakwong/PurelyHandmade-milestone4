/**
 * profile.js - Handle profile page functionality
 * Manages user profile data, addresses, and security settings
 */

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

// 首先设置UI，不依赖API数据
function setupUIFirst() {
  console.log('Setting up initial UI...');
  
  // 显示加载中的用户资料
  displayLoadingState();
  
  // 设置事件监听
  setupEventListeners();
  
  // 加载模拟的地址数据（不依赖API）
  loadUserAddresses();
}

// 显示加载状态
function displayLoadingState() {
  console.log('Displaying loading state...');
  
  // 创建一个默认用户对象
  currentUser = {
    id: 0,
    name: 'Loading...',
    email: '...',
    role: 'user'
  };
  
  // 显示默认数据
  displayUserData();
}

// Load user profile data - 改进版本
function loadUserProfile() {
  console.log('Loading user profile data - improved flow...');
  
  // 先验证登录状态，再获取用户资料
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
    
    // 检查用户是否已登录
    if (!statusData.success || !statusData.data || !statusData.data.isLoggedIn) {
      console.warn('User is not logged in according to auth.php status check');
      showLoginPrompt();
      return;
    }
    
    // 用户已登录，获取要显示的用户ID
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('id');
    
    // 获取当前登录用户ID
    const currentUserId = statusData.data.user.id;
    console.log(`Current logged in user ID: ${currentUserId}`);
    
    // 决定要获取哪个用户的资料
    // 如果URL中有ID参数且不是当前用户，检查是否是管理员
    let targetUserId = currentUserId;
    const isAdmin = statusData.data.user.isAdmin;
    
    if (urlUserId && urlUserId !== currentUserId.toString()) {
      if (isAdmin) {
        // 管理员可以查看任何用户
        targetUserId = urlUserId;
        console.log(`Admin viewing profile for user ID: ${targetUserId}`);
      } else {
        // 非管理员只能查看自己
        console.warn(`Non-admin attempting to view other user's profile. Redirecting to own profile.`);
        // 可以选择重定向或者继续显示自己的资料
        if (window.location.search !== `?id=${currentUserId}`) {
          window.location.href = `profile.html?id=${currentUserId}`;
          return;
        }
      }
    }
    
    // 尝试使用状态检查返回的用户数据
    if (targetUserId == currentUserId) {
      console.log('Using user data from auth status check');
      // 直接使用auth.php返回的用户数据
      const userData = statusData.data.user;
      currentUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        name: userData.name,
        avatar: userData.avatar,
        birthday: userData.birthday,
        gender: userData.gender,
        role: userData.isAdmin ? 'admin' : 'user',
        is_admin: userData.isAdmin,
        created_at: userData.joinDate
      };
      
      // 显示用户数据
      displayUserData();
      
      // 如果是管理员，显示管理员标签页
      if (userData.isAdmin) {
        const adminTabContainer = document.getElementById('admin-tab-container');
        if (adminTabContainer) {
          adminTabContainer.style.display = 'block';
          loadAdminSections();
        }
      }
      
      // 加载用户地址
      loadUserAddresses();
      return;
    }
    
    // 如果需要查看其他用户的资料，调用users.php
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
        // 成功获取数据
        currentUser = userData.data;
        displayUserData();
        
        // 加载用户地址
        loadUserAddresses();
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

// 显示登录提示
function showLoginPrompt() {
  console.log('Displaying login prompt');
  
  // 查找profile-container元素
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
    // 如果找不到容器，使用Toast
    showToast('Please log in to view this profile', 'warning');
    // 2秒后重定向到登录页
    setTimeout(() => {
      window.location.href = `${config.baseUrl}/public/views/auth/login.html`;
    }, 2000);
  }
}

// 使用默认用户数据
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
  loadUserAddresses(); // 显示模拟地址数据
}

// Display user data in profile
function displayUserData() {
  console.log('Displaying user data:', currentUser);
  
  // 拆分名字 - 只从name字段拆分
  let firstName = '';
  let lastName = '';
  let fullName = '';
  
  // 调试日志
  console.log('Name field before processing:', currentUser.name);
  
  // 只从name字段拆分名字，不使用备用选项
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
    
    // 将拆分结果回写到用户对象
    currentUser.first_name = firstName;
    currentUser.last_name = lastName;
    
    console.log('Name split into:', { firstName, lastName });
  } else {
    console.warn('No name field available for splitting');
  }
  
  // 更新基本信息区域
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
  
  // 更新详情区域 - 确保名字字段正确显示
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
  
  // 更新头像
  const profileImg = document.getElementById('profile-img');
  if (profileImg) {
    // 确定头像URL优先级: avatar > image_url > 默认图片
    if (currentUser.avatar) {
      // 检查是否为base64字符串
      if (currentUser.avatar.startsWith('data:image')) {
        // 已经是合法的base64数据URL，直接使用
        profileImg.src = currentUser.avatar;
      } else if (currentUser.avatar.match(/^[a-zA-Z0-9+/=]+$/)) {
        // 看起来是纯base64字符串，但没有前缀，添加前缀
        profileImg.src = 'data:image/jpeg;base64,' + currentUser.avatar;
      } else if (currentUser.avatar.startsWith('http')) {
        // 是URL，直接使用
        profileImg.src = currentUser.avatar;
      } else {
        // 其他情况尝试作为URL使用
        profileImg.src = currentUser.avatar;
      }
      console.log('Avatar source set to:', profileImg.src.substring(0, 50) + (profileImg.src.length > 50 ? '...' : ''));
    } else if (currentUser.image_url) {
      profileImg.src = currentUser.image_url;
    }
    // 如果没有设置头像，保留默认图片
  }
  
  // 更新编辑表单字段
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
  
  // 生日字段
  const birthdayInput = document.getElementById('birthday');
  if (birthdayInput && currentUser.birthday) {
    try {
      // 确保格式为YYYY-MM-DD
      let birthdayValue = currentUser.birthday;
      
      // 如果不是YYYY-MM-DD格式，尝试转换
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
  
  // 性别单选按钮
  if (currentUser.gender) {
    const genderRadio = document.querySelector(`input[name="gender"][value="${currentUser.gender}"]`);
    if (genderRadio) {
      genderRadio.checked = true;
    }
  }
}

// Load user addresses
function loadUserAddresses() {
  console.log('Using mock address data for display');
  
  // 使用静态数据展示卡片设计
  userAddresses = [
    {
      id: 1,
      name: 'Home Address',
      is_default: true,
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'USA',
      phone: '123-456-7890'
    },
    {
      id: 2,
      name: 'Work Address',
      is_default: false,
      street: '456 Office Building',
      city: 'New York',
      state: 'NY',
      zip: '10002',
      country: 'USA',
      phone: '098-765-4321'
    }
  ];
  
  // Display addresses
  displayUserAddresses();
}

// Display user addresses
function displayUserAddresses() {
  const addressesContainer = document.getElementById('addressesContainer');
  
  if (!addressesContainer) {
    console.warn('Addresses container not found in the DOM');
    return;
  }
  
  // Clear container
  addressesContainer.innerHTML = '';
  
  // Add each address
  userAddresses.forEach((address, index) => {
    // Create address card
    const addressCard = document.createElement('div');
    addressCard.className = 'address-card';
    if (address.is_default) {
      addressCard.classList.add('default-address');
    }
    
    addressCard.innerHTML = `
      <div class="address-header">
        <h3>${address.name || 'Address ' + (index + 1)}</h3>
        ${address.is_default ? '<span class="default-badge">Default</span>' : ''}
      </div>
      <div class="address-content">
        <p>${address.street}</p>
        <p>${address.city}${address.city && address.state ? ', ' : ''}${address.state} ${address.zip}</p>
        <p>${address.country}</p>
        ${address.phone ? `<p>Phone: ${address.phone}</p>` : ''}
      </div>
      <div class="address-actions">
        <button class="btn btn-sm btn-edit" data-address-id="${address.id}">Edit</button>
        <button class="btn btn-sm btn-delete" data-address-id="${address.id}">Delete</button>
        ${!address.is_default ? `<button class="btn btn-sm btn-default" data-address-id="${address.id}">Set as Default</button>` : ''}
      </div>
    `;
    
    addressesContainer.appendChild(addressCard);
    
    // Add event listeners
    addressCard.querySelector('.btn-edit').addEventListener('click', () => editAddress(address.id));
    addressCard.querySelector('.btn-delete').addEventListener('click', () => deleteAddress(address.id));
    
    const defaultBtn = addressCard.querySelector('.btn-default');
    if (defaultBtn) {
      defaultBtn.addEventListener('click', () => setDefaultAddress(address.id));
    }
  });
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