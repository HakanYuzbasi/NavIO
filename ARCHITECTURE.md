# NaviO MVP - Technical Architecture

Complete production-ready architecture for indoor navigation system using QR-code positioning and A* pathfinding.

## System Overview

NaviO is a web-based indoor navigation system that helps users navigate large venues (malls, hospitals, conference centers) where GPS doesn't work. The system uses QR codes for positioning and graph-based routing for navigation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (PWA)                       │
│                      Next.js + TypeScript                    │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │ QR Scanner │  │ Interactive│  │ Navigation Interface │ │
│  │ Component  │  │ SVG Map    │  │ (Visitor + Admin)    │ │
│  └────────────┘  └────────────┘  └──────────────────────┘ │
│         │               │                     │             │
│         └───────────────┴─────────────────────┘             │
│                         │                                    │
│                    REST API Client                           │
└─────────────────────────┼───────────────────────────────────┘
                          │
                    HTTP/JSON
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                         │                                    │
│                  Backend API Server                          │
│                  Node.js + Express + TypeScript              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              REST API Endpoints                       │  │
│  │  /api/venues  /api/nodes  /api/edges  /api/route     │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────┬───────┴────────┬──────────────────────┐  │
│  │   Venue      │   Pathfinding  │    QR Service        │  │
│  │   Service    │   Service (A*) │                      │  │
│  └──────────────┴────────────────┴──────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         In-Memory Data Store (MVP)                    │  │
│  │         (Replace with PostgreSQL/MongoDB in Prod)     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **API Style**: REST
- **Data Storage**: In-memory (easily replaceable with database)
- **Routing Algorithm**: A* pathfinding
- **Security**: Helmet (security headers), CORS enabled
- **Compression**: gzip compression middleware

### Frontend

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: CSS-in-JS (styled-jsx)
- **PWA**: Manifest + Service Worker ready
- **Map Rendering**: SVG with zoom/pan
- **QR Scanning**: Browser Camera API
- **State Management**: React hooks (useState, useEffect)

## Data Models

### Core Entities

#### 1. Venue

Represents an indoor venue (mall, hospital, etc.)

