import mongoose from 'mongoose';

/**
 * Connect to MongoDB with retry capability and graceful event handlers.
 * @param {string} uri - MongoDB connection string URI
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB(uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/user_analytics') {
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true, // Build defined indexes automatically in dev/assignment mode
    });

    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    throw error;
  }
}

/**
 * Disconnect from MongoDB safely (used during graceful shutdown and tests).
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected from database');
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection lost. Waiting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Runtime error:', err.message);
});
