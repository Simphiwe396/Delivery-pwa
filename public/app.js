let map = L.map('map').setView([0, 0], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let driverMarker;
let tripId;
let watchId;

// Connect to WebSocket
const socket = io();

// Show driver marker in real-time from WebSocket
socket.on("driver-location", data => {
  if (!driverMarker) {
    driverMarker = L.marker([data.lat, data.lng]).addTo(map);
  } else {
    driverMarker.setLatLng([data.lat, data.lng]);
  }
  map.setView([data.lat, data.lng], 15);
  document.getElementById("info").innerText = `Fare: R${data.fare.toFixed(2)} | Distance: ${data.distance.toFixed(2)} km`;
});

// Polling fallback every 5 seconds (Option A)
async function pollDriverLocation() {
  if (!tripId) return;

  const res = await fetch("/api/trips");
  const trips = await res.json();
  const trip = trips.find(t => t._id === tripId);

  if (trip) {
    if (!driverMarker) {
      driverMarker = L.marker([trip.lat, trip.lng]).addTo(map);
    } else {
      driverMarker.setLatLng([trip.lat, trip.lng]);
    }
    map.setView([trip.lat, trip.lng], 15);
    document.getElementById("info").innerText = `Fare: R${trip.fare.toFixed(2)} | Distance: ${trip.distance.toFixed(2)} km`;
  }
}
setInterval(pollDriverLocation, 5000); // polling every 5s

// Get current location
navigator.geolocation.getCurrentPosition(pos => {
  map.setView([pos.coords.latitude, pos.coords.longitude], 15);
});

// Start trip
async function startTrip() {
  navigator.geolocation.getCurrentPosition(async pos => {
    driverMarker = L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(map);

    const rate = Number(document.getElementById("rate").value);

    const res = await fetch("/api/trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickupLat: pos.coords.latitude,
        pickupLng: pos.coords.longitude,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        rate
      })
    });

    const trip = await res.json();
    tripId = trip._id;

    watchId = navigator.geolocation.watchPosition(p => {
      driverMarker.setLatLng([p.coords.latitude, p.coords.longitude]);

      fetch("/api/update-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tripId,
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          status: "active"
        })
      });
    });
  });
}

// Finish trip
async function finishTrip() {
  navigator.geolocation.clearWatch(watchId);
  document.getElementById("info").innerText = "Delivery Finished";
  loadHistory();
}

// Load trip history
async function loadHistory() {
  const res = await fetch("/api/trips");
  const trips = await res.json();
  const list = document.getElementById("history");
  list.innerHTML = "";

  trips.forEach(t => {
    const li = document.createElement("li");
    li.innerText = `Fare: R${(t.fare || 0).toFixed(2)}, Distance: ${(t.distance || 0).toFixed(2)} km`;
    list.appendChild(li);
  });
}

loadHistory();

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
