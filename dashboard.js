// dashboard.js

// Set API URL based on environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1') 
  ? 'http://localhost:3000' 
  : window.location.protocol + '//' + window.location.hostname + ':3000';

// Dashboard state and variables
let currentView = 'dashboard';
let userStats = {
  totalRides: 0,
  moneySaved: 0,
  completed: 0,
  rating: 5
};

// Google Maps variables
let map;
let directionsService;
let directionsRenderer;
let fromAutocomplete;
let toAutocomplete;
let selectedFromPlace = null;
let selectedToPlace = null;
let userLocation = null;

//Mock data for previous rides
const mockRides = [
  {
    id: 1,
    from: 'VIT Pune',
    to: 'Phoenix Mall, Pune',
    date: '2024-01-15',
    status: 'Completed',
    price: '5',
    driver: 'John Doe',
    rating: 4.8,
    fromCoords: { lat: 18.4647, lng: 73.8483 }, // VIT Pune coordinates
    toCoords: { lat: 18.5599, lng: 73.9147 }, // Phoenix Mall coordinates
  },
  {
    id: 2,
    from: 'Pune Station',
    to: 'Amanora Mall',
    date: '2024-01-14',
    status: 'Completed',
    price: '4',
    driver: 'Jane Smith',
    rating: 4.5,
    fromCoords: { lat: 18.5285, lng: 73.8739 }, // Pune Station coordinates
    toCoords: { lat: 18.5179, lng: 73.9278 }, // Amanora Mall coordinates
  },
  {
    id: 3,
    from: 'Hinjewadi',
    to: 'Koregaon Park',
    date: '2024-01-13',
    status: 'Cancelled',
    price: '6',
    driver: 'Mike Johnson',
    rating: 0,
    fromCoords: { lat: 18.5913, lng: 73.7389 }, // Hinjewadi coordinates
    toCoords: { lat: 18.5362, lng: 73.8939 }, // Koregaon Park coordinates
  },
];

//Available rides
const availableRides = [
  {
    id: 4,
    from: 'VIT Pune',
    to: 'Deccan Gymkhana',
    date: '2024-01-20',
    time: '14:00',
    price: '5',
    seats: 3,
    driver: 'Alice Brown',
    fromCoords: { lat: 18.4647, lng: 73.8483 },
    toCoords: { lat: 18.5195, lng: 73.8553 },
  },
  {
    id: 5,
    from: 'Seasons Mall',
    to: 'VIT Pune',
    date: '2024-01-21',
    time: '09:00',
    price: '4',
    seats: 2,
    driver: 'Bob Wilson',
    fromCoords: { lat: 18.5089, lng: 73.9259 },
    toCoords: { lat: 18.4647, lng: 73.8483 },
  },
  {
    id: 6,
    from: 'FC Road',
    to: 'Magarpatta',
    date: '2024-01-22',
    time: '16:00',
    price: '6',
    seats: 4,
    driver: 'Carol Davis',
    fromCoords: { lat: 18.5236, lng: 73.8478 },
    toCoords: { lat: 18.5162, lng: 73.9276 },
  },
];

document.addEventListener('DOMContentLoaded', async () => {
  initializeDashboard();
  setupEventListeners();
  initializeGoogleMaps();

  // Request location permission and filter rides
  await requestLocationPermission();
  updateStatsDisplay();
});

// Function to request location permission
async function requestLocationPermission() {
  try {
    // Show location permission modal
    showLocationPermissionModal();
    
    // Get user location
    userLocation = await getUserLocation();
    console.log('User location:', userLocation);
    
    // Hide the permission modal
    hideLocationPermissionModal();
    
    // Filter rides based on the user's location
    const filteredRides = filterRidesByLocation(mockRides, userLocation, 500);
    updateRidesList(filteredRides);
    
    // Update available rides based on location
    const nearbyAvailableRides = filterRidesByLocation(availableRides, userLocation, 500);
    updateAvailableRidesList(nearbyAvailableRides);
    
    // Show success notification
    showNotification('Location access granted. Showing rides near you!', 'success');
  } catch (error) {
    console.error('Error getting location:', error);
    hideLocationPermissionModal();
    showNotification(error.message || 'Unable to access your location. Showing all rides instead.', 'error');
    
    // Show all rides if location access is denied
    updateRidesList(mockRides);
    updateAvailableRidesList(availableRides);
  }
}

