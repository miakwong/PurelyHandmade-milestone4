// Profile page functionality
document.addEventListener('DOMContentLoaded', function() {
    // get user ID from url
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    if (!userId) {
        showToast('Invalid user profile', 'error');
        window.location.href = 'login.html';
        return;
    }

    // Load user profile data
    loadUserProfile(userId);
    
    // Set up event listeners
    setupEventListeners();
});

// Load user profile data from API
async function loadUserProfile(userId) {
    try {
        const response = await fetch(`${config.apiUrl}/auth.php?action=status`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Profile response:', result);

        if (result.success && result.data.isLoggedIn) {
            const user = result.data.user;
            console.log('User data:', user);
            
            // check if current user has permission to view this profile
            if (user.id.toString() !== userId && !user.isAdmin) {
                showToast('You do not have permission to view this profile', 'error');
                window.location.href = 'login.html';
                return;
            }

            updateProfileUI(user);
            
            // Show admin tab if user is admin
            if (user.isAdmin) {
                document.getElementById('admin-tab-container').style.display = 'block';
            }
        } else {
            // Redirect to login if not logged in
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile data', 'error');
    }
}

// Update UI with user data
function updateProfileUI(user) {
    if (!user) {
        console.error('No user data provided');
        return;
    }

    // Update basic info
    document.getElementById('user-full-name').textContent = user.name || 'User';
    document.getElementById('user-email').textContent = user.email || '';
    document.getElementById('join-date').textContent = user.joinDate ? new Date(user.joinDate).toLocaleDateString() : '';

    // Update profile details
    const nameParts = user.name ? user.name.split(' ') : ['', ''];
    document.getElementById('first-name').textContent = nameParts[0] || '';
    document.getElementById('last-name').textContent = nameParts.slice(1).join(' ') || '';
    document.getElementById('email-display').textContent = user.email || '';
    document.getElementById('birthday-display').textContent = user.birthday ? new Date(user.birthday).toLocaleDateString() : 'Not set';
    document.getElementById('gender-display').textContent = user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not set';
    
    // Update avatar if exists
    if (user.avatar) {
        document.getElementById('profile-img').src = `data:image/jpeg;base64,${user.avatar}`;
    }

    // Update form fields for editing
    document.getElementById('firstName').value = nameParts[0] || '';
    document.getElementById('lastName').value = nameParts.slice(1).join(' ') || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('birthday').value = user.birthday || '';
    
    // Set gender radio button
    if (user.gender) {
        const genderRadio = document.querySelector(`input[name="gender"][value="${user.gender}"]`);
        if (genderRadio) {
            genderRadio.checked = true;
        }
    }
}

// Set up event listeners
function setupEventListeners() {
    // Profile form submission
    document.getElementById('save-profile').addEventListener('click', saveProfile);
    
    // Password change form submission
    document.getElementById('change-password-form').addEventListener('submit', changePassword);
    
    // Avatar upload
    document.getElementById('avatar-upload').addEventListener('change', handleAvatarUpload);
}

// Save profile changes
async function saveProfile() {
    const form = document.getElementById('profile-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const profileData = {
        name: `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`,
        email: document.getElementById('email').value,
        birthday: document.getElementById('birthday').value,
        gender: document.querySelector('input[name="gender"]:checked').value
    };

    try {
        const response = await fetch(`${config.apiUrl}/users.php?action=update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData),
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            showToast('Profile updated successfully');
            // Close modal and reload profile
            bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
            loadUserProfile();
        } else {
            showToast(result.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Failed to update profile', 'error');
    }
}

// Change password
async function changePassword(event) {
    event.preventDefault();
    const form = event.target;
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(`${config.apiUrl}/users.php?action=change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            }),
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            showToast('Password changed successfully');
            form.reset();
        } else {
            showToast(result.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showToast('Failed to change password', 'error');
    }
}

// Handle avatar upload
async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('Image size should be less than 5MB', 'error');
        return;
    }

    // Convert image to base64
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const response = await fetch(`${config.apiUrl}/users.php?action=update-avatar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    avatar: e.target.result.split(',')[1]
                }),
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                showToast('Avatar updated successfully');
                // Update avatar preview
                document.getElementById('profile-img').src = e.target.result;
            } else {
                showToast(result.message || 'Failed to update avatar', 'error');
            }
        } catch (error) {
            console.error('Error updating avatar:', error);
            showToast('Failed to update avatar', 'error');
        }
    };
    reader.readAsDataURL(file);
} 