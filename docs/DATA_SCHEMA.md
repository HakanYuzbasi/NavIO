# NavIO Data Schema Documentation

## Overview

This document defines the JSON schemas and data structures used throughout NavIO.

## Core Data Structures

### 1. FloorPlan

Represents a floor plan with its navigation graph.

```json
{
  "id": "uuid-string",
  "name": "Building A - Floor 1",
  "description": "First floor of Building A",
  "image_url": "/uploads/floorplans/building-a-floor-1.png",
  "image_width": 2000,
  "image_height": 1500,
  "created_at": "2026-01-10T12:00:00Z",
  "updated_at": "2026-01-10T12:00:00Z",
  "organization_id": "uuid-string",
  "nodes": [],
  "edges": [],
  "pois": [],
  "qr_anchors": []
}
```

**Fields:**
- `id`: Unique identifier
- `name`: Human-readable name
- `description`: Optional description
- `image_url`: Path to uploaded floor plan image
- `image_width`: Image width in pixels
- `image_height`: Image height in pixels
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `organization_id`: Owner organization
- `nodes`: Array of Node objects
- `edges`: Array of Edge objects
- `pois`: Array of POI objects
- `qr_anchors`: Array of QR anchor objects

### 2. Node

Represents a waypoint in the navigation graph.

```json
{
  "id": "node-uuid",
  "floor_plan_id": "floor-plan-uuid",
  "x": 450.5,
  "y": 320.8,
  "node_type": "waypoint",
  "name": "Junction A",
  "accessibility_level": "wheelchair_accessible"
}
```

**Fields:**
- `id`: Unique identifier
- `floor_plan_id`: Reference to parent floor plan
- `x`: X coordinate in pixel space
- `y`: Y coordinate in pixel space
- `node_type`: Type of node (`waypoint`, `entrance`, `exit`, `stairs`, `elevator`)
- `name`: Optional descriptive name
- `accessibility_level`: Accessibility rating (`wheelchair_accessible`, `limited_mobility`, `stairs_only`)

### 3. Edge

Represents a walkable connection between two nodes.

```json
{
  "id": "edge-uuid",
  "floor_plan_id": "floor-plan-uuid",
  "source_node_id": "node-uuid-1",
  "target_node_id": "node-uuid-2",
  "weight": 125.5,
  "bidirectional": true,
  "accessible": true,
  "edge_type": "corridor"
}
```

**Fields:**
- `id`: Unique identifier
- `floor_plan_id`: Reference to parent floor plan
- `source_node_id`: Starting node
- `target_node_id`: Ending node
- `weight`: Edge weight (typically Euclidean distance)
- `bidirectional`: Can traverse both directions
- `accessible`: Wheelchair accessible
- `edge_type`: Type of passage (`corridor`, `doorway`, `stairs`, `elevator`)

### 4. POI (Point of Interest)

Represents a labeled location on the floor plan.

```json
{
  "id": "poi-uuid",
  "floor_plan_id": "floor-plan-uuid",
  "node_id": "node-uuid",
  "name": "Radiology Department",
  "description": "X-Ray and MRI services",
  "category": "medical",
  "x": 450.5,
  "y": 320.8,
  "icon": "hospital",
  "searchable": true,
  "metadata": {
    "room_number": "101",
    "phone": "+1-555-0123",
    "hours": "Mon-Fri 8am-6pm"
  }
}
```

**Fields:**
- `id`: Unique identifier
- `floor_plan_id`: Reference to parent floor plan
- `node_id`: Associated navigation node (optional)
- `name`: Display name
- `description`: Detailed description
- `category`: POI category (`medical`, `office`, `restroom`, `entrance`, `exit`, `amenity`)
- `x`: X coordinate in pixel space
- `y`: Y coordinate in pixel space
- `icon`: Icon identifier for map display
- `searchable`: Include in search results
- `metadata`: Custom key-value pairs

### 5. QR Anchor

Represents a QR code placement for user localization.

```json
{
  "id": "qr-uuid",
  "floor_plan_id": "floor-plan-uuid",
  "node_id": "node-uuid",
  "code": "NAV-A1-001",
  "x": 450.5,
  "y": 320.8,
  "qr_data": "https://navio.app/n/NAV-A1-001",
  "placement_notes": "On wall next to elevator",
  "active": true,
  "scan_count": 1247
}
```

**Fields:**
- `id`: Unique identifier
- `floor_plan_id`: Reference to parent floor plan
- `node_id`: Associated navigation node
- `code`: Human-readable code
- `x`: X coordinate in pixel space
- `y`: Y coordinate in pixel space
- `qr_data`: Encoded QR code data (URL)
- `placement_notes`: Physical placement instructions
- `active`: QR code is active/valid
- `scan_count`: Number of times scanned

## API Request/Response Schemas

### Create Floor Plan Request

```json
{
  "name": "Building A - Floor 1",
  "description": "First floor of Building A",
  "organization_id": "org-uuid"
}
```

### Calculate Route Request