// Function to show location permission modal
function showLocationPermissionModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'locationPermissionModal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Location Access</h2>
      <p>We need your location to find rides near you. Please allow location access when prompted.</p>
      <div class="location-icon">📍</div>
      <p class="loading-text">Waiting for permission...</p>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Function to hide location permission modal
function hideLocationPermissionModal() {
  const modal = document.getElementById('locationPermissionModal');
  if (modal) {
    modal.remove();
  }
}

// Function to show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 5000);
}

function initializeGoogleMaps() {
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
}

function initializeAutocomplete(fromInput, toInput) {
  const options = {
    componentRestrictions: { country: 'in' },
    types: ['geocode', 'establishment'],
    bounds: new google.maps.LatLngBounds(
      new google.maps.LatLng(18.4088, 73.737), // SW bounds of Pune
      new google.maps.LatLng(18.6089, 73.9619) // NE bounds of Pune
    ),
    strictBounds: true,
  };

  fromAutocomplete = new google.maps.places.Autocomplete(fromInput, options);
  toAutocomplete = new google.maps.places.Autocomplete(toInput, options);

  fromAutocomplete.addListener('place_changed', () => {
    selectedFromPlace = fromAutocomplete.getPlace();
  });

  toAutocomplete.addListener('place_changed', () => {
    selectedToPlace = toAutocomplete.getPlace();
  });
}

async function initializeDashboard() {
  const userEmail = localStorage.getItem('userEmail') || 'demo@example.com';
  const userName = localStorage.getItem('userName') || 'Demo User';

  document.getElementById('userEmail').textContent = userEmail;
  document.getElementById('userName').textContent = userName;

  try {
    // Fetch user stats from the database
    const response = await fetch(`${API_URL}/api/user/${userEmail}`);
    if (response.ok) {
      const userData = await response.json();
      userStats = {
        totalRides: userData.totalRides || 0,
        moneySaved: userData.moneySaved || 0,
        completed: userData.completed || 0,
        rating: userData.rating || 5
      };
    }

    // Fetch user's ride history
    const historyResponse = await fetch(`${API_URL}/api/ride-history/${userEmail}`);
    if (historyResponse.ok) {
      const { rides } = await historyResponse.json();
      updateRidesList(rides);
    } else {
      // If there's an error, show empty state
      updateRidesList([]);
    }
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showNotification('Failed to load dashboard data', 'error');
    // Use default values if fetch fails
    userStats = {
      totalRides: 0,
      moneySaved: 0,
      completed: 0,
      rating: 5
    };
    updateRidesList([]);
  }

  updateStatsDisplay();
}

function setupEventListeners() {
  document.querySelectorAll('.sidebar-menu a').forEach((link) => {
    if (link.getAttribute('href') !== 'index.html') {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = e.target.getAttribute('href').replace('#', '');
        switchView(view);
      });
    }
  });
}

