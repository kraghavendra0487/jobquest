const express = require('express');
const cors = require('cors');
const schoolRouter = require('./routers/schoolRouter');
const studentRouter = require('./routers/studentRouter');
const userRouter = require('./routers/userRouter');
const jobUploadRouter = require('./routers/jobUploadRouter');
const aiRouter = require('./routers/aiRouter');
const { connectSupabase } = require('./config/supabase');

const app = express();
const PORT = 8080;

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
app.use('/api/schools', schoolRouter);
app.use('/api/student', studentRouter);
app.use('/api/users', userRouter);
app.use('/api/admin/job-uploads', jobUploadRouter);
app.use('/api/admin/ai', aiRouter);

// Global Error Handler for API routes
app.use('/api', (err, req, res, next) => {
  console.error(`[API Error] ${req.method} ${req.url}:`, err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.url,
    timestamp: new Date().toISOString()
  });
});

// Default 404 for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is healthy',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Default response for all other requests
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
