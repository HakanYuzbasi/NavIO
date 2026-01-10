# NavIO Coordinate System Guide

## Overview

NavIO uses a dual coordinate system to handle the transformation between database storage (pixel coordinates) and map display (Leaflet coordinates).

## Coordinate Systems

### 1. Pixel Space (Database Storage)

This is the native coordinate system of the uploaded floor plan image.

**Characteristics:**
- **Origin:** Top-left corner (0, 0)
- **X-axis:** Increases from left to right
- **Y-axis:** Increases from top to bottom
- **Units:** Pixels
- **Range:**
  - X: [0, image_width]
  - Y: [0, image_height]

**Example:**
```
(0,0) ──────────────► X
  │
  │   Image
  │
  ▼
  Y

Point at (100, 50) means:
- 100 pixels from left edge
- 50 pixels from top edge
```

### 2. Leaflet Space (Map Display)

This is the coordinate system used by Leaflet.js with CRS.Simple (non-geographical).

**Characteristics:**
- **Origin:** Bottom-left corner (0, 0)
- **X-axis:** Increases from left to right (same as pixel)
- **Y-axis:** Increases from bottom to top (INVERTED from pixel)
- **Units:** Map units (corresponds to pixels)
- **Range:**
  - Latitude (Y): [0, image_height]
  - Longitude (X): [0, image_width]

**Example:**
```
  Y
  ▲
  │   Image
  │
  │
(0,0) ──────────────► X

Point at [450, 100] means:
- lat: 450 (450 units from bottom)
- lng: 100 (100 units from left)
```

## Why Two Coordinate Systems?

### The Y-Axis Problem

Standard image coordinates have the Y-axis pointing **downward**, while map libraries (including Leaflet) expect the Y-axis to point **upward** (like traditional Cartesian coordinates).

Without conversion:
- A node at the "top" of the image (y=50) would appear at the "bottom" of the map
- Routes would be flipped vertically
- User clicks would be misaligned

### The Solution

We convert coordinates between the two systems:

```
Pixel Y = 0 (top) ────► Leaflet Y = imageHeight (top)
Pixel Y = imageHeight (bottom) ────► Leaflet Y = 0 (bottom)
```

## Conversion Functions

### Pixel to Leaflet (Database → Display)

**JavaScript/TypeScript:**
```typescript
function pixelToLeaflet(x: number, y: number, imageHeight: number) {
  return {
    lat: imageHeight - y,  // Invert Y-axis
    lng: x                  // X unchanged
  };
}
```

**Example:**
```typescript
// Image: 2000x1500
// Node at pixel (450, 300)
const coords = pixelToLeaflet(450, 300, 1500);
// Result: { lat: 1200, lng: 450 }

// Add to Leaflet map
L.marker([coords.lat, coords.lng]).addTo(map);
```

### Leaflet to Pixel (Display → Database)

**JavaScript/TypeScript:**
```typescript
function leafletToPixel(lat: number, lng: number, imageHeight: number) {
  return {
    x: lng,                  // X unchanged
    y: imageHeight - lat     // Invert Y-axis
  };
}
```

**Example:**
```typescript
// User clicks map at [1200, 450]
map.on('click', (e) => {
  const { lat, lng } = e.latlng;
  const pixel = leafletToPixel(lat, lng, 1500);
  // Result: { x: 450, y: 300 }

  // Save to database
  createNode({ x: pixel.x, y: pixel.y });
});
```

## Leaflet.js Configuration

### Setup Map

```typescript
import L from 'leaflet';

const imageWidth = 2000;
const imageHeight = 1500;
const imageUrl = '/uploads/floor-plan.png';

// Create map with CRS.Simple (non-geographical coordinate system)
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 2,
  attributionControl: false
});

// Define bounds: [[south, west], [north, east]]
// South-west corner: [0, 0]
// North-east corner: [imageHeight, imageWidth]
const bounds: [[number, number], [number, number]] = [
  [0, 0],
  [imageHeight, imageWidth]
];

// Add floor plan image overlay
L.imageOverlay(imageUrl, bounds).addTo(map);

// Fit map to image bounds
map.fitBounds(bounds);
```

### Add Markers

```typescript
// Database node
const node = {
  x: 450,
  y: 300
};

// Convert to Leaflet coordinates
const coords = pixelToLeaflet(node.x, node.y, imageHeight);

// Add marker
const marker = L.marker([coords.lat, coords.lng]);
marker.addTo(map);
```

### Draw Routes

