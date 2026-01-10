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

// MongoDB connection
mongoose.connect("mongodb+srv://ngozobolwanengolobane_db_user:2022gogo@cluster0.2xj7xle.mongodb.net/delivery_app?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Real-time updates
io.on("connection", (socket) => {
  console.log("Client connected");
  
  socket.on("updateLocation", (data) => {
    io.emit("locationUpdate", data);
  });
  
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Trip API - FIXED: No tripId field
app.post("/api/trip", async (req, res) => {
  try {
    // Create trip with only the fields we need
    const tripData = {
      riderName: req.body.riderName || "Rider",
      pickupLat: req.body.pickupLat,
      pickupLng: req.body.pickupLng,
      lat: req.body.lat || req.body.pickupLat,
      lng: req.body.lng || req.body.pickupLng,
      rate: req.body.rate,
      status: "active",
      distance: 0,
      fare: 0
    };
    
    const trip = await Trip.create(tripData);
    console.log("Trip created successfully:", trip._id);
    res.json(trip);
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/trips", async (req, res) => {
  try {
    const trips = await Trip.find().sort({ createdAt: -1 }).limit(50);
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/update-location", async (req, res) => {
  try {
    const { id, lat, lng, status, distance, fare } = req.body;
    
    const trip = await Trip.findByIdAndUpdate(
      id,
      { lat, lng, status, distance, fare },
      { new: true }
    );
    
    if (trip) {
      io.emit("tripUpdate", trip);
    }
    
    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/finish-trip", async (req, res) => {
  try {
    const { id, lat, lng, distance, fare } = req.body;
    
    const trip = await Trip.findByIdAndUpdate(
      id,
      {
        dropLat: lat,
        dropLng: lng,
        lat,
        lng,
        distance,
        fare,
        status: "completed"
      },
      { new: true }
    );
    
    if (trip) {
      io.emit("tripCompleted", trip);
    }
    
    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/active-trips", async (req, res) => {
  try {
    const trips = await Trip.find({ status: "active" });
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));