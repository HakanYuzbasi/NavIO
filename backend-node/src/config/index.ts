/**
 * Application Configuration
 */

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Walking speed for time estimation (meters per second)
  walkingSpeed: 1.4,

  // Coordinate system conversion factor
  // Adjust based on your map scale (e.g., 1 pixel = X meters)
  coordinateConversionFactor: parseFloat(process.env.COORDINATE_CONVERSION_FACTOR || '1.0'),
};

export default config;
