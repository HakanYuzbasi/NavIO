# NavIO System Architecture

## Overview

NavIO is a Progressive Web App (PWA) for indoor wayfinding that uses QR codes for localization and A* pathfinding for navigation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐                     │
│  │   Admin UI   │     │   User PWA   │                     │
│  │  (React)     │     │  (React)     │                     │
│  └──────┬───────┘     └──────┬───────┘                     │
│         │                    │                              │
│         └────────────┬───────┘                              │
└──────────────────────┼──────────────────────────────────────┘
                       │
                       │ HTTPS/REST
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    API Layer                                 │
├─────────────────────────────────────────────────────────────┤
│                   FastAPI Backend                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐        │
│  │  Endpoints  │  │  Middleware  │  │    CORS     │        │
│  └─────┬───────┘  └──────┬───────┘  └─────────────┘        │
│        │                 │                                   │
│        └────────┬────────┘                                   │
└─────────────────┼──────────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────────┐
│                  Business Logic Layer                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │ Pathfinding      │      │   QR Service     │            │
│  │ Service          │      │   Service        │            │
│  │ (NetworkX/A*)    │      │   (qrcode)       │            │
│  └─────────┬────────┘      └────────┬─────────┘            │
│            │                        │                       │
│            └───────────┬────────────┘                       │
└────────────────────────┼──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│                   Data Access Layer                        │
├───────────────────────────────────────────────────────────┤
│                   SQLAlchemy ORM                           │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│  │FloorPlan│  │ Node  │  │ Edge  │  │  POI   │           │
│  └────────┘  └────────┘  └────────┘  └────────┘           │
└────────────────────────┬──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│                   Database Layer                           │
├───────────────────────────────────────────────────────────┤
│                PostgreSQL + PostGIS                        │
│  ┌────────────────────────────────────────────┐           │
│  │  floor_plans │ nodes │ edges │ pois │ qr  │           │
│  └────────────────────────────────────────────┘           │
└───────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend

- **Framework:** FastAPI 0.104
- **Language:** Python 3.11
- **ORM:** SQLAlchemy 2.0
- **Migrations:** Alembic 1.12
- **Validation:** Pydantic 2.5
- **Pathfinding:** NetworkX 3.2
- **QR Codes:** python-qrcode 7.4
- **Server:** Uvicorn (ASGI)

### Frontend

- **Framework:** React 18
- **Language:** TypeScript 5.3
- **Mapping:** Leaflet.js 1.9
- **State:** React Hooks
- **HTTP Client:** Axios 1.6
- **Routing:** React Router 6

### Database

- **RDBMS:** PostgreSQL 15
- **Extensions:** PostGIS (optional, for future spatial queries)
- **Connection Pooling:** SQLAlchemy pool

### Infrastructure

- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **Reverse Proxy:** Nginx (production)
- **Process Manager:** Gunicorn (production)

## Data Flow

### 1. Admin Creates Floor Plan

```
Admin → Upload Image → API → Store Metadata → Database
                              ↓
                         Return floor_plan_id
```

### 2. Admin Creates Navigation Graph

```
Admin → Click Map → Get (x,y) → API → Create Node → Database
                                      ↓
Admin → Connect Nodes → API → Create Edge → Calculate Weight → Database
```

### 3. User Scans QR Code

```
User → Scan QR → App Opens → API (/qr/scan) → Query Database
                                               ↓
                                          Return Location
                                               ↓
                                          Display Map
```

### 4. User Navigates

```
User → Select Destination → API (/routes/calculate)
                              ↓
                        Build NetworkX Graph
                              ↓
                        Run A* Algorithm
                              ↓
                        Return Path + Instructions
                              ↓
                        Display Route on Map
```

## Core Algorithms

### A* Pathfinding

**Implementation:** `backend/app/services/pathfinding.py`

```python
def calculate_route(start, end, graph):
    # Heuristic: Euclidean distance to goal
    def heuristic(n1, n2):
        return sqrt((x2-x1)^2 + (y2-y1)^2)

    # A* search
    path = nx.astar_path(
        G=graph,
        source=start,
        target=end,
        heuristic=heuristic,
        weight='weight'
    )

    return path
```

**Complexity:**
- Time: O(b^d) where b is branching factor, d is depth
- Space: O(b^d)
- Optimized with binary heap priority queue

### Weight Calculation

**Formula:** Euclidean Distance

```python
weight = sqrt((x2 - x1)^2 + (y2 - y1)^2)
```

**Units:** Pixels (can be converted to meters based on scale)

### Coordinate Conversion

**Pixel to Leaflet:**
```javascript
lat = imageHeight - y  // Invert Y-axis
lng = x                 // X stays same
```

