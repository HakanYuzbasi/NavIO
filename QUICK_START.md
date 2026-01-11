# NavIO Quick Start Guide

## Current Status

You successfully seeded the database with 3 floor plans, but the frontend is showing "Failed to load floor plans". This usually means the Docker containers have stopped or the backend API is not responding.

## Immediate Fix

Run this single command to diagnose and fix all issues:

```bash
chmod +x quick-fix.sh
./quick-fix.sh
```

This script will automatically:
- ✅ Check if Docker is running
- ✅ Restart containers if needed
- ✅ Test backend connectivity
- ✅ Verify database has data
- ✅ Check CORS configuration
- ✅ Run comprehensive diagnostics
- ✅ Show you exactly what's working and what's not

## Manual Steps (if needed)

If you prefer to fix issues manually:

### Step 1: Check Docker Containers

```bash
# Check if containers are running
docker-compose ps

# Expected output:
# NAME              STATUS
# navio_backend     Up
# navio_frontend    Up
# navio_db          Up (healthy)
```

If containers are not running:

```bash
# Start them
docker-compose up -d

# Wait 10 seconds for services to be ready
sleep 10
```

### Step 2: Verify Backend API

```bash
# Test health endpoint
curl http://localhost:8000/health

# Expected: {"status":"healthy","service":"NavIO API"}
```

If this fails, check backend logs:

```bash
docker-compose logs backend --tail=50
```

Common issues:
- Database connection error → Wait longer or restart: `docker-compose restart backend`
- Import errors → Rebuild: `docker-compose up -d --build backend`
- Port already in use → Stop other services on port 8000

### Step 3: Test Floor Plans API

```bash
# Get floor plans from API
curl http://localhost:8000/api/v1/floor-plans

# Should return JSON array with 3 floor plans
```

If this returns empty `[]`:

```bash
# Reseed the database
docker-compose exec backend python seed_dynamic_demo.py
```

### Step 4: Verify Frontend

```bash
# Check if frontend is accessible
curl -I http://localhost:3000

# Expected: HTTP/1.1 200 OK
```

If this fails:

```bash
# Check frontend logs
docker-compose logs frontend --tail=30

# Restart frontend
docker-compose restart frontend
```

### Step 5: Test CORS

```bash
# Test CORS headers are present
curl -I -H "Origin: http://localhost:3000" http://localhost:8000/api/v1/floor-plans

# Should see: access-control-allow-origin: http://localhost:3000
```

If CORS headers are missing:

```bash
docker-compose restart backend
```

## Accessing the Application

Once all checks pass:

1. **Open Frontend:**
   ```
   http://localhost:3000
   ```

2. **View API Documentation:**
   ```
   http://localhost:8000/docs
   ```

3. **Test API Directly:**
   ```
   http://localhost:8000/api/v1/floor-plans
   ```

## What You Should See

### In the Frontend (http://localhost:3000)

✅ **Success indicators:**
- "NavIO - Indoor Wayfinding" header
- Floor plan dropdown with 3 options:
  - Food Hall - Main Floor
  - Food Hall - Level 2
  - Food Hall - Event Space
- Start location dropdown with POIs
- End location dropdown with POIs
- "Calculate Route" button
- Map displaying the selected floor plan

❌ **Error indicators:**
- "Failed to load floor plans" message
- Empty dropdown menus
- Blank map area

### In the API Docs (http://localhost:8000/docs)

You should see endpoints organized in sections:
- **Floor Plans** - GET, POST, PATCH, DELETE
- **Nodes** - CRUD operations
- **Edges** - CRUD operations
- **POIs** - CRUD operations
- **QR Anchors** - CRUD operations
- **Navigation** - Calculate routes, scan QR codes

## Testing the Navigation

1. Select "Food Hall - Main Floor" from dropdown
2. For start location, choose any POI (e.g., "Main Entrance")
3. For end location, choose another POI (e.g., "Ramen House")
4. Click "Calculate Route"
5. You should see:
   - A path drawn on the map
   - Turn-by-turn instructions
   - Total distance and estimated time

