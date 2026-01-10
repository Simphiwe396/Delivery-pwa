// QuickQuote Pro - Professional Delivery Calculator
let map;
let pickupMarker, dropoffMarker;
let quotes = JSON.parse(localStorage.getItem('deliveryQuotes') || '[]');
let currentPickup = null;
let currentDropoff = null;

// Initialize app
function initApp() {
    initMap();
    loadHistory();
    updateQuoteDisplay();
    
    // Show welcome message
    if (!localStorage.getItem('welcomeShown')) {
        setTimeout(() => {
            alert("🚚 Welcome to QuickQuote Pro!\n\n1. Set pickup & drop-off locations\n2. Choose your rate\n3. Get instant delivery quotes\n4. Save for your records");
            localStorage.setItem('welcomeShown', 'true');
        }, 1000);
    }
}

// Initialize map
function initMap() {
    map = L.map('map').setView([-26.2041, 28.0473], 13);
    
    // Professional map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CartoDB',
        maxZoom: 19
    }).addTo(map);
    
    // Add scale
    L.control.scale().addTo(map);
}

// Use current location
function useMyLocation(type) {
    if (!navigator.geolocation) {
        showAlert("Geolocation not available", "error");
        return;
    }
    
    showAlert("Getting your location...", "info");
    
    navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        if (type === 'pickup') {
            currentPickup = { lat, lng };
            updateMarker('pickup', lat, lng);
            reverseGeocode(lat, lng, 'pickupAddress');
            showAlert("Pickup location set to your current position", "success");
        } else {
            currentDropoff = { lat, lng };
            updateMarker('dropoff', lat, lng);
            reverseGeocode(lat, lng, 'dropoffAddress');
            showAlert("Drop-off location set to your current position", "success");
        }
        
        map.setView([lat, lng], 15);
    }, () => {
        showAlert("Could not get your location. Please enable location services.", "error");
    });
}

// Geocode current input
function geocodeCurrent(type) {
    const address = document.getElementById(`${type}Address`).value;
    if (!address) {
        showAlert("Please enter an address first", "warning");
        return;
    }
    
    showAlert("Searching for address...", "info");
    geocodeAddress(type);
}

// Update marker on map
function updateMarker(type, lat, lng) {
    // Professional truck icons
    const pickupIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: linear-gradient(135deg, #4361ee, #3a0ca3); 
                       width: 40px; height: 40px; border-radius: 50%; 
                       border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                       display: flex; align-items: center; justify-content: center;
                       font-size: 18px; color: white;">
                  <i class="fas fa-warehouse"></i>
               </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    });
    
    const dropoffIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: linear-gradient(135deg, #4cc9f0, #2a9d8f); 
                       width: 40px; height: 40px; border-radius: 50%; 
                       border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                       display: flex; align-items: center; justify-content: center;
                       font-size: 18px; color: white;">
                  <i class="fas fa-home"></i>
               </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    });
    
    if (type === 'pickup') {
        if (pickupMarker) map.removeLayer(pickupMarker);
        pickupMarker = L.marker([lat, lng], { icon: pickupIcon }).addTo(map)
            .bindPopup('<b>🚚 Pickup Location</b>');
    } else {
        if (dropoffMarker) map.removeLayer(dropoffMarker);
        dropoffMarker = L.marker([lat, lng], { icon: dropoffIcon }).addTo(map)
            .bindPopup('<b>📦 Drop-off Location</b>');
    }
    
    // Update route line
    updateRouteLine();
}

// Update route line between points
function updateRouteLine() {
    if (window.routeLine) map.removeLayer(window.routeLine);
    
    if (currentPickup && currentDropoff) {
        window.routeLine = L.polyline([
            [currentPickup.lat, currentPickup.lng],
            [currentDropoff.lat, currentDropoff.lng]
        ], {
            color: '#4361ee',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(map);
        
        // Fit map to show both points
        const bounds = L.latLngBounds(
            [currentPickup.lat, currentPickup.lng],
            [currentDropoff.lat, currentDropoff.lng]
        );
        map.fitBounds(bounds.pad(0.2));
    }
}

// Calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
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
        showAlert("Please set both pickup and drop-off locations", "warning");
        return;
    }
    
    const distance = calculateDistance(
        currentPickup.lat, currentPickup.lng,
        currentDropoff.lat, currentDropoff.lng
    );
    
    const rate = parseFloat(document.getElementById('rate').value);
    const total = distance * rate;
    
    // Update display
    document.getElementById('distanceDisplay').textContent = distance.toFixed(2) + ' km';
    document.getElementById('rateDisplay').textContent = rate.toFixed(2);
    document.getElementById('totalDisplay').textContent = 'R' + total.toFixed(2);
    
    // Estimate time (avg 40km/h in city)
    const estimatedMinutes = Math.max(10, Math.round((distance / 40) * 60));
    document.getElementById('timeDisplay').textContent = estimatedMinutes + '-'
        + (estimatedMinutes + 5) + ' min';
    
    // Show results
    document.getElementById('quoteResult').style.display = 'block';
    
    // Scroll to results
    document.getElementById('quoteResult').scrollIntoView({ behavior: 'smooth' });
    
    showAlert("Quote calculated successfully!", "success");
}

