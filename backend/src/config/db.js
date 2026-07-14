const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

/**
 * Connect to MongoDB Atlas.
 * Replaces the MySQL pool from the original server.
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8 uses these by default, but explicit for clarity
      autoIndex: true,
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);
    logger.info(`Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected.');
    });

    return conn;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

/**
 * Disconnect from MongoDB (for graceful shutdown).
 */
async function disconnectDB() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully.');
}

module.exports = { connectDB, disconnectDB };
