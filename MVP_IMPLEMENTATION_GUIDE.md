# NaviO MVP - Complete Implementation Guide

This guide provides step-by-step instructions for setting up and running the NaviO indoor navigation system.

## 🎯 What is NaviO?

NaviO is a **production-ready indoor navigation system** that helps visitors navigate large venues (malls, hospitals, conference centers) where GPS doesn't work.

**Key Features:**
- 📱 Progressive Web App (works on any device)
- 🔍 QR code-based positioning
- 🗺️ Interactive indoor maps
- 🎯 A* pathfinding algorithm
- 🚀 No app downloads required

## 📋 Prerequisites

- **Node.js** 18 or higher
- **npm** 9 or higher
- Modern web browser (Chrome, Safari, Firefox)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd NaviO
```

### 2. Backend Setup

```bash
cd backend-node

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```

Backend will run on **http://localhost:8000**

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend-next

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```

Frontend will run on **http://localhost:3000**

### 4. Open the Application

Visit **http://localhost:3000** in your browser.

## 📖 Step-by-Step Tutorial

### Creating Your First Venue

#### Step 1: Access Admin Panel

1. Open http://localhost:3000
2. Click "Admin" button in the header

#### Step 2: Create a Venue

1. In the sidebar, fill in the "Create Venue" form:
   - **Venue name**: "Conference Center"
   - **Map image URL**: (optional) URL to floor plan image
   - **Width**: 1000
   - **Height**: 800

2. Click "Create Venue"

#### Step 3: Create Nodes

Nodes are locations within your venue (entrances, booths, intersections).

1. Select your venue from the sidebar
2. Click the "Nodes" tab
3. Create the following nodes:

**Main Entrance**
- Name: "Main Entrance"
- Type: entrance
- X: 100
- Y: 100

**Booth A**
- Name: "Booth A"
- Type: booth
- X: 500
- Y: 200

**Booth B**
- Name: "Booth B"
- Type: booth
- X: 800
- Y: 500

**Hallway Junction**
- Name: "Junction 1"
- Type: intersection
- X: 500
- Y: 400

#### Step 4: Create Edges

Edges are walkable paths connecting nodes.

1. Click the "Edges" tab
2. Create the following edges:

**Entrance to Junction**
- From: Main Entrance
- To: Junction 1
- Distance: 300

**Junction to Booth A**
- From: Junction 1
- To: Booth A
- Distance: 200

**Junction to Booth B**
- From: Junction 1
- To: Booth B
- Distance: 350

#### Step 5: Generate QR Codes

1. Click the "QR Codes" tab
2. Click "Generate QR Codes for All Nodes"
3. QR codes are now created for all nodes

### Testing Navigation

#### Step 1: Access Visitor Interface

