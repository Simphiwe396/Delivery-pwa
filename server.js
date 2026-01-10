const express = require('express');
const app = express();

// Serve static files
app.use(express.static('public'));

// Store active drivers in memory
let drivers = {};

// API to update driver location
app.get('/api/update-location', (req, res) => {
  const { driverId, lat, lng } = req.query;
  
  if (driverId && lat && lng) {
    drivers[driverId] = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      lastUpdate: new Date()
    };
    console.log(`Driver ${driverId} at ${lat}, ${lng}`);
  }
  
  res.json({ success: true });
});

// API to get all drivers
app.get('/api/drivers', (req, res) => {
  res.json(drivers);
});

// API to get specific driver
app.get('/api/driver/:id', (req, res) => {
  const driver = drivers[req.params.id];
  res.json(driver || { error: 'Driver not found' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Simple Driver Tracker running on port ${PORT}`);
});