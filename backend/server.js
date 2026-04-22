const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Default response for all requests
app.use((req, res) => {
  res.send('Server is running and logging requests!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
