import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import aadhaarRoutes from './routes/aadhaarRoutes.js';
import panRoutes from './routes/panRoutes.js';
import voterRoutes from './routes/voterRoutes.js';
import rationRoutes from './routes/rationRoutes.js';
import drivingRoutes from './routes/drivingRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import farmerRoutes from './routes/farmerRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Prince eSevai Authentication Backend API',
    endpoints: {
      health: 'GET /api/health',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me (Bearer Token required)',
      aadhaarMeta: 'GET /api/aadhaar/meta',
      aadhaarStats: 'GET /api/aadhaar/stats',
      aadhaarIssues: 'GET|POST /api/aadhaar/issues',
      aadhaarByNumber: 'GET /api/aadhaar/issues/by-aadhaar/:aadhaarNumber',
      aadhaarSingle: 'GET /api/aadhaar/issues/:id',
      aadhaarStatus: 'PATCH /api/aadhaar/issues/:id/status',
      aadhaarAssign: 'PATCH /api/aadhaar/issues/:id/assign',
    },
  });
});

// Mount Authentication Routes
app.use('/api/auth', authRoutes);

// Mount Aadhaar Issue Routes
app.use('/api/aadhaar', aadhaarRoutes);

// Mount PAN Card Services Routes
app.use('/api/pan', panRoutes);

// Mount Voter Services Routes
app.use('/api/voter', voterRoutes);

// Mount Ration Card Services Routes
app.use('/api/ration', rationRoutes);

// Mount Driving License Services Routes
app.use('/api/driving', drivingRoutes);

// Mount Vehicle Services Routes
app.use('/api/vehicle', vehicleRoutes);

// Mount Farmer & Agriculture Services Routes
app.use('/api/farmer', farmerRoutes);

// Fallback for undefined routes
app.use(notFound);

// Centralized error handling
app.use(errorHandler);

export default app;

