/**
 * Express Server Configuration
 * NaviO Backend API Server
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import compression from 'compression';
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

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS
app.use(corsMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

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
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
