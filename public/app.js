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
    
    // Disable start button, enable stop button
    document.getElementById(`startBtn${driverId.charAt(6)}`).disabled = true;
    document.getElementById(`stopBtn${driverId.charAt(6)}`).disabled = false;
    
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
            timeout: 5000
        }
    );
    
    console.log(`Started tracking ${driverId}`);
}

// Stop tracking a driver
function stopTracking(driverId) {
    if (watchIds[driverId]) {
        navigator.geolocation.clearWatch(watchIds[driverId]);
        delete watchIds[driverId];
        
        // Enable start button, disable stop button
        document.getElementById(`startBtn${driverId.charAt(6)}`).disabled = false;
        document.getElementById(`stopBtn${driverId.charAt(6)}`).disabled = true;
        
        console.log(`Stopped tracking ${driverId}`);
    }
}

// Update driver position on server
function updateDriverPosition(driverId, lat, lng) {
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
        .catch(err => console.log("Could not update server:", err));
    
    // Update display
    updateDriverInfo();
}

// Update marker on map
function updateMarker(driverId, lat, lng) {
    const color = driverId === 'driver1' ? 'blue' : 'red';
    const iconHtml = `<div style="background-color:${color}; width:20px; height:20px; border-radius:50%; border:2px solid white;"></div>`;
    
    if (markers[driverId]) {
        markers[driverId].setLatLng([lat, lng]);
    } else {
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
            // Update local positions
            for (const driverId in drivers) {
                if (!watchIds[driverId]) { // Only update if not being tracked locally
                    const driver = drivers[driverId];
                    driverPositions[driverId] = driver;
                    updateMarker(driverId, driver.lat, driver.lng);
                }
            }
            updateDriverInfo();
        })
        .catch(err => console.log("Could not load drivers:", err));
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