function updateRidesList(rides = []) {
  const ridesList = document.getElementById('rides-list');
  
  if (!rides || rides.length === 0) {
    ridesList.innerHTML = `
      <div class="no-rides-message">
        <p>No previous rides found.</p>
      </div>
    `;
    return;
  }

  ridesList.innerHTML = rides
    .map(ride => {
      const rideDate = new Date(ride.dateTime);
      const formattedDate = rideDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const formattedTime = rideDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const roleLabel = ride.role === 'driver' ? 'Passenger' : 'Driver';
      const otherUserEmail = ride.role === 'driver' ? ride.passengerEmail : ride.driverEmail;

      return `
        <div class="ride-card ${ride.status.toLowerCase()}">
          <h3>${ride.from} → ${ride.to}</h3>
          <div class="ride-info">Date: ${formattedDate}</div>
          <div class="ride-info">Time: ${formattedTime}</div>
          <div class="ride-info">Price: ₹${ride.price}</div>
          <div class="ride-info">${roleLabel}: ${otherUserEmail || 'N/A'}</div>
          <div class="ride-info">Status: <span class="status-badge ${ride.status.toLowerCase()}">${ride.status}</span></div>
          ${
            ride.status === 'completed' && ride.rating
              ? `
              <div class="ride-info">
                  <div class="rating">
                      Rating: ${'⭐'.repeat(Math.floor(ride.rating))}
                      <span class="rating-number">(${ride.rating})</span>
                  </div>
              </div>
              `
              : ''
          }
          <button class="view-route-btn" onclick="showRouteMap('${ride.id}')">
              <span class="route-icon">🗺️</span> View Route
          </button>
          ${
            userLocation
              ? `
              <div class="distance-info">
                <span class="distance-icon">📍</span> 
                <span class="distance-text">${calculateDistanceFromUser(ride.fromCoords)} from you</span>
              </div>
              `
              : ''
          }
        </div>
      `;
    })
    .join('');
}

// Function to update available rides list
function updateAvailableRidesList(rides) {
  const ridesList = document.getElementById('available-rides-list');
  if (!ridesList) return;

  ridesList.innerHTML = '';

  if (!rides || rides.length === 0) {
    ridesList.innerHTML = '<p class="no-rides">No rides available</p>';
    return;
  }

  rides.forEach(ride => {
    const rideElement = document.createElement('div');
    rideElement.className = 'ride-card';
    
    // Format date
    const rideDate = new Date(ride.dateTime || `${ride.date}T${ride.time}`);
    const formattedDate = rideDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    rideElement.innerHTML = `
      <div class="ride-info">
        <div class="ride-route">
          <span class="from">${ride.from}</span>
          <span class="arrow">→</span>
          <span class="to">${ride.to}</span>
        </div>
        <div class="ride-details">
          <span class="date">${formattedDate}</span>
          <span class="time">${ride.time}</span>
          <span class="price">₹${ride.price}</span>
          <span class="seats">${ride.seats} seats</span>
        </div>
        <div class="driver-info">
          <span class="driver">Driver: ${ride.driver}</span>
        </div>
      </div>
      <div class="ride-actions">
        <button onclick="showRideDetailsModal('${ride.id}')" class="btn-details">View Details</button>
      </div>
    `;

    ridesList.appendChild(rideElement);
  });
}

