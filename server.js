const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Trip = require("./models/trip");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1/deliverypwa");

// WebSocket connection
io.on("connection", socket => {
  console.log("New client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Create a new trip
app.post("/api/trip", async (req, res) => {
  const trip = await Trip.create(req.body);
  res.json(trip);
});

// Get all trips (most recent first)
app.get("/api/trips", async (req, res) => {
  const trips = await Trip.find().sort({ createdAt: -1 });
  res.json(trips);
});

// Update location & fare
app.post("/api/update-location", async (req, res) => {
  const { id, lat, lng, status } = req.body;
  const trip = await Trip.findById(id);

  if (!trip) return res.status(404).json({ error: "Trip not found" });

  // Calculate distance from last location
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  let addedDistance = 0;
  if (trip.lat && trip.lng) {
    addedDistance = calculateDistance(trip.lat, trip.lng, lat, lng);
  }

  trip.lat = lat;
  trip.lng = lng;
  trip.status = status;
  trip.distance = (trip.distance || 0) + addedDistance;
  trip.fare = (trip.distance || 0) * trip.rate;

  await trip.save();

  // Emit update to all clients (WebSocket)
  io.emit("driver-location", {
    id: trip._id,
    lat,
    lng,
    status,
    distance: trip.distance,
    fare: trip.fare
  });

  res.json(trip);
});

// Start server
server.listen(3000, () => console.log("Server running on port 3000"));