## Troubleshooting

### "Failed to load floor plans"

**Cause:** Frontend can't connect to backend API

**Fix:**
```bash
# 1. Check if backend is running
curl http://localhost:8000/health

# 2. If not responding, check logs
docker-compose logs backend

# 3. Restart backend
docker-compose restart backend

# 4. Wait and test again
sleep 5
curl http://localhost:8000/api/v1/floor-plans
```

### Empty floor plan dropdown

**Cause:** Database has no floor plans

**Fix:**
```bash
# Seed the database
docker-compose exec backend python seed_dynamic_demo.py
```

### "CORS error" in browser console

**Cause:** Backend CORS headers not configured

**Fix:**
```bash
# Restart backend to reload config
docker-compose restart backend
```

### Map not displaying

**Cause:** Image files not accessible

**Fix:**
```bash
# Check images exist
ls -la backend/public/demo/

# Should show:
# food-hall-floorplan.png
# food-hall-floorplan_2.png
# food-hall-floorplan_3.png

# Restart backend to mount static files
docker-compose restart backend
```

## Complete Reset (Last Resort)

If nothing works:

```bash
# WARNING: This deletes all data!

# 1. Stop and remove containers
docker-compose down

# 2. Remove volumes (database data)
docker-compose down -v

# 3. Rebuild everything
docker-compose build --no-cache

# 4. Start fresh
docker-compose up -d

# 5. Wait for services
sleep 15

# 6. Seed database
docker-compose exec backend python seed_dynamic_demo.py

# 7. Test
./quick-fix.sh
```

## Need More Help?

### Check Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Follow logs in real-time
docker-compose logs -f
```

### Run Diagnostics

```bash
# Comprehensive test suite
docker-compose exec backend python test_api.py
```

### Verify Database

```bash
# Check database contents
docker-compose exec backend python -c "
from app.core.database import SessionLocal
from app.models import FloorPlan, Node, POI
db = SessionLocal()
print('Floor Plans:', db.query(FloorPlan).count())
print('Nodes:', db.query(Node).count())
print('POIs:', db.query(POI).count())
db.close()
"
```

## Architecture Overview

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│                 │       │                 │       │                 │
│    Frontend     │◄─────►│    Backend      │◄─────►│   PostgreSQL    │
│  (React + TS)   │       │  (FastAPI)      │       │   Database      │
│  Port: 3000     │       │  Port: 8000     │       │  Port: 5432     │
│                 │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
         │                        │
         │                        │
         ▼                        ▼
    User Browser            API Endpoints
    - Floor plan           - /floor-plans
      selection            - /nodes
    - POI selection        - /edges
    - Route display        - /pois
    - QR scanning          - /routes/calculate
```

## Key Files

- `docker-compose.yml` - Container orchestration
- `quick-fix.sh` - Diagnostic and fix script
- `backend/seed_dynamic_demo.py` - Database seeding
- `backend/test_api.py` - API testing
- `TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `MVP_DEMO_GUIDE.md` - Demo walkthrough

## Next Steps After Fix

Once everything is working:

1. **Explore the demo:**
   - Try different floor plans
   - Calculate routes between various locations
   - Check the map visualization

2. **Test QR code functionality:**
   - View QR anchors in the API docs
   - Test the `/api/v1/qr/scan` endpoint

3. **Customize:**
   - Add more floor plans
   - Create custom POIs
   - Adjust navigation graph

4. **Deploy to production:**
   - Set up proper domain
   - Configure SSL/HTTPS
   - Use managed database
   - Set environment variables

## Support

If you're still experiencing issues after following this guide:

1. Run `./quick-fix.sh > diagnostic.txt 2>&1`
2. Run `docker-compose logs > logs.txt 2>&1`
3. Review `TROUBLESHOOTING.md` for detailed solutions
4. Check `diagnostic.txt` and `logs.txt` for specific errors

---

**Remember:** The most common issue is containers not running. Always start by checking `docker-compose ps`!
