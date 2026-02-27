/**
 * Application Entry Point
 * Starts the NaviO backend server
 */

import app from './server';
import config from './config';
import { runMigrations } from './db/migrate';

const PORT = config.port;

async function start() {
  try {
    console.log('Running database migrations...');
    await runMigrations();
    console.log('Migrations complete.');

    server = app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🚀 NaviO Backend Server Running`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`🌐 Server URL:  http://localhost:${PORT}`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`📡 API Endpoints:`);
      console.log(`   - Venues:  http://localhost:${PORT}/api/venues`);
      console.log(`   - Nodes:   http://localhost:${PORT}/api/nodes`);
      console.log(`   - Edges:   http://localhost:${PORT}/api/edges`);
      console.log(`   - Routing: http://localhost:${PORT}/api/route`);
      console.log(`   - QR:      http://localhost:${PORT}/api/qr`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

let server: any;
start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default server;