// Save quote
function saveQuote() {
    if (!currentPickup || !currentDropoff) {
        showAlert("Please calculate a quote first", "warning");
        return;
    }
    
    const distance = parseFloat(document.getElementById('distanceDisplay').textContent);
    const rate = parseFloat(document.getElementById('rate').value);
    const total = parseFloat(document.getElementById('totalDisplay').textContent.replace('R', ''));
    
    const quote = {
        id: Date.now(),
        pickup: currentPickup,
        dropoff: currentDropoff,
        distance: distance,
        rate: rate,
        total: total,
        date: new Date().toLocaleString('en-ZA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    };
    
    quotes.unshift(quote);
    if (quotes.length > 50) quotes = quotes.slice(0, 50);
    
    localStorage.setItem('deliveryQuotes', JSON.stringify(quotes));
    loadHistory();
    
    showAlert("Quote saved to history!", "success");
}

// Load history
function loadHistory() {
    const historyDiv = document.getElementById('history');
    const emptyDiv = document.getElementById('emptyHistory');
    
    if (quotes.length === 0) {
        emptyDiv.style.display = 'block';
        historyDiv.innerHTML = '';
        historyDiv.appendChild(emptyDiv);
        return;
    }
    
    emptyDiv.style.display = 'none';
    historyDiv.innerHTML = '';
    
    quotes.forEach(quote => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-header">
                <div class="history-date">
                    <i class="far fa-calendar"></i> ${quote.date}
                </div>
                <div class="history-price">R${quote.total.toFixed(2)}</div>
            </div>
            <div class="history-details">
                <div>
                    <small>Distance</small>
                    <div><strong>${quote.distance.toFixed(2)} km</strong></div>
                </div>
                <div>
                    <small>Rate</small>
                    <div><strong>R${quote.rate}/km</strong></div>
                </div>
                <div>
                    <button onclick="loadQuote(${quote.id})" style="
                        background: linear-gradient(135deg, #4361ee, #3a0ca3);
                        color: white; border: none; padding: 8px 15px;
                        border-radius: 5px; cursor: pointer; font-size: 14px;">
                        <i class="fas fa-redo"></i> Reload
                    </button>
                </div>
            </div>
        `;
        historyDiv.appendChild(div);
    });
}

// Load previous quote
function loadQuote(id) {
    const quote = quotes.find(q => q.id === id);
    if (quote) {
        currentPickup = quote.pickup;
        currentDropoff = quote.dropoff;
        
        updateMarker('pickup', quote.pickup.lat, quote.pickup.lng);
        updateMarker('dropoff', quote.dropoff.lat, quote.dropoff.lng);
        
        document.getElementById('rate').value = quote.rate;
        document.getElementById('pickupAddress').value = 'Previous pickup location';
        document.getElementById('dropoffAddress').value = 'Previous drop-off location';
        
        showAlert("Previous quote loaded!", "info");
        
        // Auto-calculate
        setTimeout(calculateQuote, 500);
    }
}

// Geocode address
function geocodeAddress(type) {
    const address = document.getElementById(`${type}Address`).value;
    if (!address) return;
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=za`)
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
                showAlert("Address found on map!", "success");
            } else {
                showAlert("Address not found. Please try a different address.", "error");
            }
        })
        .catch(() => {
            showAlert("Search service unavailable. Please try again.", "error");
        });
}

// Reverse geocode
function reverseGeocode(lat, lng, elementId) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`)
        .then(response => response.json())
        .then(data => {
            if (data.display_name) {
                // Shorten address for display
                const address = data.display_name.split(',')[0];
                document.getElementById(elementId).value = address;
            }
        });
}

// Start delivery
function startDelivery() {
    if (!currentPickup || !currentDropoff) {
        showAlert("Please set locations first", "warning");
        return;
    }
    
    if (confirm("Start delivery with this quote?\n\nTotal: " + document.getElementById('totalDisplay').textContent)) {
        showAlert("Delivery started! Tracking activated.", "success");
        // Here you would add tracking functionality
    }
}

// Show alert
function showAlert(message, type) {
    // Simple alert for now - could be enhanced with toast notifications
    console.log(`${type.toUpperCase()}: ${message}`);
}

// Update quote display
function updateQuoteDisplay() {
    if (quotes.length > 0) {
        const lastQuote = quotes[0];
        document.getElementById('distanceDisplay').textContent = lastQuote.distance.toFixed(2) + ' km';
        document.getElementById('rateDisplay').textContent = lastQuote.rate;
        document.getElementById('totalDisplay').textContent = 'R' + lastQuote.total.toFixed(2);
    }
}

// Initialize when page loads
window.onload = initApp;