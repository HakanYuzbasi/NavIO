/**
 * Express Server Configuration
 * NaviO Backend API Server
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';
import { apiLimiter, authLimiter, scanLimiter } from './middleware/rateLimiter';
import config from './config';

// Import routes
import authRoutes from './routes/auth';
import venueRoutes from './routes/venues';
import nodeRoutes from './routes/nodes';
import edgeRoutes from './routes/edges';
import routingRoutes from './routes/routing';
import qrRoutes from './routes/qr';
import floorPlanAnalysisRoutes from './routes/floorPlanAnalysis';
import uploadRoutes from './routes/upload';
import queueRoutes from './routes/queue';
import analyticsRoutes from './routes/analytics';

const app: Application = express();

// Security middleware - configure helmet to allow images
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(corsMiddleware);

// Body parsing - increased limit for large image pixel data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression
app.use(compression());

// Global rate limiting
app.use('/api/', apiLimiter);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Static file serving for demo images (from the Python backend's public folder)
app.use('/demo', express.static(path.join(process.cwd(), '../backend/public/demo')));

// Request logging (development only)
if (config.nodeEnv === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- Public routes (no auth) ---
app.use('/api/auth', authLimiter, authRoutes);

// Public: visitors can view routes, join queues, scan QR codes
app.use('/api/route', routingRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/nodes', nodeRoutes);           // GET for visitor booth lookup
app.use('/api/qr', qrRoutes);

// Public: scan webhook
app.use('/api/analytics/scan', scanLimiter);

// --- Protected routes (require auth) ---
// Public: visitors can view venues, routes, join queues, scan QR codes
app.use('/api/venues', venueRoutes);
app.use('/api/edges', edgeRoutes);
app.use('/api/analyze', requireAuth, floorPlanAnalysisRoutes);
app.use('/api/upload', requireAuth, uploadRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);
app.use('/api/v1/analytics', requireAuth, analyticsRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'NaviO API',
    version: '1.0.0',
    description: 'Indoor Navigation API with Automatic Floor Plan Analysis',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      venues: '/api/venues',
      nodes: '/api/nodes',
      edges: '/api/edges',
      routing: '/api/route',
      qr: '/api/qr',
      analyze: '/api/analyze',
      upload: '/api/upload',
      queue: '/api/queue',
      analytics: '/api/analytics',
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
