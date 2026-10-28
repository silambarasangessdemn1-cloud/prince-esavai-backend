import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import app from './app.js';

// Resolve directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env reliably from the backend directory regardless of cwd
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // 1. Start Express server immediately
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth Endpoints: http://localhost:${PORT}/api/auth/register | login | me`);
    });

    // 2. Connect to MongoDB with automated retries in background
    connectDB().catch((err) => {
      console.error(`MongoDB connection loop terminated: ${err.message}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error(`Unhandled Rejection Error: ${err.message}`);
      server.close(() => process.exit(1));
    });

    // Graceful shutdown handling
    const shutdown = () => {
      console.log('\n🛑 Gracefully shutting down server...');
      server.close(() => {
        console.log('💤 HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error(`❌ Server initialization failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
