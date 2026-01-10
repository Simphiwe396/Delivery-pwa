// QuickQuote Pro - Professional Delivery Calculator (No Map Version)
let quotes = JSON.parse(localStorage.getItem('deliveryQuotes') || '[]');
let currentPickup = null;
let currentDropoff = null;
let isOnline = navigator.onLine;

// South African Cities Database
const saCities = {
    // Gauteng
    "johannesburg": [-26.2041, 28.0473],
    "pretoria": [-25.7479, 28.2293],
    "kempton park": [-26.1103, 28.2285],
    "sandton": [-26.107, 28.0517],
    "randburg": [-26.0946, 28.0012],
    "midrand": [-25.989, 28.128],
    "centurion": [-25.874, 28.229],
    "soweto": [-26.2678, 27.8585],
    "alberton": [-26.267, 28.122],
    "roodepoort": [-26.1625, 27.8725],
    "boksburg": [-26.211, 28.259],
    "benoni": [-26.1833, 28.3167],
    "springs": [-26.25, 28.4],
    "brakpan": [-26.236, 28.369],
    "krugersdorp": [-26.1, 27.7667],
    "carletonville": [-26.361, 27.398],
    "vereeniging": [-26.673, 27.926],
    "vanderbijlpark": [-26.699, 27.786],
    
    // Western Cape
    "cape town": [-33.9249, 18.4241],
    "stellenbosch": [-33.932, 18.860],
    "paarl": [-33.734, 18.975],
    "wellington": [-33.640, 19.011],
    "worcester": [-33.646, 19.448],
    "george": [-33.988, 22.453],
    "mossel bay": [-34.183, 22.146],
    
    // KwaZulu-Natal
    "durban": [-29.8587, 31.0218],
    "pietermaritzburg": [-29.601, 30.379],
    "richards bay": [-28.780, 32.037],
    "newcastle": [-27.758, 29.931],
    "ladysmith": [-28.560, 29.780],
    
    // Eastern Cape
    "port elizabeth": [-33.9608, 25.6022],
    "east london": [-33.029, 27.854],
    "grahamstown": [-33.311, 26.525],
    "queenstown": [-31.897, 26.875],
    
    // Free State
    "bloemfontein": [-29.0852, 26.1596],
    "welkom": [-27.977, 26.735],
    "kroonstad": [-27.650, 27.234],
    "bethlehem": [-28.231, 28.307],
    
    // Mpumalanga
    "nelspruit": [-25.4745, 30.9703],
    "witbank": [-25.874, 29.255],
    "middelburg": [-25.775, 29.465],
    "ermelo": [-26.533, 29.985],
    
    // Limpopo
    "polokwane": [-23.8962, 29.4486],
    "tzaneen": [-23.833, 30.163],
    "phalaborwa": [-23.945, 31.141],
    
    // North West
    "rustenburg": [-25.654, 27.255],
    "potchefstroom": [-26.7167, 27.1],
    "klerksdorp": [-26.867, 26.668],
    "mahikeng": [-25.865, 25.644],
    
    // Northern Cape
    "kimberley": [-28.7282, 24.7499],
    "upington": [-28.457, 21.242],
    "springbok": [-29.664, 17.886],
    
    // Major Shopping Centers
    "mall of africa": [-26.051, 28.109],
    "menlyn mall": [-25.783, 28.275],
    "gateway mall": [-29.758, 31.059],
    "cavendish square": [-33.989, 18.464],
    "tyger valley": [-33.846, 18.637],
    
    // Airports
    "or tambo airport": [-26.133, 28.246],
    "cape town international": [-33.965, 18.602],
    "king shaka airport": [-29.614, 31.120]
};

// Initialize app
function initApp() {
    checkOnlineStatus();
    loadHistory();
    setupEventListeners();
    
    // Show welcome
    if (!localStorage.getItem('welcomeShown')) {
        setTimeout(() => {
            showMessage("🚚 Welcome to QuickQuote Pro!", "info");
            localStorage.setItem('welcomeShown', 'true');
        }, 1000);
    }
}

// Check online/offline status
function checkOnlineStatus() {
    isOnline = navigator.onLine;
    document.body.classList.toggle('offline', !isOnline);
    
    if (!isOnline) {
        showMessage("⚡ Working offline - Quotes saved locally", "warning");
    }
}

// Setup event listeners
function setupEventListeners() {
    // Online/offline detection
    window.addEventListener('online', () => {
        isOnline = true;
        document.body.classList.remove('offline');
        showMessage("✅ Back online", "success");
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        document.body.classList.add('offline');
        showMessage("⚡ Working offline", "warning");
    });
    
    // Enter key for address fields
    document.getElementById('pickupAddress').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') geocodeAddress('pickup');
    });
    
    document.getElementById('dropoffAddress').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') geocodeAddress('dropoff');
    });
    
    // Auto-search when typing stops
    let pickupTimeout, dropoffTimeout;
    document.getElementById('pickupAddress').addEventListener('input', (e) => {
        clearTimeout(pickupTimeout);
        pickupTimeout = setTimeout(() => {
            if (e.target.value.length > 2) {
                geocodeAddress('pickup');
            }
        }, 1000);
    });
    
    document.getElementById('dropoffAddress').addEventListener('input', (e) => {
        clearTimeout(dropoffTimeout);
        dropoffTimeout = setTimeout(() => {
            if (e.target.value.length > 2) {
                geocodeAddress('dropoff');
            }
        }, 1000);
    });
}

