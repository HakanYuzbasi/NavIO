# NavIO - Indoor Wayfinding SaaS

NavIO is a Progressive Web App (PWA) for indoor navigation and wayfinding. It enables administrators to upload floor plans, create walkable paths, and allows users to navigate using QR code anchors.

## Features

- **PWA Architecture**: No native app downloads required
- **QR Code Localization**: Indoor positioning without GPS
- **Visual Path Planning**: Draw walkable paths on floor plan images
- **Point of Interest (POI) Management**: Tag and label rooms/locations
- **Shortest Path Calculation**: A* pathfinding algorithm
- **Interactive Map Interface**: Leaflet.js with custom coordinate system

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

## Quick Start

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

### Docker Setup

```bash
docker-compose up -d
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

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
