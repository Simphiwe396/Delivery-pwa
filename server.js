const express = require('express');
const app = express();

// Serve static files
app.use(express.static('.'));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Delivery Quote Calculator running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});