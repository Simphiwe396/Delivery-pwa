// Simple app - NO DATABASE, everything in browser memory
let map;
let pickupMarker, dropoffMarker;
let quotes = JSON.parse(localStorage.getItem('deliveryQuotes') || '[]');
let currentPickup = null;
let currentDropoff = null;

// Initialize map
function initMap() {
    map = L.map('map').setView([-26.2041, 28.0473], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    loadHistory();
}

// Use current location
function useMyLocation(type) {
    if (!navigator.geolocation) {
        alert("Geolocation not available");
        return;
    }
    
    navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        if (type === 'pickup') {
            currentPickup = { lat, lng };
            updateMarker('pickup', lat, lng);
            reverseGeocode(lat, lng, 'pickupAddress');
        } else {
            currentDropoff = { lat, lng };
            updateMarker('dropoff', lat, lng);
            reverseGeocode(lat, lng, 'dropoffAddress');
        }
        
        map.setView([lat, lng], 15);
    });
}

// Update marker on map
function updateMarker(type, lat, lng) {
    const color = type === 'pickup' ? 'blue' : 'green';
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color:${color}; width:20px; height:20px; border-radius:50%; border:2px solid white;"></div>`,
        iconSize: [24, 24]
    });
    
    if (type === 'pickup') {
        if (pickupMarker) map.removeLayer(pickupMarker);
        pickupMarker = L.marker([lat, lng], { icon }).addTo(map)
            .bindPopup(type === 'pickup' ? 'Pickup Location' : 'Drop-off Location');
    } else {
        if (dropoffMarker) map.removeLayer(dropoffMarker);
        dropoffMarker = L.marker([lat, lng], { icon }).addTo(map)
            .bindPopup(type === 'pickup' ? 'Pickup Location' : 'Drop-off Location');
    }
}

// Simple distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Calculate quote
function calculateQuote() {
    if (!currentPickup || !currentDropoff) {
        alert("Please set both pickup and drop-off locations");
        return;
    }
    
    const distance = calculateDistance(
        currentPickup.lat, currentPickup.lng,
        currentDropoff.lat, currentDropoff.lng
    );
    
    const rate = parseFloat(document.getElementById('rate').value);
    const total = distance * rate;
    
    document.getElementById('distance').textContent = distance.toFixed(2);
    document.getElementById('rateDisplay').textContent = rate;
    document.getElementById('total').textContent = total.toFixed(2);
    
    // Draw line between points
    if (window.routeLine) map.removeLayer(window.routeLine);
    window.routeLine = L.polyline([
        [currentPickup.lat, currentPickup.lng],
        [currentDropoff.lat, currentDropoff.lng]
    ], { color: 'red' }).addTo(map);
    
    // Fit map to show both points
    const bounds = L.latLngBounds([currentPickup.lat, currentPickup.lng], [currentDropoff.lat, currentDropoff.lng]);
    map.fitBounds(bounds);
}

// Save quote to history
function saveQuote() {
    if (!currentPickup || !currentDropoff) {
        alert("Please calculate a quote first");
        return;
    }
    
    const distance = parseFloat(document.getElementById('distance').textContent);
    const rate = parseFloat(document.getElementById('rateDisplay').textContent);
    const total = parseFloat(document.getElementById('total').textContent);
    
    const quote = {
        id: Date.now(),
        pickup: currentPickup,
        dropoff: currentDropoff,
        distance: distance,
        rate: rate,
        total: total,
        date: new Date().toLocaleString()
    };
    
    quotes.unshift(quote); // Add to beginning
    if (quotes.length > 50) quotes = quotes.slice(0, 50); // Keep only last 50
    
    localStorage.setItem('deliveryQuotes', JSON.stringify(quotes));
    loadHistory();
    alert("Quote saved to history!");
}

// Load history
function loadHistory() {
    const historyDiv = document.getElementById('history');
    historyDiv.innerHTML = '';
    
    if (quotes.length === 0) {
        historyDiv.innerHTML = '<p>No quotes yet</p>';
        return;
    }
    
    quotes.forEach(quote => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <p><strong>${quote.date}</strong></p>
            <p>Distance: ${quote.distance.toFixed(2)} km</p>
            <p>Rate: R${quote.rate}/km</p>
            <p><strong>Total: R${quote.total.toFixed(2)}</strong></p>
            <button onclick="loadQuote(${quote.id})" style="padding:5px 10px; font-size:14px;">Load This Quote</button>
        `;
        historyDiv.appendChild(div);
    });
}

// Load a previous quote
function loadQuote(id) {
    const quote = quotes.find(q => q.id === id);
    if (quote) {
        currentPickup = quote.pickup;
        currentDropoff = quote.dropoff;
        
        updateMarker('pickup', quote.pickup.lat, quote.pickup.lng);
        updateMarker('dropoff', quote.dropoff.lat, quote.dropoff.lng);
        
        document.getElementById('rate').value = quote.rate;
        document.getElementById('distance').textContent = quote.distance.toFixed(2);
        document.getElementById('rateDisplay').textContent = quote.rate;
        document.getElementById('total').textContent = quote.total.toFixed(2);
        
        // Draw line
        if (window.routeLine) map.removeLayer(window.routeLine);
        window.routeLine = L.polyline([
            [quote.pickup.lat, quote.pickup.lng],
            [quote.dropoff.lat, quote.dropoff.lng]
        ], { color: 'red' }).addTo(map);
        
        const bounds = L.latLngBounds([quote.pickup.lat, quote.pickup.lng], [quote.dropoff.lat, quote.dropoff.lng]);
        map.fitBounds(bounds);
        
        alert("Quote loaded!");
    }
}

// Simple geocoding using OpenStreetMap
function geocodeAddress(type) {
    const address = document.getElementById(`${type}Address`).value;
    if (!address) return;
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                
                if (type === 'pickup') {
                    currentPickup = { lat, lng };
                    updateMarker('pickup', lat, lng);
                } else {
                    currentDropoff = { lat, lng };
                    updateMarker('dropoff', lat, lng);
                }
                
                map.setView([lat, lng], 15);
            } else {
                alert("Address not found");
            }
        });
}

// Reverse geocode to get address
function reverseGeocode(lat, lng, elementId) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(response => response.json())
        .then(data => {
            if (data.display_name) {
                document.getElementById(elementId).value = data.display_name;
            }
        });
}

// Start delivery (optional tracking)
function startDelivery() {
    if (!currentPickup || !currentDropoff) {
        alert("Please set locations first");
        return;
    }
    
    if (confirm("Start delivery with this quote?")) {
        // Simple tracking would start here
        alert("Delivery started! (Tracking would begin here)");
    }
}

// Initialize when page loads
window.onload = initMap;