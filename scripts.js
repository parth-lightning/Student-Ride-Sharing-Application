// Set API URL based on environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1') 
  ? 'http://localhost:3000' 
  : window.location.protocol + '//' + window.location.hostname + ':3000';

// Demo credentials and user data
const users = {
  'rider@demo.com': {
    password: 'rider123',
    name: 'Demo Rider',
    role: 'rider',
    prn: 'PRN001',
    license: 'LIC001',
    vehicle: 'MH12AB1234',
    emailVerified: true,
    totalRides: 0,
    moneySaved: 0,
    completed: 0,
    rating: 5
  },
  'passenger@demo.com': {
    password: 'passenger123',
    name: 'Demo Passenger',
    role: 'passenger',
    prn: 'PRN002',
    emailVerified: true,
    totalRides: 0,
    moneySaved: 0,
    completed: 0,
    rating: 5
  },
};

// Store OTPs temporarily
const otpStore = new Map();

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeAuth();
  setupFormValidation();
  setupInteractiveElements();
  setupRoleSelection();
});

// Authentication initialization
function initializeAuth() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  // Check if user is already logged in
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const currentPath = window.location.pathname;

  if (isLoggedIn && (currentPath.includes('login.html') || currentPath.includes('signup.html'))) {
    window.location.href = 'dashboard.html';
    return;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
}

// Modified handleLogin function to use Firebase
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Clear previous error messages
  clearErrors();

  // Add loading state to button
  const button = e.target.querySelector('button');
  button.classList.add('loading');

  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const { user } = await response.json();

    if (!user.emailVerified) {
      localStorage.setItem('pendingVerificationEmail', email);
      window.location.href = `otp-verification.html?email=${encodeURIComponent(email)}`;
      return;
    }

    // Store session info and user data in localStorage
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', user.name);
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userData', JSON.stringify({
      totalRides: user.totalRides || 0,
      moneySaved: user.moneySaved || 0,
      completed: user.completed || 0,
      rating: user.rating || 5
    }));

    // Show success message and redirect
    showSuccessMessage('Login successful! Redirecting...');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
  } catch (error) {
    showError(document.getElementById('email'), error.message);
    button.classList.remove('loading');
  }
}

