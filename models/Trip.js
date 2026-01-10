const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema({
  riderName: { type: String, default: "Rider" },
  pickupLat: Number,
  pickupLng: Number,
  dropLat: Number,
  dropLng: Number,
  lat: Number,
  lng: Number,
  distance: { type: Number, default: 0 },
  fare: { type: Number, default: 0 },
  rate: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ["active", "completed", "cancelled"],
    default: "active" 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model("Trip", TripSchema);