1. Go back to the home page (http://localhost:3000)
2. Click on your venue

#### Step 2: Set Current Location

Option A - Manual Selection:
1. Click "I am near..."
2. Select "Main Entrance"

Option B - QR Code (for production):
1. Click "Scan QR Code"
2. Scan a physical QR code
3. (For testing, you can manually navigate to: `/venue/VENUE_ID?node=NODE_ID`)

#### Step 3: Select Destination

1. Click "Select Destination"
2. Search or select "Booth B"

#### Step 4: View Route

The map will display:
- ✅ Your current location (green dot)
- ✅ Your destination (red dot)
- ✅ Optimal route (blue line)
- ✅ Distance and estimated time

## 🏗️ Architecture Overview

```
┌─────────────────────────┐
│   Next.js Frontend      │
│   (Port 3000)           │
│   - Interactive Map     │
│   - QR Scanner          │
│   - Admin Panel         │
└───────────┬─────────────┘
            │ REST API
            │ (HTTP/JSON)
┌───────────▼─────────────┐
│   Express Backend       │
│   (Port 8000)           │
│   - A* Pathfinding      │
│   - Data Management     │
│   - QR Service          │
└─────────────────────────┘
```

## 📂 Project Structure

```
NaviO/
├── backend-node/          # Node.js + TypeScript Backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic (A*, QR)
│   │   ├── models/        # Data models
│   │   └── types/         # TypeScript types
│   └── package.json
│
├── frontend-next/         # Next.js + TypeScript Frontend
│   ├── src/
│   │   ├── pages/         # Pages (home, admin, venue)
│   │   ├── components/    # React components
│   │   ├── lib/           # API client
│   │   └── types/         # TypeScript types
│   └── package.json
│
└── ARCHITECTURE.md        # Detailed architecture docs
```

## 🔌 API Endpoints

### Venues

```bash
# Get all venues
GET /api/venues

# Create venue
POST /api/venues
{
  "name": "Conference Center",
  "width": 1000,
  "height": 800
}
```

### Nodes

```bash
# Get nodes for a venue
GET /api/nodes?venueId=VENUE_ID

# Create node
POST /api/nodes
{
  "venueId": "VENUE_ID",
  "name": "Main Entrance",
  "type": "entrance",
  "x": 100,
  "y": 100
}
```

### Routing

```bash
# Calculate route
POST /api/route
{
  "venueId": "VENUE_ID",
  "startNodeId": "NODE_1",
  "endNodeId": "NODE_2"
}

# Response
{
  "path": [node1, node2, node3],
  "totalDistance": 550,
  "estimatedTimeSeconds": 393
}
```

## 🔧 Configuration

### Backend (.env)

```bash
PORT=8000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
COORDINATE_CONVERSION_FACTOR=1.0
```

### Frontend (.env)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📱 Progressive Web App (PWA)

### Installing on Mobile

**iOS (Safari):**
1. Open the app in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. Tap "Add"

**Android (Chrome):**
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Tap "Install app"

### PWA Features

- ✅ Works offline (basic functionality)
- ✅ Add to home screen
- ✅ Full-screen mode
- ✅ Native app feel

## 🏭 Production Deployment

### Backend

```bash
cd backend-node
npm run build
npm start
```

### Frontend

```bash
cd frontend-next
npm run build
npm start
```

### Environment Variables (Production)

**Backend:**
```bash
NODE_ENV=production
PORT=8000
CORS_ORIGIN=https://your-domain.com
```

**Frontend:**
```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

### Docker Deployment

```bash
# Build images
docker build -t navio-backend ./backend-node
docker build -t navio-frontend ./frontend-next

# Run containers
docker run -d -p 8000:8000 navio-backend
docker run -d -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://backend:8000 navio-frontend
```

## 🧪 Testing

### Manual Testing Checklist

**Backend:**
- [ ] Health check: http://localhost:8000/health
- [ ] Create venue via API
- [ ] Create nodes via API
- [ ] Create edges via API
- [ ] Calculate route via API

**Frontend:**
- [ ] Load home page
- [ ] Access admin panel
- [ ] Create venue via UI
- [ ] Create nodes via UI
- [ ] Create edges via UI
- [ ] Navigate to venue page
- [ ] Select location
- [ ] Select destination
- [ ] View route on map

**PWA:**
- [ ] Install on mobile device
- [ ] Launch from home screen
- [ ] Use QR scanner

## 🐛 Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Find process using port 8000
lsof -i :8000
# Kill the process
kill -9 <PID>
```

**Dependencies not installing:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Frontend Issues

**Cannot connect to backend:**
- Verify backend is running
- Check NEXT_PUBLIC_API_URL in .env
- Check browser console for CORS errors

**QR scanner not working:**
- Camera access requires HTTPS in production
- Grant camera permissions
- Test on physical device (not all simulators support camera)

### Common Errors

**"Module not found":**
```bash
npm install
```

**"Port 3000 already in use":**
```bash
# Run on different port
npm run dev -- -p 3001
```

## 📚 Additional Resources

- **Architecture Details**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Backend Documentation**: See [backend-node/README.md](./backend-node/README.md)
- **Frontend Documentation**: See [frontend-next/README.md](./frontend-next/README.md)

## 🎓 Learning Path

1. **Day 1**: Setup and run locally
2. **Day 2**: Create first venue and test navigation
3. **Day 3**: Customize for your venue
4. **Day 4**: Deploy to production
5. **Day 5**: Print and place QR codes

## 💡 Tips for Success

### For Best Results:

1. **Map Coordinates**: Use consistent units (1 unit = 1 meter recommended)
2. **Node Placement**: Place nodes at decision points (intersections, entrances)
3. **Edge Distances**: Measure actual walking distances
4. **QR Placement**: Place QR codes at eye level near corresponding nodes
5. **Testing**: Test routes before deploying to users

### Common Use Cases:

- **Conference Centers**: Guide attendees to booths
- **Hospitals**: Help patients find departments
- **Shopping Malls**: Navigate to stores
- **Universities**: Campus building navigation
- **Trade Shows**: Exhibitor booth finding

## 🚀 Next Steps

### After MVP:

1. **Database Integration**: Replace in-memory store with PostgreSQL
2. **Multi-Floor Support**: Add floor switching
3. **Analytics**: Track popular routes
4. **Accessibility**: Add voice guidance
5. **Offline Mode**: Full PWA with offline routing

## 📞 Support

- **Issues**: Check troubleshooting section
- **Questions**: Review architecture documentation
- **Bugs**: Create detailed bug reports with steps to reproduce

## 📄 License

MIT License - Free for commercial and personal use

---

**Ready to start?** Follow the Quick Start guide above! 🚀
