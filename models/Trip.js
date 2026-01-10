const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema({
  riderName: { 
    type: String, 
    default: "Rider" 
  },
  pickupLat: { 
    type: Number, 
    required: true 
  },
  pickupLng: { 
    type: Number, 
    required: true 
  },
  dropLat: { 
    type: Number 
  },
  dropLng: { 
    type: Number 
  },
  lat: { 
    type: Number, 
    default: 0 
  },
  lng: { 
    type: Number, 
    default: 0 
  },
  distance: { 
    type: Number, 
    default: 0 
  },
  fare: { 
    type: Number, 
    default: 0 
  },
  rate: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ["active", "completed", "cancelled"],
    default: "active" 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model("Trip", TripSchema);