// Function to show ride details modal
async function showRideDetailsModal(rideId) {
  try {
    // Find the ride from the available rides
    const response = await fetch(`${API_URL}/api/search-rides`);
    const data = await response.json();
    const ride = data.rides.find(r => r.id === rideId);

    if (!ride) {
      showNotification('Ride not found', 'error');
      return;
    }

    // Calculate route details using Google Maps API
    const routeDetails = await calculateRouteDetails(ride.fromCoords, ride.toCoords);

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'rideDetailsModal';

    // Format date
    const rideDate = new Date(ride.dateTime || `${ride.date}T${ride.time}`);
    const formattedDate = rideDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    modal.innerHTML = `
      <div class="modal-content">
        <h2>Ride Details</h2>
        <div class="ride-details-container">
          <div class="detail-group">
            <label>From:</label>
            <span>${ride.from}</span>
          </div>
          <div class="detail-group">
            <label>To:</label>
            <span>${ride.to}</span>
          </div>
          <div class="detail-group">
            <label>Date:</label>
            <span>${formattedDate}</span>
          </div>
          <div class="detail-group">
            <label>Time:</label>
            <span>${ride.time}</span>
          </div>
          <div class="detail-group">
            <label>Price:</label>
            <span>₹${ride.price}</span>
          </div>
          <div class="detail-group">
            <label>Available Seats:</label>
            <span>${ride.seats}</span>
          </div>
          <div class="detail-group">
            <label>Driver:</label>
            <span>${ride.driver}</span>
          </div>
          <div class="detail-group">
            <label>Distance:</label>
            <span>${routeDetails.distance}</span>
          </div>
          <div class="detail-group">
            <label>Estimated Time:</label>
            <span>${routeDetails.duration}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" onclick="showRouteMap('${ride.id}')">View Route</button>
          <button class="btn btn-primary" onclick="bookRide('${ride.id}')">Book Ride</button>
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('Error showing ride details:', error);
    showNotification('Failed to load ride details', 'error');
  }
}

// Function to calculate route details using Google Maps API
async function calculateRouteDetails(origin, destination) {
  return new Promise((resolve, reject) => {
    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status === 'OK') {
          const route = response.routes[0];
          const leg = route.legs[0];
          resolve({
            distance: leg.distance.text,
            duration: leg.duration.text
          });
        } else {
          reject(new Error('Failed to calculate route'));
        }
      }
    );
  });
}

// Function to show all rides regardless of distance
function showAllRides() {
  updateRidesList(mockRides, true);
  showNotification('Showing all available rides', 'info');
}

// Function to calculate and format distance from user
function calculateDistanceFromUser(coords) {
  if (!userLocation) return 'Unknown distance';
  
  const distance = haversineDistance(
    userLocation.lat,
    userLocation.lng,
    coords.lat,
    coords.lng
  );
  
  if (distance < 1000) {
    return `${Math.round(distance)} meters`;
  } else {
    return `${(distance / 1000).toFixed(1)} km`;
  }
}

// Function to update stats
function updateStats() {
  document.querySelectorAll('[data-stat]').forEach((element) => {
    const stat = element.getAttribute('data-stat');
    if (userStats[stat] !== undefined) {
      element.textContent = userStats[stat];
    }
  });
}

// Function to switch views
function switchView(view) {
  document.querySelectorAll('.sidebar-menu a').forEach((link) => {
    link.classList.remove('active');
  });
  
  document.querySelector(`.sidebar-menu a[href="#${view}"]`).classList.add('active');
  currentView = view;
  
  // Implement view switching logic here
  console.log(`Switched to ${view} view`);
}

// Function to show route map
async function showRouteMap(rideId) {
  try {
    // Get the ride details from Firebase
    const response = await fetch(`${API_URL}/api/search-rides`);
    const data = await response.json();
    const ride = data.rides.find(r => r.id === rideId);
    
    if (!ride) {
      showNotification('Ride not found', 'error');
      return;
    }

    // Create map modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'mapModal';
    
    modal.innerHTML = `
      <div class="modal-content map-modal-content">
        <h2>Route Map</h2>
        <p><strong>From:</strong> ${ride.from}</p>
        <p><strong>To:</strong> ${ride.to}</p>
        <div id="map" style="height: 400px; width: 100%;"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize map
    map = new google.maps.Map(document.getElementById('map'), {
      center: ride.fromCoords,
      zoom: 12,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      ],
    });

    // Initialize directions renderer
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    
    // Calculate and display route
    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: ride.fromCoords,
        destination: ride.toCoords,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(response);
          
          // Get route details
          const route = response.routes[0];
          const leg = route.legs[0];
          
          // Add distance and duration info to the modal
          const infoDiv = document.createElement('div');
          infoDiv.className = 'route-info';
          infoDiv.innerHTML = `
            <p><strong>Distance:</strong> ${leg.distance.text}</p>
            <p><strong>Estimated Time:</strong> ${leg.duration.text}</p>
          `;
          
          document.querySelector('.map-modal-content').insertBefore(
            infoDiv,
            document.querySelector('.modal-actions')
          );
        } else {
          console.error('Directions request failed due to ' + status);
          
          // Fallback to simple markers if directions fail
          new google.maps.Marker({
            position: ride.fromCoords,
            map: map,
            title: ride.from,
            icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
          });
          
          new google.maps.Marker({
            position: ride.toCoords,
            map: map,
            title: ride.to,
            icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          });
          
          showNotification('Could not calculate route. Showing markers instead.', 'warning');
        }
      }
    );
    
    // Add user location marker if available
    if (userLocation) {
      new google.maps.Marker({
        position: userLocation,
        map: map,
        title: 'Your Location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      });
    }
  } catch (error) {
    console.error('Error showing route map:', error);
    showNotification('Failed to load map. Please try again.', 'error');
  }
}

