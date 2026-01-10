const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(__dirname));

// Serve index.html for all routes (for PWA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚚 QuickQuote Pro running on port ${PORT}`);
  console.log(`🌐 Web: http://localhost:${PORT}`);
  console.log(`📱 Install as app: Chrome/Safari → Add to Home Screen`);
});