/**
 * CORS Middleware Configuration
 */

import cors from 'cors';

export const corsOptions = {
  origin: process.env.CORS_ORIGIN || true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false, // Set to false when using wildcard origin
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);