// Function to show search modal
function showSearchModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'searchModal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Search Rides</h2>
      <div class="form-group">
        <label for="search-from">From</label>
        <input type="text" id="search-from" placeholder="Enter pickup location">
      </div>
      <div class="form-group">
        <label for="search-to">To</label>
        <input type="text" id="search-to" placeholder="Enter destination">
      </div>
      <div class="form-group">
        <label for="search-date">Date</label>
        <input type="date" id="search-date">
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="performSearch()">Search</button>
        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Initialize autocomplete for location inputs
  initializeAutocomplete(
    document.getElementById('search-from'),
    document.getElementById('search-to')
  );
}

// Function to perform the search
async function performSearch() {
  try {
    const fromInput = document.getElementById('search-from');
    const toInput = document.getElementById('search-to');
    const dateInput = document.getElementById('search-date');

    // Show loading state
    const searchButton = document.querySelector('#searchModal button.btn');
    searchButton.textContent = 'Searching...';
    searchButton.disabled = true;

    // Validate inputs
    if (!fromInput.value && !toInput.value && !dateInput.value) {
      showNotification('Please enter at least one search criteria', 'error');
      return;
    }

    const searchCriteria = {
      from: fromInput.value.trim(),
      to: toInput.value.trim(),
      date: dateInput.value
    };

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (searchCriteria.from) queryParams.append('from', searchCriteria.from);
    if (searchCriteria.to) queryParams.append('to', searchCriteria.to);
    if (searchCriteria.date) queryParams.append('date', searchCriteria.date);

    console.log('Searching with criteria:', searchCriteria);
    const response = await fetch(`${API_URL}/api/search-rides?${queryParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch rides');
    }

    const data = await response.json();
    console.log('Search results:', data);
    
    // Close search modal
    document.getElementById('searchModal').remove();

    if (!data.rides || data.rides.length === 0) {
      showNotification('No rides found for your criteria', 'info');
      return;
    }

    // Show notification with number of rides found
    showNotification(`Found ${data.rides.length} rides`, 'success');
    
    // Create a modal to display search results
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'searchResultsModal';
    
    let ridesHTML = data.rides.map(ride => {
      const rideDate = new Date(ride.dateTime);
      const formattedDate = rideDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      const formattedTime = rideDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="ride-card">
          <div class="ride-info">
            <div class="ride-route">
              <span class="from">${ride.from}</span>
              <span class="arrow">→</span>
              <span class="to">${ride.to}</span>
            </div>
            <div class="ride-details">
              <span class="date">${formattedDate}</span>
              <span class="time">${formattedTime}</span>
              <span class="price">₹${ride.price}</span>
              <span class="seats">${ride.seats} seats</span>
            </div>
            <div class="driver-info">
              <span class="driver">Driver: ${ride.driver}</span>
            </div>
          </div>
          <div class="ride-actions">
            <button class="btn btn-primary" onclick="showRideDetailsModal('${ride.id}')">View Details</button>
          </div>
        </div>
      `;
    }).join('');

    if (ridesHTML === '') {
      ridesHTML = '<p class="no-rides">No rides available</p>';
    }

    modal.innerHTML = `
      <div class="modal-content search-results-content">
        <h2>Search Results</h2>
        <div class="search-criteria">
          ${searchCriteria.from ? `<p><strong>From:</strong> ${searchCriteria.from}</p>` : ''}
          ${searchCriteria.to ? `<p><strong>To:</strong> ${searchCriteria.to}</p>` : ''}
          ${searchCriteria.date ? `<p><strong>Date:</strong> ${new Date(searchCriteria.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
        </div>
        <div class="rides-list">
          ${ridesHTML}
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('Error searching rides:', error);
    showNotification('Failed to search rides. Please try again.', 'error');
  } finally {
    // Reset button state if modal still exists
    const modal = document.getElementById('searchModal');
    if (modal) {
      const searchButton = modal.querySelector('button.btn');
      searchButton.textContent = 'Search';
      searchButton.disabled = false;
    }
  }
}

// Function to show booking modal
function showBookingModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Book a Ride</h2>
      <div class="form-group">
        <label for="booking-from">From</label>
        <input type="text" id="booking-from" placeholder="Enter pickup location">
      </div>
      <div class="form-group">
        <label for="booking-to">To</label>
        <input type="text" id="booking-to" placeholder="Enter destination">
      </div>
      <div class="form-group">
        <label for="booking-date">Date</label>
        <input type="date" id="booking-date">
      </div>
      <div class="form-group">
        <label for="booking-time">Time</label>
        <input type="time" id="booking-time">
      </div>
      <div class="form-group">
        <label for="booking-seats">Seats Needed</label>
        <input type="number" id="booking-seats" min="1" max="4" value="1">
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="bookRide()">Book</button>
        <button class="btn" onclick="this.closest('.modal').remove()">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Initialize autocomplete for location inputs
  initializeAutocomplete(
    document.getElementById('booking-from'),
    document.getElementById('booking-to')
  );
}

