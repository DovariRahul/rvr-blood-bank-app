const app = require('./src/app');
const { logger } = require('./src/utils/logger');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB Atlas (replaces MySQL testConnection)
    await connectDB();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🩸 LifeLink API running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  const { disconnectDB } = require('./src/config/db');
  await disconnectDB();
  process.exit(0);
});

startServer();