**Leaflet to Pixel:**
```javascript
x = lng
y = imageHeight - lat  // Invert Y-axis
```

## Security Architecture

### Authentication (Future)

- JWT tokens for API authentication
- OAuth2 for social login
- Role-based access control (RBAC)

### Authorization

- Admin: Full CRUD on all resources
- User: Read-only access to floor plans
- Public: QR scan and navigation only

### Data Protection

- HTTPS/TLS encryption in transit
- Password hashing with bcrypt
- SQL injection prevention (SQLAlchemy ORM)
- XSS prevention (React escaping)
- CORS configured for allowed origins

## Scalability Considerations

### Horizontal Scaling

1. **Backend:** Stateless API servers
   - Load balancer (Nginx/HAProxy)
   - Multiple FastAPI instances
   - Session storage in Redis

2. **Database:** Read replicas
   - Master for writes
   - Replicas for reads
   - Connection pooling

3. **Frontend:** CDN distribution
   - Static assets on CDN
   - Edge caching
   - Progressive Web App

### Vertical Scaling

- Increase server resources (CPU/RAM)
- Optimize database indexes
- Query optimization
- Caching layer (Redis)

### Performance Optimizations

1. **Backend:**
   - Database query optimization
   - Connection pooling
   - Async I/O (FastAPI/Uvicorn)
   - Response caching

2. **Frontend:**
   - Code splitting
   - Lazy loading
   - Image optimization
   - Service worker caching

3. **Database:**
   - Proper indexing
   - Materialized views
   - Partial indexes
   - Query planning

## Monitoring & Observability

### Logging

- **Backend:** Python logging → JSON format
- **Frontend:** Console errors → Error tracking
- **Database:** PostgreSQL query logs

### Metrics

- Request rate (requests/second)
- Response time (latency)
- Error rate (5xx errors)
- Database connections
- Memory/CPU usage

### Tools

- **APM:** New Relic / Datadog
- **Errors:** Sentry
- **Logs:** ELK Stack (Elasticsearch, Logstash, Kibana)
- **Uptime:** Pingdom / StatusCake

## Disaster Recovery

### Backup Strategy

1. **Database:** Daily automated backups
   - Point-in-time recovery
   - Retention: 30 days

2. **Files:** S3/Object storage
   - Versioning enabled
   - Cross-region replication

3. **Configuration:** Version control (Git)

### Recovery Plan

1. Restore database from latest backup
2. Deploy application from Git repository
3. Restore uploaded files from S3
4. Verify data integrity
5. Resume operations

**RTO (Recovery Time Objective):** < 1 hour
**RPO (Recovery Point Objective):** < 24 hours

## Future Enhancements

### Multi-Floor Navigation

- Add `floor` field to nodes
- Create inter-floor connections (stairs/elevators)
- 3D visualization

### Real-time Features

- WebSocket for live updates
- Crowdsourced obstacle reporting
- Real-time density mapping

### Machine Learning

- Traffic prediction
- Optimal QR placement suggestions
- Auto-generate navigation graphs from images

### Analytics

- Popular routes
- QR scan heatmaps
- User flow analysis
- A/B testing routes

## API Design Principles

### RESTful Design

- Resources: floor-plans, nodes, edges, pois, qr-anchors
- Methods: GET, POST, PATCH, DELETE
- Status codes: 200, 201, 204, 400, 404, 500
- JSON request/response

### Versioning

- URL versioning: `/api/v1/`
- Breaking changes → new version
- Deprecation notices

### Pagination

```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "per_page": 20
}
```

### Error Handling

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Node not found",
    "details": {...}
  }
}
```

## Deployment Architecture

### Development

```
localhost:3000 (React Dev Server)
      ↓
localhost:8000 (FastAPI)
      ↓
localhost:5432 (PostgreSQL)
```

### Production

```
CloudFlare CDN
      ↓
Nginx (Reverse Proxy + Static Files)
      ↓
Gunicorn (4 workers) → FastAPI
      ↓
PostgreSQL (Primary + Replica)
```

## Code Organization

```
NavIO/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, DB
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── main.py       # Entry point
│   ├── alembic/          # Migrations
│   ├── tests/            # Tests
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API client
│   │   ├── types/        # TypeScript types
│   │   ├── utils/        # Utilities
│   │   └── App.tsx
│   └── package.json
├── docs/                 # Documentation
├── docker-compose.yml
└── README.md
```

## Conclusion

NavIO's architecture is designed for:
- **Scalability:** Horizontal scaling with load balancing
- **Maintainability:** Clean separation of concerns
- **Performance:** Optimized algorithms and caching
- **Reliability:** Backup and monitoring
- **Security:** Authentication and data protection
