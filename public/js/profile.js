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
      
      // Load user reviews
      loadUserReviews();
      
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
    
    // Split name into first_name and last_name
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
  
  // Update profile card
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
  
  // Update personal info section (details area)
  const firstNameElement = document.getElementById('first-name');
  if (firstNameElement) {
    firstNameElement.textContent = firstName || 'Not set';
  }
  
  const lastNameElement = document.getElementById('last-name');
  if (lastNameElement) {
    lastNameElement.textContent = lastName || 'Not set';
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
  
  // Update any other elements in personalinfo section
  const personalInfoElements = document.querySelectorAll('[data-user-info]');
  personalInfoElements.forEach(element => {
    const field = element.getAttribute('data-user-info');
    if (field && currentUser[field] !== undefined) {
      element.textContent = currentUser[field] || 'Not set';
    }
  });
  
  // Make sure all details in the personal info tab are updated
  console.log('Updating all personal info elements with latest data');
  
  // Explicitly update every field again to ensure complete update
  document.querySelectorAll('#personal-info .detail-item').forEach(element => {
    const fieldLabel = element.querySelector('.detail-label');
    const fieldValue = element.querySelector('.detail-value');
    
    if (fieldLabel && fieldValue) {
      const label = fieldLabel.textContent.trim().toLowerCase();
      
      // Update specific fields based on label text
      if (label.includes('first name')) {
        fieldValue.textContent = firstName || 'Not set';
      } else if (label.includes('last name')) {
        fieldValue.textContent = lastName || 'Not set';
      } else if (label.includes('email')) {
        fieldValue.textContent = currentUser.email || '';
      } else if (label.includes('birthday') || label.includes('birth date')) {
        if (currentUser.birthday) {
          const date = new Date(currentUser.birthday);
          fieldValue.textContent = date.toLocaleDateString();
        } else {
          fieldValue.textContent = 'Not set';
        }
      } else if (label.includes('gender')) {
        fieldValue.textContent = currentUser.gender || 'Not set';
      }
    }
  });
  
  // Update avatar
  const profileImg = document.getElementById('profile-img');
  if (profileImg) {
    if (currentUser.avatar) {
      try {
        // 检查是否是base64数据 - 这是关键解码逻辑，必须保留
        if (/^[a-zA-Z0-9+/=]+$/.test(currentUser.avatar)) {
          try {
            // 使用Base64解码前部分检查是否包含"data:image"
            const decodedStart = atob(currentUser.avatar.substring(0, 30));
            
            if (decodedStart.includes('data:image')) {
              // 这是解码整个base64字符串的关键代码，保留
              const decoded = atob(currentUser.avatar);
              profileImg.src = decoded;
            } else {
              // 普通base64字符串，加上前缀
              profileImg.src = 'data:image/jpeg;base64,' + currentUser.avatar;
            }
          } catch (e) {
            // 解码失败当作普通base64处理
            profileImg.src = 'data:image/jpeg;base64,' + currentUser.avatar;
          }
        }
        // 处理其他可能的情况
        else if (currentUser.avatar.startsWith('data:image/')) {
          profileImg.src = currentUser.avatar;
        }
        else if (currentUser.avatar.startsWith('http')) {
          profileImg.src = currentUser.avatar;
        }
        else {
          profileImg.src = 'data:image/jpeg;base64,' + currentUser.avatar;
        }
      } catch (e) {
        profileImg.src = '/~miakuang/PurelyHandmade/server/uploads/images/default-avatar.png';
      }
    } else {
      profileImg.src = '/~miakuang/PurelyHandmade/server/uploads/images/default-avatar.png';
    }
  }
  
  // check if the user is an admin, show/hide the admin dashboard button
  const adminDashboardBtnContainer = document.getElementById('admin-dashboard-btn-container');
  if (adminDashboardBtnContainer) {
    // check if the user is an admin
    const isAdmin = currentUser.role === 'admin' || currentUser.is_admin === true;
    adminDashboardBtnContainer.style.display = isAdmin ? 'block' : 'none';

    if (isAdmin) {
      // ensure the button is visible
      const parentElement = adminDashboardBtnContainer.parentElement;
      if (parentElement) {
        parentElement.insertBefore(adminDashboardBtnContainer, parentElement.firstChild);
        
        // add some highlighted styles
        adminDashboardBtnContainer.classList.add('p-3', 'bg-light', 'rounded', 'mb-3');
      }
    }
  }
  
  // update edit form fields
  const firstNameInput = document.getElementById('firstName');
  if (firstNameInput) {
    firstNameInput.value = firstName || '';
  }
  
  const lastNameInput = document.getElementById('lastName');
  if (lastNameInput) {
    lastNameInput.value = lastName || '';
  }
  
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.value = currentUser.email || '';
  }
  
  // birthday field
  const birthdayInput = document.getElementById('birthday');
  if (birthdayInput) {
    try {
      // ensure the format is YYYY-MM-DD for the input
      if (currentUser.birthday) {
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
      } else {
        birthdayInput.value = '';
      }
    } catch (error) {
      console.error('Error formatting birthday:', error);
      birthdayInput.value = '';
    }
  }
  
  // gender radio button
  const genderRadios = document.querySelectorAll('input[name="gender"]');
  // First uncheck all
  genderRadios.forEach(radio => {
    radio.checked = false;
  });
  
  // Then check the appropriate one
  if (currentUser.gender) {
    const genderRadio = document.querySelector(`input[name="gender"][value="${currentUser.gender}"]`);
    if (genderRadio) {
      genderRadio.checked = true;
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  // Avatar upload 
  setupAvatarUpload();
  
  // Save profile button
  const saveProfileBtn = document.getElementById('save-profile');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', updateUserProfile);
  }
  
  // Reviews tab functionality
  const reviewsTab = document.getElementById('reviews-tab');
  if (reviewsTab) {
    reviewsTab.addEventListener('shown.bs.tab', loadUserReviews);
  }
  
  // Update review button
  const updateReviewBtn = document.getElementById('update-review');
  if (updateReviewBtn) {
    updateReviewBtn.addEventListener('click', updateReview);
  }
  
  // Star rating functionality
  const starRating = document.querySelectorAll('.star-rating i');
  starRating.forEach(star => {
    star.addEventListener('click', function() {
      const rating = this.getAttribute('data-rating');
      document.getElementById('review-rating').value = rating;
      
      // Update star display
      starRating.forEach(s => {
        const starRating = parseInt(s.getAttribute('data-rating'));
        if (starRating <= rating) {
          s.classList.remove('bi-star');
          s.classList.add('bi-star-fill');
        } else {
          s.classList.remove('bi-star-fill');
          s.classList.add('bi-star');
        }
      });
    });
    
    // Hover effects
    star.addEventListener('mouseenter', function() {
      const rating = this.getAttribute('data-rating');
      
      starRating.forEach(s => {
        const starRating = parseInt(s.getAttribute('data-rating'));
        if (starRating <= rating) {
          s.classList.add('text-warning');
        }
      });
    });
    
    star.addEventListener('mouseleave', function() {
      starRating.forEach(s => {
        s.classList.remove('hover');
      });
    });
  });
  
  // Change password form
  const changePasswordForm = document.getElementById('change-password-form');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', changePassword);
  }
  
  // Add listener for edit profile modal opening
  const editProfileModal = document.getElementById('editProfileModal');
  if (editProfileModal) {
    editProfileModal.addEventListener('show.bs.modal', function() {
      // Reset form and clear errors when modal opens
      hideError('profile-error');
      
      // Ensure form fields are populated with latest user data
      const firstNameInput = document.getElementById('firstName');
      const lastNameInput = document.getElementById('lastName');
      const emailInput = document.getElementById('email');
      const birthdayInput = document.getElementById('birthday');
      
      if (firstNameInput && currentUser.first_name) {
        firstNameInput.value = currentUser.first_name || '';
      }
      
      if (lastNameInput && currentUser.last_name) {
        lastNameInput.value = currentUser.last_name || '';
      }
      
      if (emailInput && currentUser.email) {
        emailInput.value = currentUser.email || '';
        // Disable email field for non-admin users
        if (!currentUser.is_admin) {
          emailInput.disabled = true;
          // Add a tooltip or help text
          if (!document.getElementById('email-help-text')) {
            const helpText = document.createElement('div');
            helpText.id = 'email-help-text';
            helpText.className = 'form-text text-muted';
            helpText.innerHTML = '<i class="bi bi-info-circle"></i> Only administrators can change email addresses.';
            emailInput.parentNode.appendChild(helpText);
          }
        }
      }
      
      // Handle birthday field
      if (birthdayInput && currentUser.birthday) {
        try {
          // Ensure birthday is in YYYY-MM-DD format for the input
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
          birthdayInput.value = '';
        }
      }
      
      // Set gender radio button
      if (currentUser.gender) {
        const genderRadio = document.querySelector(`input[name="gender"][value="${currentUser.gender}"]`);
        if (genderRadio) {
          genderRadio.checked = true;
        }
      }
    });
  }
}

