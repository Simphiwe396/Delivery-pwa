let map = L.map('map').setView([0,0], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let marker;
let tripId;
let watchId;

navigator.geolocation.getCurrentPosition(pos => {
  map.setView([pos.coords.latitude, pos.coords.longitude], 15);
});

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLon = (lon2-lon1) * Math.PI/180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function startTrip() {
  navigator.geolocation.getCurrentPosition(async pos => {
    marker = L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(map);

    const rate = Number(document.getElementById("rate").value);

    const res = await fetch("/api/trip", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
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
      marker.setLatLng([p.coords.latitude, p.coords.longitude]);

      fetch("/api/update-location", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
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

async function finishTrip() {
  navigator.geolocation.clearWatch(watchId);
  document.getElementById("info").innerText = "Delivery Finished";
  loadHistory();
}

async function loadHistory() {
  const res = await fetch("/api/trips");
  const trips = await res.json();
  const list = document.getElementById("history");
  list.innerHTML = "";

  trips.forEach(t => {
    const li = document.createElement("li");
    li.innerText = `Fare: R${(t.distance || 0) * t.rate}`;
    list.appendChild(li);
  });
}

loadHistory();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
