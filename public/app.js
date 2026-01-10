// Global variables
let map, trackingMap;
let marker, driverMarker;
let tripId = null;
let watchId = null;
let startTime = null;
let timerInterval = null;
let socket = null;
let currentTrip = null;
let selectedTripId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  initializeMaps();
  setupSocket();
  loadHistory();
  loadActiveTrips();
  setupServiceWorker();
  setupInstallPrompt();
});

// Tab switching
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  // Activate corresponding button
  event.target.classList.add('active');
  
  // Resize maps when switching tabs
  setTimeout(() => {
    if (map) map.invalidateSize();
    if (trackingMap) trackingMap.invalidateSize();
  }, 100);
}

// Initialize maps
function initializeMaps() {
  // Main map for rider
  map = L.map('map').setView([-26.2041, 28.0473], 13); // Johannesburg coordinates
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  // Tracking map for customer
  trackingMap = L.map('trackingMap').setView([-26.2041, 28.0473], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(trackingMap);
  
  // Get current location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;
      map.setView([latitude, longitude], 15);
    });
  }
}

// Setup WebSocket connection
function setupSocket() {
  socket = io();
  
  socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus(true);
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
  });
  
  socket.on('locationUpdate', (data) => {
    if (data.tripId === selectedTripId && driverMarker) {
      driverMarker.setLatLng([data.lat, data.lng]);
      trackingMap.setView([data.lat, data.lng], 15);
      updateTrackingInfo(data);
    }
  });
  
  socket.on('tripUpdate', (trip) => {
    if (trip._id === tripId) {
      updateTripInfo(trip);
    }
    loadActiveTrips();
  });
  
  socket.on('tripCompleted', (trip) => {
    loadHistory();
    loadActiveTrips();
  });
}

// Update connection status
function updateConnectionStatus(connected) {
  const statusElement = document.getElementById('connectionStatus');
  if (connected) {
    statusElement.textContent = 'Online';
    statusElement.style.background = '#27ae60';
  } else {
    statusElement.textContent = 'Offline';
    statusElement.style.background = '#e74c3c';
  }
}

// Start new trip
async function startTrip() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(async position => {
    const { latitude, longitude } = position.coords;
    
    // Create marker
    marker = L.marker([latitude, longitude], {
      icon: L.icon({
        iconUrl: 'https://unpkg.com/leaflet/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      })
    }).addTo(map);
    
    map.setView([latitude, longitude], 15);
    
    const riderName = document.getElementById('riderName').value;
    const rate = parseFloat(document.getElementById('rate').value);
    
    try {
      const response = await fetch('/api/trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          riderName,
          pickupLat: latitude,
          pickupLng: longitude,
          lat: latitude,
          lng: longitude,
          rate
        })
      });
      
      const trip = await response.json();
      tripId = trip._id;
      currentTrip = trip;
      startTime = new Date();
      
      // Start timer
      startTimer();
      
      // Start watching position
      watchId = navigator.geolocation.watchPosition(
        updateLocation,
        handleGeolocationError,
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
      
      // Update UI
      document.getElementById('startBtn').disabled = true;
      document.getElementById('finishBtn').disabled = false;
      document.getElementById('cancelBtn').disabled = false;
      
      updateTripInfo(trip);
      
      // Emit trip started
      socket.emit('driverStatus', {
        tripId: trip._id,
        status: 'active',
        riderName,
        lat: latitude,
        lng: longitude
      });
      
    } catch (error) {
      console.error('Error starting trip:', error);
      alert('Failed to start trip. Please try again.');
    }
  });
}

// Update location
function updateLocation(position) {
  const { latitude, longitude } = position.coords;
  
  if (marker) {
    marker.setLatLng([latitude, longitude]);
  }
  
  map.setView([latitude, longitude], 15);
  
  if (tripId) {
    // Calculate distance
    const distance = calculateDistance(
      currentTrip.pickupLat,
      currentTrip.pickupLng,
      latitude,
      longitude
    );
    
    const fare = distance * currentTrip.rate;
    
    // Update trip info
    updateTripInfo({
      distance: distance.toFixed(2),
      fare: fare.toFixed(2)
    });
    
    // Send update to server
    fetch('/api/update-location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: tripId,
        lat: latitude,
        lng: longitude,
        distance: parseFloat(distance.toFixed(2)),
        fare: parseFloat(fare.toFixed(2)),
        status: 'active'
      })
    });
    
    // Emit real-time update
    socket.emit('updateLocation', {
      tripId: tripId,
      lat: latitude,
      lng: longitude,
      distance: distance.toFixed(2),
      fare: fare.toFixed(2)
    });
  }
}

