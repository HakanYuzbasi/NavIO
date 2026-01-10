# 🎯 Getting Started with NavIO

Welcome! This guide will help you get NavIO running on your computer and create your first indoor navigation system.

---

## 📝 What You'll Do

1. Install prerequisites (5 minutes)
2. Start NavIO (2 minutes)
3. Create your first floor plan (10 minutes)
4. Test navigation (5 minutes)

**Total time: ~20 minutes**

---

## Step 1: Install Docker Desktop

NavIO runs in Docker containers, which means you don't need to install Python, Node.js, PostgreSQL, or any other dependencies manually.

### Download Docker Desktop

Go to: https://www.docker.com/products/docker-desktop/

- **Windows**: Download and install Docker Desktop for Windows
- **Mac**: Download and install Docker Desktop for Mac
- **Linux**: Follow the instructions for your distribution

### Verify Installation

Open your terminal (Command Prompt on Windows) and run:

```bash
docker --version
```

You should see something like: `Docker version 24.0.6`

---

## Step 2: Get NavIO Code

### Option A: Clone from Git (if you have Git)

```bash
git clone <your-repo-url>
cd NavIO
```

### Option B: Download ZIP

1. Download the NavIO code as a ZIP file
2. Extract it to a folder (e.g., `C:\NavIO` or `~/NavIO`)
3. Open terminal and navigate to that folder

---

## Step 3: Start NavIO

### Windows Users

Double-click `quick-start.bat` or run in Command Prompt:

```bash
quick-start.bat
```

### Mac/Linux Users

Open Terminal and run:

```bash
./quick-start.sh
```

### What Happens

The script will:
1. Check if Docker is running ✅
2. Set up environment variables ✅
3. Download and build containers (takes 2-5 minutes first time) ✅
4. Start all services ✅

You'll see:

```
🎉 NavIO is now running!

Access the application:
   Frontend: http://localhost:3000
   API Docs: http://localhost:8000/docs
```

---

## Step 4: Open NavIO

Open your web browser and go to:

**http://localhost:3000**

You should see the NavIO welcome screen!

---

## Step 5: Create Your First Floor Plan

Let's create a simple indoor navigation system.

### 5.1 Open the API Documentation

Go to: **http://localhost:8000/docs**

This is the Swagger UI where you can test all API endpoints.

### 5.2 Create a Floor Plan

1. Find the section **"Floor Plans"**
2. Click on **`POST /api/v1/floor-plans/`**
3. Click the **"Try it out"** button
4. Replace the JSON with:

```json
{
  "name": "Office Building - Floor 1",
  "description": "First floor of our office",
  "organization_id": "00000000-0000-0000-0000-000000000001"
}
```