// Function to show new ride modal
function showNewRideModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'newRideModal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Post New Ride</h2>
      <div class="form-group">
        <label for="new-ride-from">From</label>
        <input type="text" id="new-ride-from" placeholder="Enter pickup location" required>
      </div>
      <div class="form-group">
        <label for="new-ride-to">To</label>
        <input type="text" id="new-ride-to" placeholder="Enter destination" required>
      </div>
      <div class="form-group">
        <label for="new-ride-date">Date</label>
        <input type="date" id="new-ride-date" required>
      </div>
      <div class="form-group">
        <label for="new-ride-time">Time</label>
        <input type="time" id="new-ride-time" required>
      </div>
      <div class="form-group">
        <label for="new-ride-seats">Available Seats</label>
        <input type="number" id="new-ride-seats" min="1" max="4" value="1" required>
      </div>
      <div class="form-group">
        <label for="new-ride-price">Price per Seat (₹)</label>
        <input type="number" id="new-ride-price" min="0" step="10" value="50" required>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="postRide()">Post</button>
        <button class="btn" onclick="this.closest('.modal').remove()">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Initialize autocomplete for location inputs
  initializeAutocomplete(
    document.getElementById('new-ride-from'),
    document.getElementById('new-ride-to')
  );

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('new-ride-date').min = today;
}