// Handle geolocation errors
function handleGeolocationError(error) {
  console.error('Geolocation error:', error);
  alert('Unable to get your location. Please check location permissions.');
}

// Finish trip
async function finishTrip() {
  if (!tripId || !navigator.geolocation) return;
  
  navigator.geolocation.getCurrentPosition(async position => {
    const { latitude, longitude } = position.coords;
    
    const distance = calculateDistance(
      currentTrip.pickupLat,
      currentTrip.pickupLng,
      latitude,
      longitude
    );
    
    const fare = distance * currentTrip.rate;
    
    try {
      const response = await fetch('/api/finish-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: tripId,
          lat: latitude,
          lng: longitude,
          distance: parseFloat(distance.toFixed(2)),
          fare: parseFloat(fare.toFixed(2))
        })
      });
      
      const trip = await response.json();
      
      // Stop watching position
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
      
      // Stop timer
      stopTimer();
      
      // Update UI
      document.getElementById('startBtn').disabled = false;
      document.getElementById('finishBtn').disabled = true;
      document.getElementById('cancelBtn').disabled = true;
      document.getElementById('status').textContent = 'Completed';
      
      // Clear trip data
      tripId = null;
      currentTrip = null;
      
      // Load updated history
      loadHistory();
      loadActiveTrips();
      
      alert(`Trip completed! Distance: ${distance.toFixed(2)}km, Fare: R${fare.toFixed(2)}`);
      
    } catch (error) {
      console.error('Error finishing trip:', error);
      alert('Failed to finish trip. Please try again.');
    }
  });
}

// Cancel trip
async function cancelTrip() {
  if (!tripId) return;
  
  if (confirm('Are you sure you want to cancel this trip?')) {
    try {
      await fetch('/api/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: tripId,
          status: 'cancelled'
        })
      });
      
      // Stop watching position
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
      
      // Stop timer
      stopTimer();
      
      // Update UI
      document.getElementById('startBtn').disabled = false;
      document.getElementById('finishBtn').disabled = true;
      document.getElementById('cancelBtn').disabled = true;
      document.getElementById('status').textContent = 'Cancelled';
      
      // Clear trip data
      tripId = null;
      currentTrip = null;
      
      // Load updated history
      loadHistory();
      loadActiveTrips();
      
    } catch (error) {
      console.error('Error cancelling trip:', error);
      alert('Failed to cancel trip. Please try again.');
    }
  }
}

// Load active trips for customer tracking
async function loadActiveTrips() {
  try {
    const response = await fetch('/api/active-trips');
    const trips = await response.json();
    
    const selectElement = document.getElementById('tripSelect');
    selectElement.innerHTML = '<option value="">Select a trip to track</option>';
    
    trips.forEach(trip => {
      const option = document.createElement('option');
      option.value = trip._id;
      option.textContent = `${trip.riderName} - R${trip.rate}/km (${trip.status})`;
      selectElement.appendChild(option);
    });
    
  } catch (error) {
    console.error('Error loading active trips:', error);
  }
}

