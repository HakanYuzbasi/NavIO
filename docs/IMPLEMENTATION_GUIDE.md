# NavIO Implementation Guide

This guide provides a step-by-step roadmap to build and deploy the NavIO MVP (Minimum Viable Product).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Database Setup](#database-setup)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Coordinate System Configuration](#coordinate-system-configuration)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Admin Workflow](#admin-workflow)
10. [User Workflow](#user-workflow)

## Prerequisites

### Required Software

- **Python 3.10+** - Backend runtime
- **Node.js 18+** - Frontend runtime
- **PostgreSQL 15+** - Database
- **Docker & Docker Compose** (optional but recommended)
- **Git** - Version control

### Required Skills

- Python (FastAPI, SQLAlchemy)
- JavaScript/TypeScript (React)
- SQL (PostgreSQL)
- REST APIs
- Graph algorithms basics

## Development Setup

### Option 1: Docker Compose (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd NavIO

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Access services:
# - Backend API: http://localhost:8000
# - Frontend: http://localhost:3000
# - API Docs: http://localhost:8000/docs
```

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
echo "REACT_APP_API_URL=http://localhost:8000/api/v1" > .env

# Start development server
npm start
```

## Database Setup

### PostgreSQL Installation

#### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql-15
sudo systemctl start postgresql
```

#### Windows
Download from: https://www.postgresql.org/download/windows/

### Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create user and database
CREATE USER navio_user WITH PASSWORD 'navio_password';
CREATE DATABASE navio_db OWNER navio_user;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE navio_db TO navio_user;

# Exit
\q
```

### Run Migrations

```bash
cd backend
alembic upgrade head
```

### Verify Tables

```bash
psql -U navio_user -d navio_db

# List tables
\dt

# Expected tables:
# - floor_plans
# - nodes
# - edges
# - pois
# - qr_anchors
# - alembic_version
```

## Backend Implementation

### Key Components

#### 1. Database Models (`app/models/`)

- `FloorPlan` - Stores floor plan metadata
- `Node` - Navigation waypoints
- `Edge` - Connections between nodes
- `POI` - Points of interest
- `QRAnchor` - QR code anchors

#### 2. Pathfinding Service (`app/services/pathfinding.py`)

**Core Function: `calculate_route()`**

```python
from app.services.pathfinding import PathfindingService

# Calculate route between two nodes
route = PathfindingService.calculate_route(
    db=db,
    floor_plan_id=floor_plan_id,
    start_node_id=start_node_id,
    end_node_id=end_node_id,
    preferences=RoutePreferences(
        accessible_only=False,
        avoid_stairs=False
    )
)
```

**Algorithm: A* (A-Star)**

- Uses NetworkX library
- Heuristic: Euclidean distance
- Weight: Pixel distance between nodes
- Filters edges based on user preferences

#### 3. QR Code Service (`app/services/qr_service.py`)

```python
from app.services.qr_service import QRCodeService

# Generate QR code
qr_image = QRCodeService.generate_qr_code(
    data="https://navio.app/navigate?qr=NAV-001"
)

# Get location from QR code
location = QRCodeService.get_location_from_qr(db, "NAV-001")
```

#### 4. API Routes (`app/api/routes.py`)

**Key Endpoints:**

- `POST /api/v1/floor-plans` - Create floor plan
- `GET /api/v1/floor-plans/{id}` - Get floor plan with graph
- `POST /api/v1/nodes` - Create navigation node
- `POST /api/v1/edges` - Create edge (auto-calculates weight)
- `POST /api/v1/pois` - Create point of interest
- `POST /api/v1/qr-anchors` - Create QR anchor
- `POST /api/v1/routes/calculate` - Calculate route
- `POST /api/v1/qr/scan` - Process QR scan

### Testing Backend

```bash
cd backend

# Run tests
pytest

# Test specific module
pytest tests/test_pathfinding.py

# With coverage
pytest --cov=app tests/
```

## Frontend Implementation

### Key Components

#### 1. FloorPlanMap Component

**Location:** `frontend/src/components/FloorPlanMap.tsx`

**Features:**
- Renders floor plan using Leaflet.js
- Displays nodes, edges, POIs
- Shows calculated routes
- Handles map clicks

**Usage:**
```tsx
<FloorPlanMap
  floorPlan={floorPlan}
  route={route}
  showNodes={true}
  showEdges={true}
  showPOIs={true}
/>
```

#### 2. NavigationPanel Component

**Location:** `frontend/src/components/NavigationPanel.tsx`

**Features:**
- Select start/end points
- Display route instructions
- Show distance and time estimates

#### 3. API Client

**Location:** `frontend/src/services/api.ts`

```typescript
import api from './services/api';

// Get floor plan
const floorPlan = await api.getFloorPlan(id);

// Calculate route
const route = await api.calculateRoute({
  floor_plan_id: floorPlanId,
  start_node_id: startId,
  end_node_id: endId
});
```

## Coordinate System Configuration

### Understanding the Coordinate System

NavIO uses **two coordinate systems**:

1. **Pixel Space (Database)**
   - Origin: Top-left (0, 0)
   - X-axis: Left → Right
   - Y-axis: Top → Bottom
   - Units: Pixels

2. **Leaflet Space (Display)**
   - Origin: Bottom-left (0, 0)
   - X-axis: Left → Right
   - Y-axis: Bottom → Top
   - Units: Map units

### Conversion Functions

**Location:** `frontend/src/utils/coordinates.ts`

```typescript
// Database → Display
const leafletCoords = pixelToLeaflet(x, y, imageHeight);

// Display → Database
const pixelCoords = leafletToPixel(lat, lng, imageHeight);
```

### Leaflet Configuration

```typescript
import L from 'leaflet';

// Create map with CRS.Simple (non-geographical)
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 2
});

// Define bounds
const bounds = [[0, 0], [imageHeight, imageWidth]];

// Add floor plan image
L.imageOverlay(imageUrl, bounds).addTo(map);

// Fit to bounds
map.fitBounds(bounds);
```

### Example: Adding a Marker

```typescript
// Database coordinates
const nodeX = 450;
const nodeY = 300;

// Convert to Leaflet
const coords = pixelToLeaflet(nodeX, nodeY, floorPlan.image_height);

// Add marker
L.marker([coords.lat, coords.lng]).addTo(map);
```

## Testing

### Backend Tests

```bash
cd backend
pytest tests/
```

### Frontend Tests

```bash
cd frontend
npm test
```

### End-to-End Testing

1. Upload floor plan
2. Create nodes and edges
3. Add POIs
4. Generate QR codes
5. Test navigation
6. Verify route calculation

## Deployment

### Production Checklist

- [ ] Change `SECRET_KEY` in `.env`
- [ ] Set `DEBUG=False`
- [ ] Configure production database
- [ ] Set up HTTPS
- [ ] Configure CORS origins
- [ ] Enable database backups
- [ ] Set up monitoring
- [ ] Configure CDN for static files

### Docker Deployment

```bash
# Build images
docker-compose build

# Start in production mode
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f
```

### Traditional Deployment

#### Backend (with Gunicorn)

```bash
# Install Gunicorn
pip install gunicorn

# Run with multiple workers
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

#### Frontend (Build & Serve)

```bash
# Build production bundle
npm run build

# Serve with nginx or any static server
# Copy build/ directory to web server
```

## Admin Workflow

### Step 1: Upload Floor Plan

```bash
POST /api/v1/floor-plans
{
  "name": "Building A - Floor 1",
  "description": "First floor",
  "image_width": 2000,
  "image_height": 1500
}
```

Then upload the image file to the returned `image_url` path.

### Step 2: Create Navigation Graph

#### Option A: Manual Node Placement

Click on the map to place nodes at key locations:
- Entrances/exits
- Hallway intersections
- Near POIs
- Stairs/elevators

```bash
POST /api/v1/nodes
{
  "floor_plan_id": "uuid",
  "x": 450,
  "y": 300,
  "node_type": "waypoint",
  "name": "Main Hallway"
}
```

#### Option B: Auto-generate (Future Enhancement)

Use image processing to detect walkable areas and generate a NavMesh.

### Step 3: Create Edges

Connect nodes to create walkable paths:

```bash
POST /api/v1/edges
{
  "floor_plan_id": "uuid",
  "source_node_id": "node-1-uuid",
  "target_node_id": "node-2-uuid",
  "bidirectional": true,
  "accessible": true
}
```

Weight is auto-calculated using Euclidean distance.

### Step 4: Add POIs

Tag important locations:

```bash
POST /api/v1/pois
{
  "floor_plan_id": "uuid",
  "node_id": "node-uuid",
  "name": "Radiology Department",
  "category": "medical",
  "x": 450,
  "y": 300,
  "searchable": true
}
```

### Step 5: Generate QR Anchors

Create QR codes for physical placement:

```bash
POST /api/v1/qr-anchors
{
  "floor_plan_id": "uuid",
  "node_id": "node-uuid",
  "code": "NAV-A1-001",
  "x": 450,
  "y": 300,
  "placement_notes": "On wall next to elevator"
}
```

Download and print the QR code, then place it at the specified location.

## User Workflow

### Step 1: Scan QR Code

User scans QR code with their phone camera or a QR scanner app.

**QR Code Format:**
```
https://navio.app/navigate?qr=NAV-A1-001
```

### Step 2: App Opens

The web app opens automatically (PWA) and calls:

```bash
POST /api/v1/qr/scan
{
  "qr_code": "NAV-A1-001"
}
```

Response includes:
- Current floor plan
- Current location (x, y, node_id)
- Nearby POIs

### Step 3: Select Destination

User selects destination from:
- Search box (searchable POIs)
- Dropdown list
- Map click

### Step 4: Calculate Route

```bash
POST /api/v1/routes/calculate
{
  "floor_plan_id": "uuid",
  "start_node_id": "current-node-uuid",
  "end_node_id": "destination-node-uuid",
  "preferences": {
    "accessible_only": false,
    "avoid_stairs": false
  }
}
```

### Step 5: Display Route

- Show path on map (green line)
- Display turn-by-turn instructions
- Show estimated time and distance

### Step 6: Navigate

User follows the visual path and instructions to reach their destination.

## Troubleshooting

### Common Issues

#### 1. Coordinates Not Aligning

**Problem:** Markers appear in wrong locations

**Solution:** Verify coordinate conversion
```typescript
// Always use conversion functions
const coords = pixelToLeaflet(x, y, imageHeight);
```

#### 2. No Path Found

**Problem:** Route calculation fails

**Solution:**
- Verify nodes are connected with edges
- Check if preferences are too restrictive
- Ensure start/end nodes exist in graph

#### 3. QR Code Not Working

**Problem:** QR scan doesn't return location

**Solution:**
- Verify QR anchor is `active: true`
- Check QR code matches database `code` field
- Ensure node_id references valid node

## Next Steps

### MVP Enhancements

1. **Image Upload** - Implement file upload for floor plans
2. **Auto-connect Nodes** - Smart edge creation
3. **Multi-floor Support** - Handle building with multiple floors
4. **Real-time Updates** - WebSocket for live navigation
5. **Analytics** - Track popular routes and QR scans
6. **Mobile App** - Native apps for iOS/Android
7. **NavMesh Generation** - Auto-generate walkable areas
8. **Turn-by-turn Voice** - Audio navigation instructions
9. **Accessibility Features** - Screen reader support
10. **Admin Dashboard** - Full management interface

### Production Considerations

- **Scaling:** Add load balancer, cache layer (Redis)
- **Security:** Implement authentication, authorization
- **Monitoring:** Add logging, error tracking (Sentry)
- **Backup:** Automated database backups
- **CDN:** Serve static assets via CDN
- **SSL:** HTTPS everywhere
- **Rate Limiting:** Prevent API abuse

## Support

For issues, questions, or contributions:
- GitHub Issues: [Create Issue]
- Documentation: `/docs`
- API Docs: http://localhost:8000/docs

## License

MIT License - See LICENSE file