// Function to post a new ride
async function postRide() {
  try {
    const fromInput = document.getElementById('new-ride-from');
    const toInput = document.getElementById('new-ride-to');
    const dateInput = document.getElementById('new-ride-date');
    const timeInput = document.getElementById('new-ride-time');
    const seatsInput = document.getElementById('new-ride-seats');
    const priceInput = document.getElementById('new-ride-price');

    // Validate all required fields
    if (!fromInput.value || !toInput.value || !dateInput.value || !timeInput.value || !seatsInput.value || !priceInput.value) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    // Get coordinates from Places Autocomplete
    const fromPlace = fromAutocomplete.getPlace();
    const toPlace = toAutocomplete.getPlace();

    if (!fromPlace || !fromPlace.geometry || !toPlace || !toPlace.geometry) {
      showNotification('Please select valid locations from the suggestions', 'error');
      return;
    }

    // Show loading state
    const postButton = document.querySelector('#newRideModal button.btn');
    const originalText = postButton.textContent;
    postButton.textContent = 'Posting...';
    postButton.disabled = true;

    // Convert date and time to proper format
    const dateStr = dateInput.value;
    const timeStr = timeInput.value;
    const dateTime = new Date(`${dateStr}T${timeStr}`);

    if (isNaN(dateTime.getTime())) {
      showNotification('Invalid date or time format', 'error');
      return;
    }

    const rideData = {
      from: fromInput.value,
      to: toInput.value,
      date: dateStr,
      time: timeStr,
      dateTime: dateTime.toISOString(),
      seats: parseInt(seatsInput.value),
      price: parseFloat(priceInput.value),
      driver: localStorage.getItem('userName'),
      driverEmail: localStorage.getItem('userEmail'),
      fromCoords: {
        lat: fromPlace.geometry.location.lat(),
        lng: fromPlace.geometry.location.lng()
      },
      toCoords: {
        lat: toPlace.geometry.location.lat(),
        lng: toPlace.geometry.location.lng()
      }
    };

    const response = await fetch(`${API_URL}/api/save-ride`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rideData)
    });

    const responseData = await response.json();

    if (!responseData.success) {
      throw new Error(responseData.error || 'Failed to save ride');
    }

    // Update user stats
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    userData.totalRides = (userData.totalRides || 0) + 1;
    localStorage.setItem('userData', JSON.stringify(userData));
    
    // Update display
    userStats.totalRides = userData.totalRides;
    updateStatsDisplay();

    showNotification(responseData.message || 'Ride posted successfully!', 'success');
    document.getElementById('newRideModal').remove();
    
    // Refresh available rides list
    const ridesResponse = await fetch(`${API_URL}/api/search-rides`);
    if (ridesResponse.ok) {
      const { rides } = await ridesResponse.json();
      updateAvailableRidesList(rides);
    }
  } catch (error) {
    console.error('Error posting ride:', error);
    showNotification(error.message || 'Failed to post ride. Please try again.', 'error');
  } finally {
    // Reset button state if modal still exists
    const modal = document.getElementById('newRideModal');
    if (modal) {
      const postButton = modal.querySelector('button.btn');
      postButton.textContent = 'Post';
      postButton.disabled = false;
    }
  }
}

// Function to book a ride
async function bookRide(rideId) {
  try {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      showNotification('Please log in to book a ride', 'error');
      return;
    }

    // Show loading state
    showNotification('Booking your ride...', 'info');

    // Get the ride details
    const response = await fetch(`${API_URL}/api/search-rides`);
    const data = await response.json();
    const ride = data.rides.find(r => r.id === rideId);

    if (!ride) {
      showNotification('Ride not found', 'error');
      return;
    }

    // Book the ride
    const bookingResponse = await fetch(`${API_URL}/api/book-ride/${rideId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail: userEmail
      })
    });

    const bookingData = await bookingResponse.json();

    if (!bookingData.success) {
      throw new Error(bookingData.error || 'Failed to book ride');
    }

    // Calculate money saved (half of the ride price)
    const moneySaved = parseFloat(ride.price) / 2;

    // Update user's stats in the database
    await fetch(`${API_URL}/api/update-user/${userEmail}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        moneySaved: userStats.moneySaved + moneySaved,
        completed: userStats.completed + 1
      })
    });

    // Update local user stats
    userStats.moneySaved += moneySaved;
    userStats.completed++;
    updateStatsDisplay();

    // Close the details modal if it's open
    const detailsModal = document.getElementById('rideDetailsModal');
    if (detailsModal) {
      detailsModal.remove();
    }

    showNotification('Ride booked successfully!', 'success');

    // Refresh the ride history
    const historyResponse = await fetch(`${API_URL}/api/ride-history/${userEmail}`);
    if (historyResponse.ok) {
      const { rides } = await historyResponse.json();
      updateRidesList(rides);
    }
  } catch (error) {
    console.error('Error booking ride:', error);
    showNotification(error.message || 'Failed to book ride. Please try again.', 'error');
  }
}

// Function to update stats display
function updateStatsDisplay() {
  document.querySelector('[data-stat="totalRides"]').textContent = userStats.totalRides;
  document.querySelector('[data-stat="moneySaved"]').textContent = `₹${userStats.moneySaved.toFixed(2)}`;
  document.querySelector('[data-stat="completed"]').textContent = userStats.completed;
  document.querySelector('[data-stat="rating"]').textContent = userStats.rating.toFixed(1);
}

// Handle logout
function handleLogout(event) {
  event.preventDefault();
  localStorage.clear();
  window.location.href = 'index.html';
}