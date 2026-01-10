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

// Calculate distance in kilometers
TripSchema.methods.calculateDistance = function() {
  if (!this.pickupLat || !this.pickupLng || !this.lat || !this.lng) return 0;
  
  const R = 6371; // Earth's radius in km
  const dLat = (this.lat - this.pickupLat) * Math.PI / 180;
  const dLon = (this.lng - this.pickupLng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.pickupLat * Math.PI / 180) * Math.cos(this.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Calculate fare based on distance and rate
TripSchema.methods.calculateFare = function() {
  const distance = this.calculateDistance();
  return distance * this.rate;
};

module.exports = mongoose.model("Trip", TripSchema);