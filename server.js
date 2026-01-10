const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const Trip = require("./models/Trip");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// MongoDB connection with error handling
mongoose.connect("mongodb+srv://ngozobolwanengolobane_db_user:2022gogo@cluster0.2xj7xle.mongodb.net/delivery_app?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB connected successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// Real-time updates
io.on("connection", (socket) => {
  console.log("Client connected");
  
  socket.on("updateLocation", (data) => {
    io.emit("locationUpdate", data);
  });
  
  socket.on("driverStatus", (data) => {
    io.emit("statusUpdate", data);
  });
  
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Trip API
app.post("/api/trip", async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.pickupLat || !req.body.pickupLng || !req.body.rate) {
      return res.status(400).json({ error: "Missing required fields: pickupLat, pickupLng, and rate are required" });
    }
    
    const tripData = {
      riderName: req.body.riderName || "Rider",
      pickupLat: req.body.pickupLat,
      pickupLng: req.body.pickupLng,
      lat: req.body.lat || req.body.pickupLat,
      lng: req.body.lng || req.body.pickupLng,
      rate: req.body.rate,
      status: req.body.status || "active",
      distance: req.body.distance || 0,
      fare: req.body.fare || 0
    };
    
    const trip = await Trip.create(tripData);
    res.status(201).json(trip);
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ error: "Failed to create trip: " + error.message });
  }
});

app.get("/api/trips", async (req, res) => {
  try {
    const trips = await Trip.find().sort({ createdAt: -1 }).limit(50);
    res.json(trips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    res.status(500).json({ error: "Failed to fetch trips" });
  }
});

app.post("/api/update-location", async (req, res) => {
  try {
    const { id, lat, lng, status, distance, fare } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: "Trip ID is required" });
    }
    
    const updateData = {};
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;
    if (status !== undefined) updateData.status = status;
    if (distance !== undefined) updateData.distance = distance;
    if (fare !== undefined) updateData.fare = fare;
    
    const trip = await Trip.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    io.emit("tripUpdate", trip);
    res.json(trip);
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
});

app.post("/api/finish-trip", async (req, res) => {
  try {
    const { id, lat, lng, distance, fare } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: "Trip ID is required" });
    }
    
    const trip = await Trip.findByIdAndUpdate(
      id,
      {
        dropLat: lat,
        dropLng: lng,
        lat: lat,
        lng: lng,
        distance: distance || 0,
        fare: fare || 0,
        status: "completed"
      },
      { new: true }
    );
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    io.emit("tripCompleted", trip);
    res.json(trip);
  } catch (error) {
    console.error("Error finishing trip:", error);
    res.status(500).json({ error: "Failed to finish trip" });
  }
});

app.get("/api/active-trips", async (req, res) => {
  try {
    const trips = await Trip.find({ status: "active" });
    res.json(trips);
  } catch (error) {
    console.error("Error fetching active trips:", error);
    res.status(500).json({ error: "Failed to fetch active trips" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date(),
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));