// setup avatar upload button and event
function setupAvatarUpload() {
  const avatarUpload = document.getElementById('avatar-upload');
  if (!avatarUpload) {
    console.warn('Avatar upload input not found');
    return;
  }
  
  // add event listener
  avatarUpload.addEventListener('change', handleAvatarUpload);
  
  // set avatar click to trigger upload
  const avatarOverlay = document.querySelector('.avatar-overlay');
  if (avatarOverlay) {
    avatarOverlay.addEventListener('click', function() {
      console.log('Avatar overlay clicked');
      avatarUpload.click();
    });
  } else {
    console.warn('Avatar overlay element not found');
  }
  
  // set avatar click to trigger upload
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
  
  // validate file type
  if (!file.type.match('image.*')) {
    showToast('Please select an image file', 'error');
    return;
  }
  
  // file size limit (2MB)
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
      
      // 预览图片
      profileImg.src = base64Image;
      
      // save base64 image to server
      updateAvatarOnServer(base64Image);
    };
    reader.readAsDataURL(file);
  }
}

// send base64 image to server
function updateAvatarOnServer(base64Image) {
  // 保留base64Image的原始格式，保持Data URL完整
  const userData = {
    avatar: base64Image,
    user_id: currentUser.id,
    name: currentUser.name || 'User'
  };
  
  // call API to update avatar
  const updateUrl = `${config.apiUrl}/users.php?action=update_profile`;
  
  fetch(updateUrl, {
    method: 'POST',
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
      
      // update user data
      if (response.data) {
        currentUser = response.data;
        if (!currentUser.avatar) {
          currentUser.avatar = base64Image;
        }
        displayUserData();
      } else {
        currentUser.avatar = base64Image;
        displayUserData();
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
  
  // Combine first_name and last_name into name
  const name = lastName ? `${firstName} ${lastName}` : firstName;
  
  // Create user data object
  const userData = {
    name: name,
    birthday: birthday || null,
    gender: gender || null,
    user_id: currentUser.id // Include user_id in the data for POST method
  };
  
  // 只有管理员才能更新email
  if (currentUser.is_admin) {
    userData.email = email;
  }
  
  console.log('Current user object:', currentUser);
  console.log('User ID being used:', currentUser.id);
  console.log('Form data being submitted:', userData);
  
  // Call API to update profilePOST
  const updateUrl = `${config.apiUrl}/users.php?action=update_profile`;
  
  console.log('Request URL:', updateUrl);
  console.log('Request method: POST');
  console.log('Request body:', userData);
  
  // Show loading
  const saveButton = document.getElementById('save-profile');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  }
  
  // Clear previous errors
  hideError('profile-error');
  
  fetch(updateUrl, {
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData),
    credentials: 'include'
  })
    .then(response => {
      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);
      
      if (!response.ok) {
        return response.text().then(text => {
          console.log('Error response text:', text);
          try {
            // Try to parse as JSON
            const data = JSON.parse(text);
            throw new Error(data.message || `Error: ${response.status} ${response.statusText}`);
          } catch (e) {
            // If not valid JSON, return the error text
            throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}...`);
          }
        });
      }
      return response.json();
    })
    .then(response => {
      console.log('Profile update response:', response);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update profile');
      }
      
      // 不要使用本地数据，而是立即从服务器重新获取完整的用户数据
      console.log('Reloading user data from server after successful update');
      
      // 先更新表单数据到本地对象，确保所有页面元素都能立即显示最新值
      currentUser.name = name;
      currentUser.email = email;
      currentUser.birthday = birthday;
      currentUser.gender = gender;
      currentUser.first_name = firstName;
      currentUser.last_name = lastName;
      
      // 立即使用这些数据更新UI，不等待服务器响应
      console.log('Immediately updating UI with form data');
      
      // 直接更新个人信息卡片
      document.getElementById('user-full-name').textContent = name;
      document.getElementById('user-email').textContent = email;
      
      // 直接更新Personal Info部分的详细信息
      const personalInfoElements = document.querySelectorAll('#personal-info .detail-item');
      personalInfoElements.forEach(element => {
        const fieldLabel = element.querySelector('.detail-label');
        const fieldValue = element.querySelector('.detail-value');
        
        if (fieldLabel && fieldValue) {
          const labelText = fieldLabel.textContent.trim().toLowerCase();
          console.log(`Updating field: ${labelText}`);
          
          if (labelText.includes('first name')) {
            fieldValue.textContent = firstName || 'Not set';
          } else if (labelText.includes('last name')) {
            fieldValue.textContent = lastName || 'Not set';
          } else if (labelText.includes('email')) {
            fieldValue.textContent = email;
          } else if (labelText.includes('birthday') || labelText.includes('birth')) {
            if (birthday) {
              const date = new Date(birthday);
              fieldValue.textContent = date.toLocaleDateString();
            } else {
              fieldValue.textContent = 'Not set';
            }
          } else if (labelText.includes('gender')) {
            fieldValue.textContent = gender || 'Not set';
          }
        }
      });
      
      // 先显示成功消息
      showToast('Profile updated successfully', 'success');
      
      // 关闭模态框
      const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
      if (modal) {
        modal.hide();
      }
      
      // 从服务器重新获取最新的用户数据
      fetch(`${config.apiUrl}/users.php?id=${currentUser.id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        }
      })
      .then(response => response.json())
      .then(userData => {
        console.log('Fresh user data loaded:', userData);
        
        if (userData.success && userData.data) {
          // 使用新获取的完整数据更新currentUser
          currentUser = userData.data;
          // 重新显示所有用户信息
          displayUserData();
          
          console.log('Profile updated with fresh data from server');
        }
        
        // 最后刷新整个页面以确保所有数据一致
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      })
      .catch(error => {
        console.error('Error fetching fresh user data:', error);
        // 即使获取新数据失败，也刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      });
    })
    .catch(error => {
      console.error('Error updating profile:', error);
      showError('profile-error', error.message || 'Error updating profile. Please try again.');
    })
    .finally(() => {
      // Reset button state
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = 'Save Changes';
      }
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
      
      const errorMessage = error.message || 'Error changing password. Please try again.';
      showError('password-error', errorMessage);
    });
}

// Reviews functions
let userReviews = [];

// Load user reviews
function loadUserReviews() {
  const reviewsContainer = document.getElementById('reviews-container');
  const noReviewsElement = document.querySelector('.no-reviews');
  const reviewsTableBody = document.getElementById('reviewsTableBody');
  
  if (!reviewsContainer || !reviewsTableBody) return;
  
  // Show loading state
  reviewsTableBody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm" role="status"></div> Loading reviews...</td></tr>';
  
  fetch(`${config.apiUrl}/product_reviews.php?action=get_user_reviews&user_id=${currentUser.id}`, {
    method: 'GET',
    credentials: 'include'
  })
  .then(response => response.json())
  .then(data => {
    if (data.success && data.data) {
      userReviews = data.data;
      
      if (userReviews.length === 0) {
        // No reviews
        reviewsTableBody.innerHTML = '';
        noReviewsElement.classList.remove('d-none');
      } else {
        // Has reviews
        noReviewsElement.classList.add('d-none');
        displayUserReviews();
      }
    } else {
      throw new Error(data.message || 'Failed to load reviews');
    }
  })
  .catch(error => {
    console.error('Error loading reviews:', error);
    reviewsTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error loading reviews: ${error.message}</td></tr>`;
  });
}

// Display user reviews
function displayUserReviews() {
  const reviewsTableBody = document.getElementById('reviewsTableBody');
  if (!reviewsTableBody) return;
  
  reviewsTableBody.innerHTML = '';
  
  userReviews.forEach(review => {
    const row = document.createElement('tr');
    row.setAttribute('data-review-id', review.id);
    
    // Truncate review text if too long
    const reviewText = review.review_text.length > 100 
      ? review.review_text.substring(0, 100) + '...' 
      : review.review_text;
    
    // Format date
    const reviewDate = new Date(review.created_at);
    const formattedDate = reviewDate.toLocaleDateString();
    
    // Create rating stars
    const rating = parseInt(review.rating);
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        starsHtml += '<i class="bi bi-star-fill text-warning"></i>';
      } else {
        starsHtml += '<i class="bi bi-star text-warning"></i>';
      }
    }
    
    // Product image
    const productImage = review.product_image 
      ? `<img src="${review.product_image}" alt="${review.product_name}" width="40" class="me-2 rounded">`
      : '';
    
    row.innerHTML = `
      <td>
        ${productImage}
        <a href="${config.baseUrl}/public/views/product/product_detail.html?id=${review.product_id}" class="product-link">
          ${review.product_name}
        </a>
      </td>
      <td>${starsHtml}</td>
      <td>${reviewText}</td>
      <td>${formattedDate}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary edit-review-btn" data-review-id="${review.id}">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger delete-review-btn" data-review-id="${review.id}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    
    // Add event listeners
    const editBtn = row.querySelector('.edit-review-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => editReview(review.id));
    }
    
    const deleteBtn = row.querySelector('.delete-review-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteReview(review.id));
    }
    
    reviewsTableBody.appendChild(row);
  });
}

// Edit review
function editReview(reviewId) {
  // Find the review in the array
  const review = userReviews.find(r => r.id == reviewId);
  if (!review) {
    showToast('Review not found', 'error');
    return;
  }
  
  // Populate the form
  document.getElementById('review-id').value = review.id;
  document.getElementById('product-id').value = review.product_id;
  document.getElementById('product-name').textContent = review.product_name;
  document.getElementById('review-text').value = review.review_text;
  
  // Set rating
  const rating = parseInt(review.rating);
  document.getElementById('review-rating').value = rating;
  
  // Update star display
  const stars = document.querySelectorAll('.star-rating i');
  stars.forEach(star => {
    const starRating = parseInt(star.getAttribute('data-rating'));
    if (starRating <= rating) {
      star.classList.remove('bi-star');
      star.classList.add('bi-star-fill');
    } else {
      star.classList.remove('bi-star-fill');
      star.classList.add('bi-star');
    }
  });
  
  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('editReviewModal'));
  modal.show();
}

// Update review
function updateReview() {
  const reviewId = document.getElementById('review-id').value;
  const productId = document.getElementById('product-id').value;
  const rating = document.getElementById('review-rating').value;
  const reviewText = document.getElementById('review-text').value;
  
  // Validation
  if (!rating) {
    showError('review-error', 'Please select a rating');
    return;
  }
  
  if (!reviewText) {
    showError('review-error', 'Please enter your review');
    return;
  }
  
  // Create review data
  const reviewData = {
    rating: parseInt(rating),
    review_text: reviewText
  };
  
  // Show loading state on button
  const updateBtn = document.getElementById('update-review');
  updateBtn.disabled = true;
  updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  
  // Call API to update review 
  fetch(`${config.apiUrl}/product_reviews.php?id=${reviewId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reviewData),
    credentials: 'include'
  })
  .then(response => response.json())
  .then(data => {
    // Reset button
    updateBtn.disabled = false;
    updateBtn.innerHTML = 'Save Review';
    
    if (data.success) {
      // Hide modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('editReviewModal'));
      modal.hide();
      
      // Reload reviews
      loadUserReviews();
      
      // Show success message
      showToast('Review updated successfully', 'success');
    } else {
      throw new Error(data.message || 'Failed to update review');
    }
  })
  .catch(error => {
    // Reset button
    updateBtn.disabled = false;
    updateBtn.innerHTML = 'Save Review';
    
    console.error('Error updating review:', error);
    showError('review-error', error.message || 'Error updating review. Please try again.');
  });
}

// Delete review
function deleteReview(reviewId) {
  if (!confirm('Are you sure you want to delete this review?')) {
    return;
  }
  
  // Show loading state
  const reviewRow = document.querySelector(`[data-review-id="${reviewId}"]`).closest('tr');
  if (reviewRow) {
    reviewRow.classList.add('opacity-50');
    const actionCell = reviewRow.querySelector('td:last-child');
    if (actionCell) {
      actionCell.innerHTML = '<div class="spinner-border spinner-border-sm text-secondary" role="status"></div>';
    }
  }
  
  fetch(`${config.apiUrl}/product_reviews.php?id=${reviewId}`, {
    method: 'POST',
    credentials: 'include'
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Remove from array
      userReviews = userReviews.filter(review => review.id != reviewId);
      
      // Update display
      displayUserReviews();
      
      // Show success message
      showToast('Review deleted successfully', 'success');
      
      // Show "no reviews" message if no reviews left
      if (userReviews.length === 0) {
        document.querySelector('.no-reviews').classList.remove('d-none');
      }
    } else {
      throw new Error(data.message || 'Failed to delete review');
    }
  })
  .catch(error => {
    console.error('Error deleting review:', error);
    showToast('Error deleting review: ' + error.message, 'error');
    
    // Restore the row
    if (reviewRow) {
      reviewRow.classList.remove('opacity-50');
      displayUserReviews();
    }
  });
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
window.editReview = editReview;
window.deleteReview = deleteReview;
window.loadUserReviews = loadUserReviews; 