const express = require('express');
const cors = require('cors');
const authRouter = require('./routers/authRouter');
const { connectSupabase } = require('./config/supabase');

const app = express();
const PORT = 5000;

// Initialize Supabase
connectSupabase();

app.use(cors());
app.use(express.json());

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRouter);

// Default response for all requests
app.use((req, res) => {
  res.send('Server is running and logging requests!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
