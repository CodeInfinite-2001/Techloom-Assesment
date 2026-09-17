require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { startExpiryWorker, stopExpiryWorker } = require('./services/expiryWorker');
const authService = require('./services/authService');
const productController = require('./controllers/productController');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    // 1. Connect to Database
    await connectDB();

    // Seed default admin if no users exist
    await authService.seedDefaultAdmin();

    // Seed demo product catalog if database is empty (ideal for fresh Railway MongoDB)
    await productController.seedDefaultProducts();

    // 2. Start background worker for 5-minute reservation cleanup
    const workerInterval = process.env.EXPIRY_WORKER_INTERVAL_MS
      ? parseInt(process.env.EXPIRY_WORKER_INTERVAL_MS, 10)
      : 5000;
    startExpiryWorker(workerInterval);

    // 3. Start HTTP server - explicitly binding to 0.0.0.0 for Railway/Docker reverse proxy
    const server = http.createServer(app);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`=================================================`);
      console.log(`🚀 POS Server running on port ${PORT} (0.0.0.0)`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏱️  Stock Reservation Lock: 5 minutes (300s)`);
      console.log(`🏥 Health check active at: /api/health`);
      console.log(`=================================================`);
    });

    // Graceful shutdown handling
    const shutdown = async signal => {
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
      stopExpiryWorker();
      server.close(async () => {
        await disconnectDB();
        console.log('[Server] Shutdown complete.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[Server] Startup failed:', err);
    process.exit(1);
  }
}

bootstrap();