```typescript
interface Venue {
  id: string;              // UUID
  name: string;            // "Conference Center A"
  mapImageUrl?: string;    // Optional floor plan image
  width?: number;          // Map width in pixels
  height?: number;         // Map height in pixels
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. Node

Location points within a venue

```typescript
interface Node {
  id: string;              // UUID
  venueId: string;         // Parent venue
  name: string;            // "Main Entrance", "Booth 42"
  type: NodeType;          // 'entrance' | 'booth' | 'intersection'
  x: number;               // X coordinate on map
  y: number;               // Y coordinate on map
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3. Edge

Walkable connections between nodes

```typescript
interface Edge {
  id: string;              // UUID
  venueId: string;         // Parent venue
  fromNodeId: string;      // Starting node
  toNodeId: string;        // Ending node
  distance: number;        // Distance in meters
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4. QR Mapping

Maps QR codes to nodes

```typescript
interface QRMapping {
  qrId: string;            // QR code identifier
  nodeId: string;          // Mapped node
  createdAt: Date;
}
```

## API Endpoints

### Venues

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/venues` | List all venues |
| GET | `/api/venues/:id` | Get venue by ID |
| POST | `/api/venues` | Create new venue |
| PUT | `/api/venues/:id` | Update venue |
| DELETE | `/api/venues/:id` | Delete venue |

### Nodes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/nodes?venueId={id}` | List nodes (filtered by venue) |
| GET | `/api/nodes/:id` | Get node by ID |
| POST | `/api/nodes` | Create new node |
| PUT | `/api/nodes/:id` | Update node |
| DELETE | `/api/nodes/:id` | Delete node |

### Edges

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/edges?venueId={id}` | List edges (filtered by venue) |
| GET | `/api/edges/:id` | Get edge by ID |
| POST | `/api/edges` | Create new edge |
| DELETE | `/api/edges/:id` | Delete edge |

### Routing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/route` | Calculate shortest path |
| GET | `/api/route/validate/:venueId` | Validate graph connectivity |
| GET | `/api/route/reachable/:venueId/:nodeId` | Find reachable nodes |

### QR Codes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/qr` | Create QR mapping |
| POST | `/api/qr/generate/:nodeId` | Generate QR for node |
| POST | `/api/qr/generate-venue/:venueId` | Generate QRs for all nodes |
| GET | `/api/qr/:qrId` | Get QR mapping |
| GET | `/api/qr/node/:nodeId` | Get QR codes for node |
| GET | `/api/qr/url/:venueId/:nodeId` | Generate QR URL |
| DELETE | `/api/qr/:qrId` | Delete QR mapping |

## A* Pathfinding Algorithm

### Implementation

```typescript
class PathfindingService {
  async findPath(
    venueId: string,
    startNodeId: string,
    endNodeId: string
  ): Promise<RouteResponse | null>
}
```

### Algorithm Steps

1. **Graph Construction**
   - Build adjacency list from nodes and edges
   - Store nodes in Map for O(1) lookup
   - Each node knows its neighbors and distances

2. **Heuristic Function**
   - Euclidean distance between nodes
   - `h(n) = √((x₁-x₂)² + (y₁-y₂)²)`

3. **A* Search**
   - Priority queue ordered by f(n) = g(n) + h(n)
   - g(n) = actual cost from start
   - h(n) = estimated cost to goal
   - Expands most promising nodes first

4. **Path Reconstruction**
   - Backtrack from goal to start using came-from map
   - Return ordered list of nodes

5. **Time Estimation**
   - Average walking speed: 1.4 m/s
   - Estimated time = distance / 1.4

### Complexity

- Time: O(E log V) where E = edges, V = vertices
- Space: O(V)

## Frontend-Backend Interaction

### Navigation Flow

```
1. User scans QR code or selects "I am near..."
   ↓
2. Frontend extracts nodeId from QR URL
   ↓
3. Frontend sets currentLocation = nodeId
   ↓
4. User selects destination from search
   ↓
5. Frontend calls POST /api/route
   {
     venueId: "venue-123",
     startNodeId: "node-1",
     endNodeId: "node-42"
   }
   ↓
6. Backend runs A* algorithm
   ↓
7. Backend returns route
   {
     path: [node1, node2, node3, node42],
     totalDistance: 145.5,
     estimatedTimeSeconds: 104
   }
   ↓
8. Frontend highlights route on map
   ↓
9. User follows highlighted path
```

### QR Code Flow

```
QR Code Content:
https://your-domain.com/venue/VENUE_ID?node=NODE_ID

Scanning Process:
1. User scans QR code with camera
2. QRScanner component decodes URL
3. Extract venueId and nodeId from URL
4. Navigate to /venue/VENUE_ID?node=NODE_ID
5. Set current location to nodeId
```

## Project Structure

```
NaviO/
├── backend-node/                 # Node.js Backend
│   ├── src/
│   │   ├── config/               # Configuration
│   │   │   └── index.ts
│   │   ├── middleware/           # Express middleware
│   │   │   ├── cors.ts
│   │   │   └── errorHandler.ts
│   │   ├── models/               # Data models
│   │   │   └── store.ts         # In-memory store
│   │   ├── routes/               # API routes
│   │   │   ├── venues.ts
│   │   │   ├── nodes.ts
│   │   │   ├── edges.ts
│   │   │   ├── routing.ts
│   │   │   └── qr.ts
│   │   ├── services/             # Business logic
│   │   │   ├── pathfinding.ts   # A* algorithm
│   │   │   └── qr.ts            # QR service
│   │   ├── types/                # TypeScript types
│   │   │   └── index.ts
│   │   ├── server.ts             # Express app setup
│   │   └── index.ts              # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── frontend-next/                # Next.js Frontend
│   ├── public/
│   │   ├── manifest.json         # PWA manifest
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── src/
│   │   ├── components/
│   │   │   ├── InteractiveMap.tsx   # SVG map
│   │   │   └── QRScanner.tsx        # Camera scanner
│   │   ├── lib/
│   │   │   └── api.ts                # API client
│   │   ├── pages/
│   │   │   ├── _app.tsx              # App wrapper
│   │   │   ├── index.tsx             # Home page
│   │   │   ├── admin.tsx             # Admin panel
│   │   │   └── venue/
│   │   │       └── [venueId].tsx     # Navigation page
│   │   ├── styles/
│   │   │   └── globals.css
│   │   └── types/
│   │       └── index.ts
│   ├── next.config.js
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
└── ARCHITECTURE.md               # This file
```

## Deployment

### Development

```bash
# Backend
cd backend-node
npm install
npm run dev    # Runs on http://localhost:8000

# Frontend
cd frontend-next
npm install
npm run dev    # Runs on http://localhost:3000
```

### Production

#### Backend

```bash
cd backend-node
npm install
npm run build
npm start
```

#### Frontend

```bash
cd frontend-next
npm install
npm run build
npm start
```

### Docker

```yaml
version: '3.8'
services:
  backend:
    build: ./backend-node
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - PORT=8000

  frontend:
    build: ./frontend-next
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
```

## Security Considerations

### Backend

- Helmet middleware for security headers
- CORS configured with origin whitelist
- Input validation on all endpoints
- No SQL injection (using typed ORM)
- Rate limiting (recommended for production)

### Frontend

- No sensitive data stored in localStorage
- HTTPS in production (enforced)
- Content Security Policy headers
- XSS protection via React
- No inline scripts

### Privacy

- No user tracking
- No personal data stored
- No authentication required for visitors
- GDPR-compliant by design

## Performance Optimization

### Backend

- Compression middleware (gzip)
- Efficient graph algorithms (A*)
- Indexed data structures (Map, Set)
- Connection pooling (when using database)

### Frontend

- Code splitting per page
- Lazy loading components
- Image optimization
- Service worker caching (PWA)
- Minimal bundle size

## Testing Strategy

### Backend

```bash
# Unit tests for:
- A* algorithm correctness
- Graph validation
- Edge distance calculations
- Route reconstruction

# Integration tests for:
- API endpoints
- Error handling
- Data validation
```

### Frontend

```bash
# Component tests for:
- QR scanner functionality
- Map zoom/pan
- Route visualization

# E2E tests for:
- Complete navigation flow
- Admin panel operations
```

## Future Enhancements (Post-MVP)

### Backend

- Replace in-memory store with PostgreSQL/MongoDB
- Add database migrations
- Implement caching (Redis)
- Add analytics endpoints
- Multi-floor support

### Frontend

- Offline support (full PWA)
- Real QR library integration (jsQR)
- Turn-by-turn directions
- Voice guidance
- Multi-language support
- Accessibility improvements

### Features

- User accounts (optional)
- Favorite locations
- Route history
- Real-time updates
- Crowd density indicators

## Maintenance

### Updating Dependencies

```bash
# Backend
cd backend-node
npm update

# Frontend
cd frontend-next
npm update
```

### Monitoring

- Health check endpoint: `/health`
- Error logging (console for MVP)
- Performance metrics (response times)

## Troubleshooting

### Common Issues

**Backend won't start**
- Check if port 8000 is available
- Verify Node.js version (>=18)
- Check environment variables

**Frontend can't connect to backend**
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS configuration
- Ensure backend is running

**QR scanner not working**
- Grant camera permissions
- Use HTTPS (required for camera access)
- Test on physical device (not all simulators support camera)

## License

MIT

## Support

For issues and questions:
- Backend: See backend-node/README.md
- Frontend: See frontend-next/README.md
- General: Open an issue on GitHub
