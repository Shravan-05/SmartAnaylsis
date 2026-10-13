import mongoose from 'mongoose';

/**
 * Health check endpoint reporting server uptime and database connectivity.
 * GET /api/health
 */
export async function getHealth(req, res) {
  const isDbConnected = mongoose.connection.readyState === 1;

  const healthData = {
    status: isDbConnected ? 'healthy' : 'degraded',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: {
        status: 'up',
      },
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host || 'unknown',
        database: mongoose.connection.name || 'unknown',
      },
    },
  };

  const statusCode = isDbConnected ? 200 : 503;
  return res.status(statusCode).json(healthData);
}
