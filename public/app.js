// Simple variables
let map;
let markers = {};
let watchIds = {};
let driverPositions = {};

// Initialize map
function initMap() {
    // Start with Johannesburg coordinates
    map = L.map('map').setView([-26.2041, 28.0473], 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            map.setView([position.coords.latitude, position.coords.longitude], 15);
        });
    }
    
    // Load existing drivers
    loadDrivers();
    
    // Update driver positions every 3 seconds
    setInterval(loadDrivers, 3000);
}

// Start tracking a driver
function startTracking(driverId) {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }
    
    console.log(`Starting tracking for ${driverId}`);
    
    // Disable start button, enable stop button
    const driverNum = driverId === 'driver1' ? '1' : '2';
    document.getElementById(`startBtn${driverNum}`).disabled = true;
    document.getElementById(`stopBtn${driverNum}`).disabled = false;
    
    // Clear any existing watch
    if (watchIds[driverId]) {
        navigator.geolocation.clearWatch(watchIds[driverId]);
    }
    
    // Start watching position
    watchIds[driverId] = navigator.geolocation.watchPosition(
        function(position) {
            updateDriverPosition(driverId, position.coords.latitude, position.coords.longitude);
        },
        function(error) {
            console.error("Geolocation error:", error);
            alert("Failed to get location");
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );
    
    console.log(`Started tracking ${driverId}`);
}

// Stop tracking a driver
function stopTracking(driverId) {
    console.log(`Stopping tracking for ${driverId}`);
    
    // Stop watching position
    if (watchIds[driverId]) {
        navigator.geolocation.clearWatch(watchIds[driverId]);
        delete watchIds[driverId];
        console.log(`Cleared watch for ${driverId}`);
    }
    
    // Enable start button, disable stop button
    const driverNum = driverId === 'driver1' ? '1' : '2';
    document.getElementById(`startBtn${driverNum}`).disabled = false;
    document.getElementById(`stopBtn${driverNum}`).disabled = true;
    
    // Remove marker from map
    if (markers[driverId]) {
        map.removeLayer(markers[driverId]);
        delete markers[driverId];
    }
    
    // Clear position
    delete driverPositions[driverId];
    
    // Update display
    updateDriverInfo();
    
    console.log(`Stopped tracking ${driverId}`);
    alert(`Stopped tracking ${driverId}`);
}

// Update driver position on server
function updateDriverPosition(driverId, lat, lng) {
    console.log(`Updating ${driverId}: ${lat}, ${lng}`);
    
    // Store locally
    driverPositions[driverId] = {
        lat: lat,
        lng: lng,
        lastUpdate: new Date()
    };
    
    // Update marker on map
    updateMarker(driverId, lat, lng);
    
    // Send to server
    fetch(`/api/update-location?driverId=${driverId}&lat=${lat}&lng=${lng}`)
        .then(response => {
            if (!response.ok) {
                console.log("Server update failed");
            }
        })
        .catch(err => console.log("Could not update server:", err));
    
    // Update display
    updateDriverInfo();
}

// Update marker on map
function updateMarker(driverId, lat, lng) {
    const color = driverId === 'driver1' ? 'blue' : 'red';
    const iconHtml = `<div style="background-color:${color}; width:20px; height:20px; border-radius:50%; border:2px solid white;"></div>`;
    
    if (markers[driverId]) {
        // Update existing marker
        markers[driverId].setLatLng([lat, lng]);
    } else {
        // Create new marker
        markers[driverId] = L.marker([lat, lng], {
            icon: L.divIcon({
                html: iconHtml,
                iconSize: [24, 24],
                className: 'driver-marker'
            })
        }).addTo(map);
        
        // Add popup
        markers[driverId].bindPopup(`<b>${driverId}</b><br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}`);
    }
}

// Center map on driver
function centerOnDriver(driverId) {
    if (driverPositions[driverId]) {
        const pos = driverPositions[driverId];
        map.setView([pos.lat, pos.lng], 15);
    } else {
        alert(`${driverId} position not available`);
    }
}

// Load all drivers from server
function loadDrivers() {
    fetch('/api/drivers')
        .then(response => response.json())
        .then(drivers => {
            // Update local positions for drivers not being tracked locally
            for (const driverId in drivers) {
                if (!watchIds[driverId]) { // Only update if not being tracked by this device
                    const driver = drivers[driverId];
                    driverPositions[driverId] = driver;
                    updateMarker(driverId, driver.lat, driver.lng);
                }
            }
            updateDriverInfo();
        })
        .catch(err => {
            // Silently ignore errors - app keeps working
        });
}

// Update driver information display
function updateDriverInfo() {
    const infoDiv = document.getElementById('driverInfo');
    let html = '';
    
    for (const driverId in driverPositions) {
        const pos = driverPositions[driverId];
        const timeAgo = Math.floor((new Date() - new Date(pos.lastUpdate)) / 1000);
        
        html += `
            <p>
                <strong>${driverId}:</strong> 
                ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}
                <span style="color:#666;">(${timeAgo} seconds ago)</span>
            </p>
        `;
    }
    
    if (html === '') {
        html = '<p>No drivers active</p>';
    }
    
    infoDiv.innerHTML = html;
}

// Initialize when page loads
window.onload = initMap;