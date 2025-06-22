// Set API URL based on environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1') 
  ? 'http://localhost:3000' 
  : window.location.protocol + '//' + window.location.hostname + ':3000';

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const userEmail = urlParams.get('email') || localStorage.getItem('pendingVerificationEmail');

// Display user's email
document.getElementById('userEmailDisplay').textContent = userEmail;

// Store email for verification
localStorage.setItem('pendingVerificationEmail', userEmail);

// OTP Input Handling
const otpInputs = document.querySelectorAll('.otp-input');
let verificationInProgress = false;

otpInputs.forEach((input) => {
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    const index = parseInt(e.target.dataset.index);

    if (value) {
      input.classList.add('filled');
      // Move to next input
      if (index < otpInputs.length) {
        const nextInput = document.querySelector(`[data-index="${index + 1}"]`);
        if (nextInput) nextInput.focus();
      }
    } else {
      input.classList.remove('filled');
    }
  });

  input.addEventListener('keydown', (e) => {
    const index = parseInt(e.target.dataset.index);

    if (e.key === 'Backspace' && !e.target.value) {
      // Move to previous input on backspace
      if (index > 1) {
        const prevInput = document.querySelector(`[data-index="${index - 1}"]`);
        if (prevInput) prevInput.focus();
      }
    }
  });
});

// Form Submission
const otpForm = document.getElementById('otpForm');
otpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (verificationInProgress) return;

  const otp = Array.from(otpInputs)
    .map((input) => input.value)
    .join('');
    
  if (otp.length !== 6) {
    showError('Please enter the complete verification code');
    return;
  }

  verificationInProgress = true;
  const verifyBtn = document.querySelector('.verify-btn');
  verifyBtn.classList.add('loading');

  try {
    console.log("Verifying OTP at:", `${API_URL}/api/verify-otp`);
    
    const response = await fetch(`${API_URL}/api/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        otp: otp
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid verification code');
    }

    // Get pending user data
    const pendingUser = JSON.parse(localStorage.getItem('pendingUser'));
    console.log('Pending user data:', pendingUser);
    
    if (pendingUser) {
      try {
        // Save verified user to CSV
        const verifiedUser = {
          ...pendingUser,
          emailVerified: true
        };
        
        const response = await fetch(`${API_URL}/api/save-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(verifiedUser)
        });

        if (!response.ok) {
          throw new Error('Failed to save user data');
        }
        
        localStorage.removeItem('pendingUser');
        localStorage.removeItem('pendingVerificationEmail');
        
        // Store session info
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', pendingUser.email);
        localStorage.setItem('userName', pendingUser.name);
        localStorage.setItem('userRole', pendingUser.role);
      } catch (error) {
        console.error('Error storing user data:', error);
        throw new Error('Failed to store user data');
      }
    }

    showSuccess('Email verified successfully! Redirecting...');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
  } catch (error) {
    console.error("OTP verification error:", error);
    showError(error.message || "Verification failed. Please try again.");
    verifyBtn.classList.remove('loading');
    verificationInProgress = false;
  }
});

// Resend Code Functionality
const resendBtn = document.getElementById('resendBtn');
const countdownSpan = document.getElementById('countdown');
let countdownInterval;
let timeLeft = 0;

resendBtn.addEventListener('click', async () => {
  if (timeLeft > 0) return;

  try {
    console.log("Resending OTP to:", userEmail);
    
    const response = await fetch(`${API_URL}/api/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: userEmail }),
    });

    if (!response.ok) {
      throw new Error('Failed to resend verification code');
    }

    startResendCountdown();
    showSuccess('Verification code resent successfully');
  } catch (error) {
    console.error("Error resending OTP:", error);
    showError('Failed to resend verification code');
  }
});

function startResendCountdown() {
  timeLeft = 30;
  resendBtn.disabled = true;
  updateCountdown();

  countdownInterval = setInterval(() => {
    timeLeft--;
    updateCountdown();

    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      resendBtn.disabled = false;
      countdownSpan.textContent = '';
    }
  }, 1000);
}

function updateCountdown() {
  countdownSpan.textContent = timeLeft > 0 ? `(${timeLeft}s)` : '';
}

// Error Handling
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;

  const form = document.getElementById('otpForm');
  form.insertBefore(errorDiv, form.firstChild);

  setTimeout(() => errorDiv.remove(), 3000);
}

function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;

  document.body.appendChild(successDiv);
  setTimeout(() => successDiv.remove(), 3000);
}

// Initialize countdown if there was a recent resend
if (localStorage.getItem('lastResendTime')) {
  const lastResend = parseInt(localStorage.getItem('lastResendTime'));
  const now = Date.now();
  const diff = Math.floor((now - lastResend) / 1000);

  if (diff < 30) {
    timeLeft = 30 - diff;
    startResendCountdown();
  }
}

// Temporary users object for demo
const users = {};