// Modified handleSignup function
async function handleSignup(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const userData = Object.fromEntries(formData.entries());

  // Clear previous error messages
  clearErrors();

  // Validate form
  if (!validateSignupForm(userData)) {
    return;
  }

  // Add loading state to button
  const button = e.target.querySelector('button');
  button.classList.add('loading');

  try {
    // Check if email already exists
    const checkUser = await fetch(`${API_URL}/api/user/${encodeURIComponent(userData.email)}`);
    if (checkUser.ok) {
      throw new Error('Email already registered');
    }

    // Send OTP
    const response = await fetch(`${API_URL}/api/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: userData.email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send OTP');
    }

    // Store pending user data
    localStorage.setItem('pendingUser', JSON.stringify(userData));
    localStorage.setItem('pendingVerificationEmail', userData.email);

    // Show success message and redirect to OTP verification
    showSuccessMessage('Verification code sent! Please check your email.');
    setTimeout(() => {
      window.location.href = `otp-verification.html?email=${encodeURIComponent(userData.email)}`;
    }, 1500);
  } catch (error) {
    console.error("Error during signup:", error);
    showError(document.getElementById('email'), error.message);
    button.classList.remove('loading');
  }
}

// Validate signup form
function validateSignupForm(data) {
  let isValid = true;

  // Validate name
  if (!data.name || data.name.length < 2) {
    showError(document.getElementById('name'), 'Name must be at least 2 characters');
    isValid = false;
  }

  // Validate PRN
  if (!data.prn || !/^\d{8}$/.test(data.prn)) {
    showError(document.getElementById('prn'), 'PRN must be exactly 8 digits');
    isValid = false;
  }

  // Validate email
  if (!validateEmail(data.email)) {
    showError(document.getElementById('email'), 'Invalid email format');
    isValid = false;
  }

  // Validate password
  if (data.password.length < 6) {
    showError(document.getElementById('password'), 'Password must be at least 6 characters');
    isValid = false;
  }

  // Validate password confirmation
  if (data.password !== data.confirmPassword) {
    showError(document.getElementById('confirmPassword'), 'Passwords do not match');
    isValid = false;
  }

  // Validate rider-specific fields
  if (data.role === 'rider') {
    if (!data.license) {
      showError(document.getElementById('license'), 'Vehicle license is required for riders');
      isValid = false;
    }
    if (!validateVehicleNumber(data.vehicle)) {
      showError(document.getElementById('vehicle'), 'Invalid vehicle number format (e.g., MH12AB1234)');
      isValid = false;
    }
  }

  return isValid;
}

// Validate email format
function validateEmail(email) {
  return /^[^\s@]+@vit\.edu$/.test(email);
}

// Validate vehicle number format
function validateVehicleNumber(number) {
  return /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/.test(number);
}

// Show error message
function showError(input, message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  input.classList.add('error');
  input.parentNode.insertBefore(errorElement, input.nextSibling);
}

// Clear all error messages
function clearErrors() {
  document.querySelectorAll('.error-message').forEach((error) => error.remove());
  document.querySelectorAll('.error').forEach((input) => input.classList.remove('error'));
}

// Show success message
function showSuccessMessage(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  document.body.appendChild(successDiv);
  setTimeout(() => successDiv.remove(), 3000);
}

// Handle logout
function handleLogout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

// Setup form validation
function setupFormValidation() {
  const inputs = document.querySelectorAll('input');
  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('error');
      const errorMessage = input.nextElementSibling;
      if (errorMessage && errorMessage.classList.contains('error-message')) {
        errorMessage.remove();
      }
    });
  });
}

// Setup role selection for signup
function setupRoleSelection() {
  const roleSelect = document.getElementById('role');
  const vehicleInfo = document.getElementById('vehicleInfo');

  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      if (e.target.value === 'rider') {
        vehicleInfo.style.display = 'block';
        document.getElementById('license').required = true;
        document.getElementById('vehicle').required = true;
      } else {
        vehicleInfo.style.display = 'none';
        document.getElementById('license').required = false;
        document.getElementById('vehicle').required = false;
      }
    });
  }
}

// Setup interactive elements
function setupInteractiveElements() {
  const logoutButton = document.querySelector('.logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }

  // Add password visibility toggle
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach((input) => {
    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'password-toggle';
    toggleButton.innerHTML = '👁️';
    toggleButton.onclick = () => {
      input.type = input.type === 'password' ? 'text' : 'password';
    };
    input.parentNode.appendChild(toggleButton);
  });
}

// Add this new function to store verified user data
function storeVerifiedUser(userData) {
  const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
  registeredUsers[userData.email] = {
    ...userData,
    emailVerified: true
  };
  localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
}

// Update the existing function that handles OTP verification success
async function handleOTPVerificationSuccess(email) {
  const pendingUser = JSON.parse(localStorage.getItem('pendingUser'));
  if (pendingUser) {
    // Store the verified user
    storeVerifiedUser(pendingUser);
    
    localStorage.removeItem('pendingUser');
    localStorage.removeItem('pendingVerificationEmail');
    localStorage.setItem('isEmailVerified', 'true');
    
    // Log the user in
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userEmail', pendingUser.email);
    localStorage.setItem('userName', pendingUser.name);
    localStorage.setItem('userRole', pendingUser.role);
  }

  showSuccessMessage('Email verified successfully! Redirecting...');
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 1500);
}

// Function to save ride data
async function saveRide(rideData) {
  try {
    const response = await fetch(`${API_URL}/api/save-ride`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rideData)
    });

    if (!response.ok) {
      throw new Error('Failed to save ride');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error saving ride:', error);
    throw error;
  }
}

// Function to search rides
async function searchRides(criteria) {
  try {
    const queryParams = new URLSearchParams(criteria);
    const response = await fetch(`${API_URL}/api/search-rides?${queryParams}`);

    if (!response.ok) {
      throw new Error('Failed to search rides');
    }

    const { rides } = await response.json();
    return rides;
  } catch (error) {
    console.error('Error searching rides:', error);
    throw error;
  }
}