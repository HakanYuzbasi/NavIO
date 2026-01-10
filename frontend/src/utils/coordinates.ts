/**
 * Coordinate transformation utilities for Leaflet.js
 *
 * NavIO uses a custom coordinate system where:
 * - Database: Pixel space with origin at top-left (0,0)
 * - Leaflet: Map space with origin at bottom-left for proper display
 */

export interface PixelCoordinate {
  x: number;
  y: number;
}

export interface LeafletCoordinate {
  lat: number;
  lng: number;
}

/**
 * Convert pixel coordinates (database) to Leaflet coordinates (display)
 *
 * Pixel space: Origin at top-left, Y increases downward
 * Leaflet space: Origin at bottom-left, Y increases upward
 *
 * @param x - X coordinate in pixel space
 * @param y - Y coordinate in pixel space
 * @param imageHeight - Height of the floor plan image in pixels
 * @returns Leaflet coordinates (lat/lng)
 */
export function pixelToLeaflet(
  x: number,
  y: number,
  imageHeight: number
): LeafletCoordinate {
  return {
    lat: imageHeight - y,  // Invert Y-axis
    lng: x,
  };
}

/**
 * Convert Leaflet coordinates (display) to pixel coordinates (database)
 *
 * @param lat - Latitude in Leaflet space
 * @param lng - Longitude in Leaflet space
 * @param imageHeight - Height of the floor plan image in pixels
 * @returns Pixel coordinates
 */
export function leafletToPixel(
  lat: number,
  lng: number,
  imageHeight: number
): PixelCoordinate {
  return {
    x: lng,
    y: imageHeight - lat,  // Invert Y-axis
  };
}

/**
 * Get Leaflet bounds for a floor plan image
 *
 * @param imageWidth - Width of the floor plan image
 * @param imageHeight - Height of the floor plan image
 * @returns Leaflet bounds [[south, west], [north, east]]
 */
export function getLeafletBounds(
  imageWidth: number,
  imageHeight: number
): [[number, number], [number, number]] {
  return [
    [0, 0],                    // Southwest corner (bottom-left)
    [imageHeight, imageWidth], // Northeast corner (top-right)
  ];
}

/**
 * Calculate Euclidean distance between two pixel coordinates
 *
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @returns Distance in pixels
 */
export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Get the center point of a floor plan
 *
 * @param imageWidth - Width of the floor plan image
 * @param imageHeight - Height of the floor plan image
 * @returns Center coordinates in Leaflet space
 */
export function getFloorPlanCenter(
  imageWidth: number,
  imageHeight: number
): LeafletCoordinate {
  return pixelToLeaflet(imageWidth / 2, imageHeight / 2, imageHeight);
}