// Use current location
function useMyLocation(type) {
    if (!navigator.geolocation) {
        showMessage("Geolocation not available", "error");
        return;
    }
    
    showMessage("Getting your location...", "info");
    
    navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        if (type === 'pickup') {
            currentPickup = { lat, lng };
            document.getElementById('pickupAddress').value = 'My Location';
            showMessage("Pickup location set to your current position", "success");
        } else {
            currentDropoff = { lat, lng };
            document.getElementById('dropoffAddress').value = 'My Location';
            showMessage("Drop-off location set to your current position", "success");
        }
        
        // Auto-calculate if both locations set
        if (currentPickup && currentDropoff) {
            setTimeout(calculateQuote, 500);
        }
    }, () => {
        showMessage("Could not get location. Please enable location services.", "error");
    });
}

// Geocode address
function geocodeAddress(type) {
    const addressInput = document.getElementById(`${type}Address`).value.toLowerCase().trim();
    
    if (!addressInput) {
        showMessage("Please enter an address", "warning");
        return;
    }
    
    // Check SA cities database (works offline)
    for (const [city, coords] of Object.entries(saCities)) {
        if (addressInput.includes(city) || city.includes(addressInput)) {
            const lat = coords[0];
            const lng = coords[1];
            
            if (type === 'pickup') {
                currentPickup = { lat, lng };
            } else {
                currentDropoff = { lat, lng };
            }
            
            document.getElementById(`${type}Address`).value = city.charAt(0).toUpperCase() + city.slice(1);
            showMessage(`Location set to ${city.charAt(0).toUpperCase() + city.slice(1)}`, "success");
            
            if (currentPickup && currentDropoff) {
                setTimeout(calculateQuote, 500);
            }
            return;
        }
    }
    
    // If not in database and online, try OpenStreetMap
    if (isOnline) {
        showMessage("Searching online...", "info");
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput + ', South Africa')}&limit=1`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    
                    if (type === 'pickup') {
                        currentPickup = { lat, lng };
                    } else {
                        currentDropoff = { lat, lng };
                    }
                    
                    showMessage("Address found!", "success");
                    
                    if (currentPickup && currentDropoff) {
                        setTimeout(calculateQuote, 500);
                    }
                } else {
                    showMessage("Address not found. Try a city name like 'Johannesburg' or 'Cape Town'", "error");
                }
            })
            .catch(() => {
                showMessage("Search unavailable. Try 'Use My Location' or enter a city name.", "error");
            });
    } else {
        showMessage("Offline - Enter a South African city name (e.g., Johannesburg, Cape Town)", "warning");
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
        showMessage("Please set both pickup and drop-off locations", "warning");
        return;
    }
    
    const distance = calculateDistance(
        currentPickup.lat, currentPickup.lng,
        currentDropoff.lat, currentDropoff.lng
    );
    
    const rate = parseFloat(document.getElementById('rate').value);
    const total = distance * rate;
    
    document.getElementById('distanceDisplay').textContent = distance.toFixed(2) + ' km';
    document.getElementById('rateDisplay').textContent = rate.toFixed(2);
    document.getElementById('totalDisplay').textContent = 'R' + total.toFixed(2);
    
    const estimatedMinutes = Math.max(10, Math.round((distance / 40) * 60));
    document.getElementById('timeDisplay').textContent = estimatedMinutes + '-' + (estimatedMinutes + 5) + ' min';
    
    document.getElementById('quoteResult').style.display = 'block';
    document.getElementById('quoteResult').scrollIntoView({ behavior: 'smooth' });
    
    showMessage("Quote calculated successfully!", "success");
}

// Save quote
function saveQuote() {
    if (!currentPickup || !currentDropoff) {
        showMessage("Please calculate a quote first", "warning");
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
        }),
        synced: isOnline
    };
    
    quotes.unshift(quote);
    if (quotes.length > 50) quotes = quotes.slice(0, 50);
    
    localStorage.setItem('deliveryQuotes', JSON.stringify(quotes));
    loadHistory();
    
    showMessage("Quote saved!" + (!isOnline ? " (Will sync when online)" : ""), "success");
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
                    ${!quote.synced ? '<i class="fas fa-cloud-upload-alt" style="margin-left: 5px; color: #f39c12;"></i>' : ''}
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
        
        document.getElementById('rate').value = quote.rate;
        document.getElementById('pickupAddress').value = 'Previous pickup location';
        document.getElementById('dropoffAddress').value = 'Previous drop-off location';
        
        showMessage("Previous quote loaded!", "info");
        setTimeout(calculateQuote, 500);
    }
}

// Start delivery
function startDelivery() {
    if (!currentPickup || !currentDropoff) {
        showMessage("Please set locations first", "warning");
        return;
    }
    
    if (confirm("Start delivery with this quote?\n\nTotal: " + document.getElementById('totalDisplay').textContent)) {
        showMessage("Delivery started!", "success");
    }
}

// Show message
function showMessage(message, type = "info") {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Initialize
window.onload = initApp;

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered');
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}