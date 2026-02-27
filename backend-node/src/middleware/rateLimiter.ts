/**
 * Rate Limiting Middleware
 * Protects API from abuse
 */

import rateLimit from 'express-rate-limit';

/** General API rate limit: 2000 requests per minute for high-frequency admin actions */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

/** Auth endpoints: 10 attempts per 15 minutes */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

/** Scan/webhook endpoints: 200 per minute */
export const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});