5. Click **"Execute"**
6. **Copy the `id`** from the response (you'll need it!)

Example response:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Office Building - Floor 1",
  ...
}
```

### 5.3 Create Navigation Nodes

Nodes are waypoints where people can walk. Let's create 4 nodes to make a simple path.

1. Find **`POST /api/v1/floor-plans/{floor_plan_id}/nodes/`**
2. Click **"Try it out"**
3. Paste your floor plan ID in the `floor_plan_id` field
4. Create Node 1 (Entrance):

```json
{
  "x": 100,
  "y": 100,
  "node_type": "entrance",
  "name": "Main Entrance",
  "accessibility_level": "wheelchair_accessible"
}
```

5. Click **"Execute"** and **copy the node ID**
6. Repeat for 3 more nodes:

**Node 2 (Hallway Junction):**
```json
{
  "x": 300,
  "y": 100,
  "node_type": "waypoint",
  "name": "Hallway A",
  "accessibility_level": "wheelchair_accessible"
}
```

**Node 3 (Hallway Junction):**
```json
{
  "x": 300,
  "y": 300,
  "node_type": "waypoint",
  "name": "Hallway B",
  "accessibility_level": "wheelchair_accessible"
}
```

**Node 4 (Conference Room):**
```json
{
  "x": 500,
  "y": 300,
  "node_type": "waypoint",
  "name": "Conference Room",
  "accessibility_level": "wheelchair_accessible"
}
```

**Save all 4 node IDs!**

### 5.4 Connect Nodes with Edges

Edges represent walkable paths between nodes.

1. Find **`POST /api/v1/floor-plans/{floor_plan_id}/edges/`**
2. Click **"Try it out"**
3. Paste your floor plan ID
4. Create Edge 1 (Entrance → Hallway A):

```json
{
  "source_node_id": "<node-1-id>",
  "target_node_id": "<node-2-id>",
  "bidirectional": true,
  "accessible": true,
  "edge_type": "corridor"
}
```

Replace `<node-1-id>` and `<node-2-id>` with your actual node IDs!

5. Click **"Execute"**
6. Create 2 more edges:
   - Edge 2: Node 2 → Node 3
   - Edge 3: Node 3 → Node 4

### 5.5 Add a Point of Interest (POI)

Let's tag the conference room so users can search for it.

1. Find **`POST /api/v1/floor-plans/{floor_plan_id}/pois/`**
2. Click **"Try it out"**
3. Paste your floor plan ID
4. Create POI:

```json
{
  "node_id": "<node-4-id>",
  "name": "Conference Room A",
  "description": "Main conference room, seats 12 people",
  "category": "office",
  "x": 500,
  "y": 300,
  "icon": "meeting",
  "searchable": true,
  "metadata": {
    "capacity": "12",
    "equipment": "projector, whiteboard"
  }
}
```

---

## Step 6: Calculate a Route!

Now let's test the pathfinding.

1. Find **`POST /api/v1/routes/calculate`**
2. Click **"Try it out"**
3. Enter:

```json
{
  "floor_plan_id": "<your-floor-plan-id>",
  "start_node_id": "<node-1-id>",
  "end_node_id": "<node-4-id>",
  "preferences": {
    "accessible_only": true,
    "avoid_stairs": false
  }
}
```

4. Click **"Execute"**

You should get a route response with:
- **Path**: Array of node IDs showing the route
- **Coordinates**: (x, y) points for drawing on map
- **Instructions**: Turn-by-turn directions
- **Total distance**: Length of the route

Example response:
```json
{
  "success": true,
  "route": {
    "path": ["node-1-id", "node-2-id", "node-3-id", "node-4-id"],
    "total_distance": 424.26,
    "coordinates": [
      {"x": 100, "y": 100},
      {"x": 300, "y": 100},
      {"x": 300, "y": 300},
      {"x": 500, "y": 300}
    ]
  }
}
```

---

## Step 7: Create a QR Code

QR codes let users scan and start navigation from a specific location.

1. Find **`POST /api/v1/qr-anchors/`**
2. Click **"Try it out"**
3. Create QR anchor at the entrance:

```json
{
  "floor_plan_id": "<your-floor-plan-id>",
  "node_id": "<node-1-id>",
  "code": "OFFICE-ENTRANCE-01",
  "x": 100,
  "y": 100,
  "placement_notes": "On wall next to main entrance door",
  "active": true
}
```

4. Click **"Execute"**
5. The response will include `qr_data` - a URL that you can encode into a QR code

---

## 🎉 Congratulations!

You've created your first indoor navigation system with NavIO! You have:

✅ A floor plan
✅ Navigation nodes (waypoints)
✅ Connected edges (walkable paths)
✅ Points of interest (searchable locations)
✅ A calculated route using A* pathfinding
✅ A QR code anchor for user localization

---

## Next Steps

### 1. Upload a Real Floor Plan Image

Currently, we don't have an actual floor plan image. To add one:

```bash
# Upload using curl or Postman
curl -X POST "http://localhost:8000/api/v1/floor-plans/upload" \
  -F "file=@/path/to/your/floorplan.png"
```

### 2. Use the Frontend

Open http://localhost:3000 and explore the React interface (if implemented).

### 3. Customize the System

- Modify the backend: `backend/app/`
- Modify the frontend: `frontend/src/`
- Add new API endpoints
- Customize the UI

### 4. Read the Documentation

- **Implementation Guide**: How everything works
- **Architecture**: System design
- **Coordinate System**: Understanding pixel vs Leaflet coordinates
- **Data Schema**: All API endpoints and data structures

---

## Troubleshooting

### "Port already in use"

Something else is using port 3000 or 8000.

**Solution:**
```bash
# Stop NavIO
docker-compose down

# Find what's using the port
# Mac/Linux:
lsof -i :3000
# Windows:
netstat -ano | findstr :3000

# Kill that process or change ports in docker-compose.yml
```

### "Cannot connect to database"

**Solution:**
```bash
# Restart all services
docker-compose restart

# Or start fresh
docker-compose down -v
docker-compose up -d
```

### "Docker is not running"

**Solution:**
- Open Docker Desktop application
- Wait for it to fully start
- Look for green "Docker is running" in the menu bar/tray

### API returns 500 errors

**Solution:**
```bash
# Check the logs
docker-compose logs backend

# Look for Python error messages
```

---

## Useful Commands

```bash
# View all logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# Restart a service
docker-compose restart backend

# Stop everything
docker-compose down

# Start fresh (deletes all data!)
docker-compose down -v
docker-compose up -d
```

---

## Getting Help

- Check the logs: `docker-compose logs -f`
- Read the docs in the `docs/` folder
- Check the API documentation: http://localhost:8000/docs

---

## Summary

| Action | URL |
|--------|-----|
| View frontend | http://localhost:3000 |
| Test APIs | http://localhost:8000/docs |
| Read API docs | http://localhost:8000/redoc |

**You're all set! Happy building! 🚀**
