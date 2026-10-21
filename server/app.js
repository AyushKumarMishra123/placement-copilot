const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const githubRoutes = require('./routes/githubRoutes');
const projectRoutes = require('./routes/projectRoutes');
const readinessRoutes = require('./routes/readinessRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminJobRoutes = require('./routes/adminJobRoutes');
const codingRoutes = require('./routes/codingRoutes');
const adminCodingRoutes = require('./routes/adminCodingRoutes');
const linkedinRoutes = require('./routes/linkedinRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const adminStudentRoutes = require('./routes/adminStudentRoutes');

const app = express();


// Security HTTP headers
app.use(helmet());

// CORS Configuration
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('CORS request blocked by security policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body Parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Apply general API rate limiter
app.use('/api', apiLimiter);

// Mount API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/readiness', readinessRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin/jobs', adminJobRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/admin/coding', adminCodingRoutes);
app.use('/api/linkedin', linkedinRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/admin', adminStudentRoutes);

// Catch-all 404 handler

app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