// Select trip to track
function selectTripToTrack() {
  selectedTripId = document.getElementById('tripSelect').value;
  
  if (selectedTripId) {
    // Find the selected trip
    fetch('/api/trips')
      .then(response => response.json())
      .then(trips => {
        const trip = trips.find(t => t._id === selectedTripId);
        if (trip) {
          // Show tracking info
          document.getElementById('trackingInfo').classList.remove('hidden');
          
          // Update driver marker
          if (driverMarker) {
            trackingMap.removeLayer(driverMarker);
          }
          
          driverMarker = L.marker([trip.lat, trip.lng], {
            icon: L.icon({
              iconUrl: 'https://unpkg.com/leaflet/dist/images/marker-icon.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            })
          }).addTo(trackingMap);
          
          trackingMap.setView([trip.lat, trip.lng], 15);
          
          // Update tracking info
          updateTrackingInfo(trip);
          
          // Listen for updates
          socket.emit('trackTrip', selectedTripId);
        }
      });
  } else {
    document.getElementById('trackingInfo').classList.add('hidden');
    if (driverMarker) {
      trackingMap.removeLayer(driverMarker);
      driverMarker = null;
    }
  }
}

// Update tracking info
function updateTrackingInfo(trip) {
  document.getElementById('trackRiderName').textContent = trip.riderName || 'Unknown Rider';
  document.getElementById('trackDistance').textContent = trip.distance ? trip.distance.toFixed(2) : '0';
  document.getElementById('trackFare').textContent = trip.fare ? trip.fare.toFixed(2) : '0';
  document.getElementById('trackStatus').textContent = trip.status || 'Unknown';
  document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
}

// Navigate to driver
function navigateToDriver() {
  if (driverMarker) {
    const latLng = driverMarker.getLatLng();
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${latLng.lat},${latLng.lng}`, '_blank');
  }
}

// Load trip history
async function loadHistory() {
  try {
    const response = await fetch('/api/trips');
    const trips = await response.json();
    
    const historyBody = document.getElementById('historyBody');
    historyBody.innerHTML = '';
    
    let totalTrips = 0;
    let totalDistance = 0;
    let totalEarnings = 0;
    
    trips.forEach(trip => {
      const row = document.createElement('tr');
      
      const date = new Date(trip.createdAt).toLocaleDateString();
      const distance = trip.distance ? parseFloat(trip.distance).toFixed(2) : '0';
      const fare = trip.fare ? parseFloat(trip.fare).toFixed(2) : '0';
      
      row.innerHTML = `
        <td>${date}</td>
        <td>${trip.riderName || 'Unknown'}</td>
        <td>${distance} km</td>
        <td>R${trip.rate}/km</td>
        <td>R${fare}</td>
        <td class="status-${trip.status}">${trip.status}</td>
      `;
      
      historyBody.appendChild(row);
      
      // Update totals
      totalTrips++;
      totalDistance += parseFloat(distance);
      totalEarnings += parseFloat(fare);
    });
    
    // Update stats
    document.getElementById('totalTrips').textContent = totalTrips;
    document.getElementById('totalDistance').textContent = totalDistance.toFixed(2);
    document.getElementById('totalEarnings').textContent = totalEarnings.toFixed(2);
    
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

// Search trips
function searchTrips() {
  const searchTerm = document.getElementById('searchHistory').value.toLowerCase();
  const rows = document.querySelectorAll('#historyBody tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}

// Update trip info display
function updateTripInfo(trip) {
  if (trip.distance !== undefined) {
    document.getElementById('distance').textContent = trip.distance;
  }
  if (trip.fare !== undefined) {
    document.getElementById('fare').textContent = trip.fare;
  }
  if (trip.status) {
    document.getElementById('status').textContent = trip.status;
  }
}

// Start timer
function startTimer() {
  startTime = new Date();
  
  timerInterval = setInterval(() => {
    if (startTime) {
      const now = new Date();
      const diff = Math.floor((now - startTime) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      document.getElementById('duration').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

// Stop timer
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Setup service worker
function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }
}

// Setup install prompt
function setupInstallPrompt() {
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install prompt
    const installPrompt = document.createElement('div');
    installPrompt.className = 'install-prompt';
    installPrompt.innerHTML = `
      <div>
        <strong>Install Delivery Tracker App</strong>
        <p>Install for better experience</p>
      </div>
      <button class="install-btn" onclick="installApp()">Install</button>
      <button class="dismiss-btn" onclick="dismissInstallPrompt()">Later</button>
    `;
    
    document.body.appendChild(installPrompt);
  });
  
  window.installApp = function() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted install');
        }
        deferredPrompt = null;
      });
    }
    dismissInstallPrompt();
  };
  
  window.dismissInstallPrompt = function() {
    const prompt = document.querySelector('.install-prompt');
    if (prompt) {
      prompt.remove();
    }
  };
}