```typescript
// Database route coordinates
const route = [
  { x: 100, y: 200 },
  { x: 200, y: 250 },
  { x: 300, y: 300 }
];

// Convert all to Leaflet
const leafletCoords = route.map(coord =>
  pixelToLeaflet(coord.x, coord.y, imageHeight)
);

// Draw polyline
const line = L.polyline(
  leafletCoords.map(c => [c.lat, c.lng]),
  { color: 'blue', weight: 3 }
);
line.addTo(map);
```

## Common Pitfalls

### ❌ Pitfall 1: Using Pixel Coordinates Directly

```typescript
// WRONG - Will appear upside down
const node = { x: 450, y: 300 };
L.marker([node.y, node.x]).addTo(map);
```

**Solution:**
```typescript
// CORRECT - Use conversion function
const coords = pixelToLeaflet(node.x, node.y, imageHeight);
L.marker([coords.lat, coords.lng]).addTo(map);
```

### ❌ Pitfall 2: Swapping Lat/Lng

```typescript
// WRONG - Leaflet expects [lat, lng] not [lng, lat]
L.marker([coords.lng, coords.lat]).addTo(map);
```

**Solution:**
```typescript
// CORRECT - [lat, lng] order
L.marker([coords.lat, coords.lng]).addTo(map);
```

### ❌ Pitfall 3: Forgetting imageHeight

```typescript
// WRONG - imageHeight is required for conversion
const coords = pixelToLeaflet(x, y, 0);
```

**Solution:**
```typescript
// CORRECT - Always pass imageHeight
const coords = pixelToLeaflet(x, y, floorPlan.image_height);
```

### ❌ Pitfall 4: Incorrect Bounds

```typescript
// WRONG - Using pixel dimensions as bounds
const bounds = [[0, 0], [imageWidth, imageHeight]];
```

**Solution:**
```typescript
// CORRECT - Height first, then width for Leaflet
const bounds = [[0, 0], [imageHeight, imageWidth]];
```

## Validation

### Test Coordinate Conversion

```typescript
// Test round-trip conversion
const original = { x: 450, y: 300 };
const imageHeight = 1500;

// Convert to Leaflet and back
const leaflet = pixelToLeaflet(original.x, original.y, imageHeight);
const pixel = leafletToPixel(leaflet.lat, leaflet.lng, imageHeight);

console.assert(pixel.x === original.x);
console.assert(pixel.y === original.y);
// ✅ Should pass
```

### Visual Verification

1. Place a node at pixel (0, 0) - should appear at **top-left**
2. Place a node at pixel (width, 0) - should appear at **top-right**
3. Place a node at pixel (0, height) - should appear at **bottom-left**
4. Place a node at pixel (width, height) - should appear at **bottom-right**

## Backend Considerations

The backend **always** stores coordinates in pixel space:

```python
# Backend - Store in pixel space
node = Node(
    x=450,          # Pixels from left
    y=300,          # Pixels from top
    floor_plan_id=floor_plan_id
)
db.add(node)
db.commit()
```

Frontend is responsible for conversion when displaying.

## Distance Calculation

Distances are calculated in **pixel space** (database coordinates):

```python
import math

def calculate_distance(x1, y1, x2, y2):
    """Calculate Euclidean distance in pixel space."""
    return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
```

This is correct because:
- Pixels are uniform units
- The Y-axis inversion doesn't affect distance
- sqrt(dx² + dy²) is the same in both coordinate systems

## Scale Conversion (Optional)

To convert pixels to real-world units (meters):

```typescript
// Define scale (e.g., 10 pixels = 1 meter)
const PIXELS_PER_METER = 10;

function pixelsToMeters(pixels: number): number {
  return pixels / PIXELS_PER_METER;
}

// Example
const distance = 450; // pixels
const meters = pixelsToMeters(distance); // 45 meters
```

## Summary

| Aspect | Pixel Space | Leaflet Space |
|--------|-------------|---------------|
| Origin | Top-left (0,0) | Bottom-left (0,0) |
| X-axis | Left → Right | Left → Right |
| Y-axis | Top → Bottom | Bottom → Top |
| Units | Pixels | Map units |
| Storage | Database | Display only |
| Conversion | `leafletToPixel()` | `pixelToLeaflet()` |

**Key Rule:** Always convert when crossing the boundary between backend and frontend display.

## References

- Leaflet.js CRS.Simple: https://leafletjs.com/examples/crs-simple/crs-simple.html
- Coordinate transformation: https://en.wikipedia.org/wiki/Transformation_matrix
- Image coordinates: https://en.wikipedia.org/wiki/Image_coordinate_system
