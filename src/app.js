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
import pricingRoutes from './routes/pricingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security HTTP headers with cross-origin resource policy enabled
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Allowed origins list for CORS
const allowedOrigins = [
  'https://prince-esavai-frontend.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5001',
];

if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*') {
  const envOrigins = process.env.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/\/+$/, ''));
  allowedOrigins.push(...envOrigins);
}

// CORS configuration supporting credentials and dynamic origin matching
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, Postman, cron, mobile apps)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/+$/, '');

    // Allow explicit origins, any *.vercel.app deployment, or fallback if CORS_ORIGIN is '*'
    if (
      allowedOrigins.some((allowed) => allowed.replace(/\/+$/, '') === cleanOrigin) ||
      cleanOrigin.endsWith('.vercel.app') ||
      process.env.CORS_ORIGIN === '*'
    ) {
      return callback(null, true);
    }

    // Reject unapproved origins
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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

// Mount Pricing Portal Routes
app.use('/api/pricing', pricingRoutes);

// Mount Payment & UTR Verification Routes
app.use('/api/payments', paymentRoutes);

// Fallback for undefined routes
app.use(notFound);

// Centralized error handling
app.use(errorHandler);

export default app;