```json
{
  "floor_plan_id": "floor-uuid",
  "start_node_id": "node-uuid-start",
  "end_node_id": "node-uuid-end",
  "preferences": {
    "accessible_only": true,
    "avoid_stairs": true
  }
}
```

### Calculate Route Response

```json
{
  "success": true,
  "route": {
    "floor_plan_id": "floor-uuid",
    "start_node_id": "node-uuid-start",
    "end_node_id": "node-uuid-end",
    "path": [
      "node-uuid-start",
      "node-uuid-2",
      "node-uuid-3",
      "node-uuid-end"
    ],
    "total_distance": 245.8,
    "estimated_time_seconds": 180,
    "coordinates": [
      {"x": 100, "y": 200},
      {"x": 150, "y": 220},
      {"x": 200, "y": 240},
      {"x": 250, "y": 260}
    ],
    "instructions": [
      {"step": 1, "action": "Start at Main Entrance", "distance": 0},
      {"step": 2, "action": "Walk straight for 50m", "distance": 50},
      {"step": 3, "action": "Turn right", "distance": 95.8},
      {"step": 4, "action": "Arrive at Radiology", "distance": 245.8}
    ]
  }
}
```

### Scan QR Code Request

```json
{
  "qr_code": "NAV-A1-001"
}
```

### Scan QR Code Response

```json
{
  "success": true,
  "floor_plan": {
    "id": "floor-uuid",
    "name": "Building A - Floor 1",
    "image_url": "/uploads/floorplans/building-a-floor-1.png"
  },
  "location": {
    "node_id": "node-uuid",
    "x": 450.5,
    "y": 320.8,
    "name": "Main Entrance"
  },
  "nearby_pois": [
    {
      "id": "poi-uuid",
      "name": "Information Desk",
      "distance": 15.5
    }
  ]
}
```

## Database Schema

### Tables

#### floor_plans
- id (UUID, PK)
- name (VARCHAR)
- description (TEXT)
- image_url (VARCHAR)
- image_width (INTEGER)
- image_height (INTEGER)
- organization_id (UUID, FK)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

#### nodes
- id (UUID, PK)
- floor_plan_id (UUID, FK)
- x (FLOAT)
- y (FLOAT)
- node_type (VARCHAR)
- name (VARCHAR, nullable)
- accessibility_level (VARCHAR)
- created_at (TIMESTAMP)

#### edges
- id (UUID, PK)
- floor_plan_id (UUID, FK)
- source_node_id (UUID, FK)
- target_node_id (UUID, FK)
- weight (FLOAT)
- bidirectional (BOOLEAN)
- accessible (BOOLEAN)
- edge_type (VARCHAR)
- created_at (TIMESTAMP)

#### pois
- id (UUID, PK)
- floor_plan_id (UUID, FK)
- node_id (UUID, FK, nullable)
- name (VARCHAR)
- description (TEXT)
- category (VARCHAR)
- x (FLOAT)
- y (FLOAT)
- icon (VARCHAR)
- searchable (BOOLEAN)
- metadata (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

#### qr_anchors
- id (UUID, PK)
- floor_plan_id (UUID, FK)
- node_id (UUID, FK)
- code (VARCHAR, unique)
- x (FLOAT)
- y (FLOAT)
- qr_data (TEXT)
- placement_notes (TEXT)
- active (BOOLEAN)
- scan_count (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## Coordinate System

### Pixel Space vs. Leaflet Space

NavIO uses a custom coordinate system where:

1. **Pixel Space**: Native image coordinates (0,0 at top-left)
   - Origin: Top-left corner
   - X-axis: Left to right
   - Y-axis: Top to bottom
   - Units: Pixels

2. **Leaflet Space**: Inverted Y-axis for map rendering
   - Origin: Bottom-left corner
   - X-axis: Left to right
   - Y-axis: Bottom to top
   - Units: Map units (converted from pixels)

### Conversion Formula

```javascript
// Pixel to Leaflet (database → frontend display)
function pixelToLeaflet(x, y, imageHeight) {
  return {
    x: x,
    y: imageHeight - y
  };
}

// Leaflet to Pixel (frontend input → database storage)
function leafletToPixel(x, y, imageHeight) {
  return {
    x: x,
    y: imageHeight - y
  };
}
```

### Leaflet.js Configuration

```javascript
const bounds = [[0, 0], [imageHeight, imageWidth]];
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 2,
  bounds: bounds
});

L.imageOverlay(imageUrl, bounds).addTo(map);
map.fitBounds(bounds);
```

## Weight Calculation

Edge weights are calculated using Euclidean distance:

```python
import math

def calculate_edge_weight(x1, y1, x2, y2):
    """Calculate Euclidean distance between two points."""
    return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
```

## Graph Export Format

For use with NetworkX and pathfinding:

```json
{
  "directed": false,
  "multigraph": false,
  "graph": {},
  "nodes": [
    {"id": "node-1", "x": 100, "y": 200},
    {"id": "node-2", "x": 150, "y": 220}
  ],
  "links": [
    {
      "source": "node-1",
      "target": "node-2",
      "weight": 22.36,
      "accessible": true
    }
  ]
}
```
