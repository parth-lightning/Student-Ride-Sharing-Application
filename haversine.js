// haversine.js

// Function to calculate the Haversine distance between two points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const R = 6371e3; // Earth's radius in meters
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Function to get the user's location using the Geolocation API
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          resolve(userLocation);
        },
        (error) => {
          console.error('Error getting user location:', error);
          let errorMessage = 'Unable to retrieve your location.';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access was denied. Please enable location services to see nearby rides.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please try again later.';
              break;
            case error.TIMEOUT:
              errorMessage = 'The request to get your location timed out. Please try again.';
              break;
            case error.UNKNOWN_ERROR:
              errorMessage = 'An unknown error occurred while retrieving your location.';
              break;
          }
          
          reject(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      reject('Geolocation is not supported by this browser.');
    }
  });
}

// Function to filter rides based on the user's location
function filterRidesByLocation(rides, userLocation, maxDistance = 500) {
  if (!userLocation) return rides;
  
  return rides.filter((ride) => {
    const distance = haversineDistance(
      userLocation.lat,
      userLocation.lng,
      ride.fromCoords.lat,
      ride.fromCoords.lng
    );
    return distance <= maxDistance; // Only show rides within the specified distance (meters)
  });
}

// Export functions for use in other files
window.haversineDistance = haversineDistance;
window.getUserLocation = getUserLocation;
window.filterRidesByLocation = filterRidesByLocation;