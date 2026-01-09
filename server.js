const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Trip = require("./models/Trip");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1/deliverypwa");

app.post("/api/trip", async (req, res) => {
  const trip = await Trip.create(req.body);
  res.json(trip);
});

app.get("/api/trips", async (req, res) => {
  const trips = await Trip.find().sort({ createdAt: -1 });
  res.json(trips);
});

app.post("/api/update-location", async (req, res) => {
  const { id, lat, lng, status } = req.body;
  const trip = await Trip.findByIdAndUpdate(
    id,
    { lat, lng, status },
    { new: true }
  );
  res.json(trip);
});

app.listen(3000, () => console.log("Server running on port 3000"));
