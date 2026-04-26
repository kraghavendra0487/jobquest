const express = require('express');
const cors = require('cors');
const authRouter = require('./routers/authRouter');
const schoolRouter = require('./routers/schoolRouter');
const programRouter = require('./routers/programRouter');
const userRouter = require('./routers/userRouter');
const jobUploadRouter = require('./routers/jobUploadRouter');
const aiRouter = require('./routers/aiRouter');
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
app.use('/api/schools', schoolRouter);
app.use('/api/programs', programRouter);
app.use('/api/users', userRouter);
app.use('/api/admin/job-uploads', jobUploadRouter);
app.use('/api/admin/ai', aiRouter);

// Default 404 for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Default response for all other requests
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
