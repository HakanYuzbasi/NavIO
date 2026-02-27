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
import config from './config';

// Import routes
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

// Static file serving for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Static file serving for demo images (from the Python backend's public folder)
app.use('/demo', express.static(path.join(process.cwd(), '../backend/public/demo')));

// Request logging (development only)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/venues', venueRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/edges', edgeRoutes);
app.use('/api/route', routingRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/analyze', floorPlanAnalysisRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/v1/analytics', analyticsRoutes); // Alias for existing AnalyticsDashboard

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'NaviO API',
    version: '1.0.0',
    description: 'Indoor Navigation API with Automatic Floor Plan Analysis',
    endpoints: {
      health: '/health',
      venues: '/api/venues',
      nodes: '/api/nodes',
      edges: '/api/edges',
      routing: '/api/route',
      qr: '/api/qr',
      analyze: '/api/analyze',
      upload: '/api/upload',
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
