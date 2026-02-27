# NavIO - Indoor Wayfinding SaaS

NavIO is a Progressive Web App (PWA) for indoor navigation and wayfinding. It enables administrators to upload floor plans, create walkable paths, and allows users to navigate using QR code anchors.

---

## 🎯 **MVP Food Hall Demo**

**Value Proposition:** *"Help visitors find booths in seconds"*

We've created a **working demo** featuring a real food hall with 31 vendor booths. Try the complete navigation experience!

### Quick Demo Setup

**Mac/Linux:**
```bash
./setup-demo.sh
```

**Windows:**
```bash
setup-demo.bat
```

This will:
- ✅ Start NavIO services
- ✅ Populate a food hall with 31 booths
- ✅ Create navigation graph with 11 nodes
- ✅ Set up 5 QR code anchors
- ✅ Enable A* pathfinding

**Then open**: http://localhost:3000

📖 **Full Demo Guide**: [MVP_DEMO_GUIDE.md](./MVP_DEMO_GUIDE.md)

---

## Features

### Core Navigation
- **PWA Architecture**: No native app downloads required
- **QR Code Localization**: Indoor positioning without GPS
- **Visual Path Planning**: Draw walkable paths on floor plan images
- **Point of Interest (POI) Management**: Tag and label rooms/locations
- **Shortest Path Calculation**: A* pathfinding algorithm with caching
- **Interactive Map Interface**: Leaflet.js with custom coordinate system

### Investor-Ready Features
- **Real-Time Analytics Dashboard**: Track usage, QR scans, venue metrics
- **Export Capabilities**: PDF reports, CSV data exports, JSON API responses
- **User Onboarding**: Interactive tutorial flow for new users
- **Admin Analytics Panel**: Comprehensive usage statistics and insights
- **Third-Party Integrations**: Webhooks, API keys, embed codes
- **Performance Optimizations**: Query caching, optimized database access, graph caching
- **Mobile-Responsive Design**: Optimized for all device sizes
- **Breadcrumb Navigation**: Intuitive navigation paths throughout the app

## Tech Stack

### Backend
- Python 3.10+
- FastAPI (REST API)
- NetworkX (pathfinding)
- PostgreSQL + PostGIS (spatial data)
- SQLAlchemy (ORM)
- Pydantic (data validation)

### Frontend
- React 18 + TypeScript
- Leaflet.js (map rendering)
- React Router (navigation)
- Axios (API client)
- TailwindCSS (styling)

## Project Structure

```
NavIO/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Core configuration
│   │   ├── models/      # Database models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # Business logic
│   │   └── main.py      # Application entry point
│   ├── alembic/         # Database migrations
│   ├── tests/           # Backend tests
│   └── requirements.txt
├── frontend/            # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API clients
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Utility functions
│   └── package.json
├── docs/                # Documentation
└── docker-compose.yml   # Docker configuration
```

## 🚀 Quick Start (For Local Deployment)

### Prerequisites

You only need **Docker Desktop** installed:
- Download from: https://www.docker.com/products/docker-desktop/
- Available for Windows, Mac, and Linux

### Option 1: One-Command Setup (Recommended)

**Mac/Linux:**
```bash
./quick-start.sh
```

**Windows:**
```bash
quick-start.bat
```

This script will automatically:
- ✅ Check if Docker is installed and running
- ✅ Set up environment variables
- ✅ Build and start all services (database, backend, frontend)
- ✅ Show you where to access the application

### Option 2: Manual Docker Setup

```bash
# 1. Copy environment file
cp backend/.env.example backend/.env

# 2. Start all services
docker-compose up -d

# 3. Access the application
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

### Option 3: Manual Setup (Without Docker)

See the complete guide: **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

---

### 📍 Access Your Application

Once running, open these URLs:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | User interface |
| **API Swagger Docs** | http://localhost:8000/docs | Interactive API testing |
| **API ReDoc** | http://localhost:8000/redoc | Alternative API docs |

### 🛑 Stop the Application

```bash
docker-compose down
```

### 📚 Need More Help?

- **Complete Deployment Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Implementation Guide**: [docs/IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md)
- **Architecture Overview**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Coordinate System**: [docs/COORDINATE_SYSTEM.md](./docs/COORDINATE_SYSTEM.md)

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### New API Endpoints

#### Analytics
- `GET /api/v1/analytics/overview` - Comprehensive analytics overview
- `GET /api/v1/analytics/floor-plan/{id}` - Floor plan specific analytics
- `GET /api/v1/analytics/usage` - Usage statistics over time
- `GET /api/v1/analytics/export/csv` - Export analytics as CSV
- `GET /api/v1/analytics/export/json` - Export analytics as JSON

#### Export
- `GET /api/v1/export/floor-plan/{id}/json` - Export floor plan as JSON
- `GET /api/v1/export/floor-plan/{id}/csv` - Export floor plan as CSV
- `GET /api/v1/export/floor-plan/{id}/pdf` - Export floor plan report as PDF

#### Integrations
- `POST /api/v1/webhooks/qr-scan` - Webhook for QR scan events
- `GET /api/v1/integrations/health` - Integration health check
- `POST /api/v1/integrations/export/venue-data` - Export venue data for integrations
- `GET /api/v1/integrations/api-key` - Generate API key for third-party access

## Core Concepts

### 1. Floor Plans
Upload floor plan images (PNG/JPG) to create navigable spaces.

### 2. Navigation Graph
- **Nodes**: Waypoints with x,y coordinates
- **Edges**: Walkable connections between nodes
- **POIs**: Points of Interest (rooms, facilities)

### 3. QR Code Anchors
Generate QR codes mapped to specific coordinates. When scanned, users start navigation from that position.

### 4. Pathfinding
Uses A* algorithm via NetworkX to calculate optimal routes between points.

## Data Flow

1. Admin uploads floor plan image
2. Admin creates navigation graph (nodes + edges)
3. Admin tags POIs on the map
4. Admin generates QR codes for physical placement
5. User scans QR code → Gets location
6. User selects destination
7. System calculates shortest path
8. Path displayed on floor plan

## Development

### Run Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## License

MIT License - See LICENSE file for details

## Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.
