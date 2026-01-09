let map = L.map("map").setView([0, 0], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let marker, tripId, startPos;

const startBtn = document.getElementById("startBtn");
const finishBtn = document.getElementById("finishBtn");
const shareBtn = document.getElementById("shareBtn");
const invoiceBtn = document.getElementById("invoiceBtn");
const info = document.getElementById("info");
const stepTitle = document.getElementById("stepTitle");
const stepDesc = document.getElementById("stepDesc");

navigator.geolocation.getCurrentPosition(p => {
  map.setView([p.coords.latitude, p.coords.longitude], 15);
});

function updateRoleUI() {
  const role = document.getElementById("role").value;
  const modeTitle = document.getElementById("modeTitle");
  const modeDesc = document.getElementById("modeDesc");

  if (role === "customer") {
    modeTitle.innerText = "Customer mode";
    modeDesc.innerText = "Track and share your delivery with recipients.";
  } else {
    modeTitle.innerText = "Courier mode";
    modeDesc.innerText = "Deliver packages with live GPS tracking.";
  }
}

function km(a, b, c, d) {
  const R = 6371;
  const dLat = (c - a) * Math.PI / 180;
  const dLon = (d - b) * Math.PI / 180;
  return R * 2 * Math.asin(Math.sqrt(
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a * Math.PI / 180) *
    Math.cos(c * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  ));
}

async function startTrip() {
  navigator.geolocation.getCurrentPosition(async p => {
    startPos = p.coords;
    marker = L.marker([p.coords.latitude, p.coords.longitude]).addTo(map);

    const res = await fetch("/api/trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: role.value,
        startLat: p.coords.latitude,
        startLng: p.coords.longitude,
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        rate: +rate.value,
        status: "active"
      })
    });

    tripId = (await res.json())._id;

    startBtn.style.display = "none";
    finishBtn.style.display = "block";
    shareBtn.style.display = "block";

    stepTitle.innerText = "Step 2: Delivery in progress";
    stepDesc.innerText = "You can share the live tracking link with the recipient.";
    info.innerText = "📍 Live tracking active…";
  });
}

async function finishTrip() {
  navigator.geolocation.getCurrentPosition(async p => {
    const d = km(
      startPos.latitude,
      startPos.longitude,
      p.coords.latitude,
      p.coords.longitude
    );

    const f = Math.round(d * rate.value);

    await fetch("/api/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: tripId,
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        distance: d,
        fare: f,
        status: "completed"
      })
    });

    finishBtn.style.display = "none";
    shareBtn.style.display = "none";
    invoiceBtn.style.display = "block";

    stepTitle.innerText = "Step 3: Delivery completed";
    stepDesc.innerText = "Download the invoice or close the app.";
    info.innerText = `✅ Delivery completed — Fare: R${f}`;
  });
}

function shareTrip() {
  const msg = `Track your SwiftDrop delivery:\n${location.href}`;
  open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

function downloadInvoice() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("SwiftDrop Invoice", 20, 20);
  doc.text(info.innerText, 20, 40);
  doc.save("SwiftDrop-Invoice.pdf");
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
