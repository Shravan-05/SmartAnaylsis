import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { ensureDefaultSite } from './models/Site.js';

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/user_analytics';

async function bootstrap() {
  try {
    // 1. Establish database connection
    await connectDB(MONGODB_URI);
    await ensureDefaultSite();

    // 2. Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 CausalFunnel Analytics Server running on port ${PORT}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`❤️  Health:   http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n[Process] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log('[Server] HTTP connections closed.');
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[Fatal Error] Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
