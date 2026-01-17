# NaviO Backend - Node.js/TypeScript

Production-ready REST API backend for NaviO indoor navigation system.

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Routing Algorithm**: A* pathfinding
- **Data Storage**: In-memory (easily replaceable with PostgreSQL/MongoDB)

## Features

- RESTful API architecture
- Type-safe with TypeScript
- A* pathfinding algorithm for optimal routes
- Graph-based navigation model
- QR code positioning system
- CORS enabled
- Security headers with Helmet
- Request compression
- Error handling middleware

## Installation

```bash
npm install
```

## Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```
PORT=8000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
COORDINATE_CONVERSION_FACTOR=1.0
```

## Development

Start the development server with hot reload:

```bash
npm run dev
```

## Production

Build the TypeScript code:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## API Endpoints

### Venues

- `GET /api/venues` - List all venues
- `GET /api/venues/:id` - Get venue by ID
- `POST /api/venues` - Create new venue
- `PUT /api/venues/:id` - Update venue
- `DELETE /api/venues/:id` - Delete venue

### Nodes

- `GET /api/nodes?venueId={id}` - List nodes (filtered by venue)
- `GET /api/nodes/:id` - Get node by ID
- `POST /api/nodes` - Create new node
- `PUT /api/nodes/:id` - Update node
- `DELETE /api/nodes/:id` - Delete node

### Edges

- `GET /api/edges?venueId={id}` - List edges (filtered by venue)
- `GET /api/edges/:id` - Get edge by ID
- `POST /api/edges` - Create new edge
- `DELETE /api/edges/:id` - Delete edge

### Routing

- `POST /api/route` - Calculate shortest path
- `GET /api/route/validate/:venueId` - Validate graph connectivity
- `GET /api/route/reachable/:venueId/:nodeId` - Find reachable nodes

### QR Codes

- `POST /api/qr` - Create QR mapping
- `POST /api/qr/generate/:nodeId` - Generate QR for node
- `POST /api/qr/generate-venue/:venueId` - Generate QRs for all venue nodes
- `GET /api/qr/:qrId` - Get QR mapping
- `GET /api/qr/node/:nodeId` - Get QR codes for node
- `GET /api/qr/url/:venueId/:nodeId` - Generate QR URL
- `DELETE /api/qr/:qrId` - Delete QR mapping

### Health

- `GET /health` - Health check endpoint

## API Usage Examples

### Create a Venue

```bash
curl -X POST http://localhost:8000/api/venues \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Conference Center",
    "mapImageUrl": "https://example.com/map.png",
    "width": 1000,
    "height": 800
  }'
```

### Create Nodes

```bash
curl -X POST http://localhost:8000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "venueId": "venue-id",
    "name": "Main Entrance",
    "type": "entrance",
    "x": 100,
    "y": 100
  }'
```

### Create Edge

```bash
curl -X POST http://localhost:8000/api/edges \
  -H "Content-Type: application/json" \
  -d '{
    "venueId": "venue-id",
    "fromNodeId": "node-1",
    "toNodeId": "node-2",
    "distance": 50
  }'
```

### Calculate Route

```bash
curl -X POST http://localhost:8000/api/route \
  -H "Content-Type: application/json" \
  -d '{
    "venueId": "venue-id",
    "startNodeId": "node-1",
    "endNodeId": "node-5"
  }'
```

Response:

```json
{
  "path": [
    { "id": "node-1", "name": "Entrance", "x": 100, "y": 100, ... },
    { "id": "node-2", "name": "Hallway A", "x": 150, "y": 100, ... },
    { "id": "node-5", "name": "Booth 15", "x": 300, "y": 200, ... }
  ],
  "totalDistance": 223.6,
  "estimatedTimeSeconds": 160
}
```

## Architecture

### Data Models

The system uses five core entities:

1. **Venue** - Represents an indoor venue (mall, hospital, etc.)
2. **Node** - Location points within a venue (entrances, booths, intersections)
3. **Edge** - Walkable connections between nodes with distances
4. **QR Mapping** - Maps QR codes to specific nodes
5. **Route** - Calculated path between two nodes

### A* Pathfinding

The routing service implements the A* algorithm for optimal pathfinding:

- **Heuristic**: Euclidean distance between nodes
- **Graph**: Built from nodes and edges
- **Cost**: Actual walking distance along edges
- **Output**: Ordered list of nodes forming the shortest path

### Folder Structure

```
backend-node/
├── src/
│   ├── config/          # Configuration
│   ├── middleware/      # Express middleware
│   ├── models/          # Data store
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   │   ├── pathfinding.ts  # A* algorithm
│   │   └── qr.ts           # QR service
│   ├── types/           # TypeScript types
│   ├── server.ts        # Express app
│   └── index.ts         # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Data Flow

1. Admin creates venue via POST `/api/venues`
2. Admin creates navigation graph (nodes + edges)
3. System generates QR codes for nodes
4. Visitor scans QR code → Gets `nodeId`
5. Visitor selects destination
6. Frontend calls POST `/api/route` with start and end nodes
7. Backend runs A* algorithm
8. Backend returns optimal path
9. Frontend renders route on map

## Production Deployment

### Replace In-Memory Storage

For production, replace the in-memory store with a database:

1. Install database driver (e.g., `pg` for PostgreSQL)
2. Create database schemas
3. Replace `src/models/store.ts` with database queries
4. Add database connection pooling
5. Implement migrations

### Environment Variables

Production environment variables:

```
NODE_ENV=production
PORT=8000
CORS_ORIGIN=https://your-frontend-domain.com
DATABASE_URL=postgresql://user:pass@host:5432/navio
```

### Docker

Example Dockerfile:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 8000
CMD ["node", "dist/index.js"]
```

## Testing

```bash
npm test
```

## Linting

```bash
npm run lint
```

## Formatting

```bash
npm run format
```

## License

MIT
