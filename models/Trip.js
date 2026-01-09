const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema({
  pickupLat: Number,
  pickupLng: Number,
  dropLat: Number,
  dropLng: Number,
  lat: Number,
  lng: Number,
  distance: Number,
  fare: Number,
  rate: Number,
  status: { type: String, default: "active" }
}, { timestamps: true });

module.exports = mongoose.model("Trip", TripSchema);

