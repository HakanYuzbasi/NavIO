# NavIO Troubleshooting Guide

This guide will help you diagnose and fix common issues with the NavIO setup.

## Quick Fix

If you're experiencing issues, start with the quick fix script:

```bash
./quick-fix.sh
```

This script will automatically:
- Check if Docker is running
- Verify all containers are up
- Test the backend API
- Check CORS configuration
- Run comprehensive diagnostics
- Reseed the database if needed

## Common Issues and Solutions

### Issue 1: "Failed to load floor plans" in Frontend

**Symptoms:**
- Frontend loads at http://localhost:3000
- Error message: "Failed to load floor plans"

**Causes and Solutions:**

#### A. Backend is not running

```bash
# Check container status
docker-compose ps

# If backend is not running, start it
docker-compose up -d backend

# Wait for it to be ready
sleep 5

# Check if it's responding
curl http://localhost:8000/health
```

**Expected output:**
```json
{"status":"healthy","service":"NavIO API"}
```

#### B. Database is empty (not seeded)

```bash
# Check if database has data
docker-compose exec backend python -c "
from app.core.database import SessionLocal
from app.models import FloorPlan
db = SessionLocal()
count = db.query(FloorPlan).count()
print(f'Floor plans in database: {count}')
db.close()
"

# If count is 0, seed the database
docker-compose exec backend python seed_dynamic_demo.py
```

#### C. CORS headers missing

```bash
# Test CORS headers
curl -I -H "Origin: http://localhost:3000" http://localhost:8000/api/v1/floor-plans

# Should see this header:
# access-control-allow-origin: http://localhost:3000

# If missing, restart backend
docker-compose restart backend
```

#### D. Backend crashed after startup

```bash
# Check backend logs for errors
docker-compose logs backend --tail=50

# Common errors:
# - Database connection failed: Check if db container is running
# - Import errors: Check Python dependencies
# - Port already in use: Stop other services on port 8000

# Restart backend
docker-compose restart backend
```

### Issue 2: Containers Keep Stopping

**Check logs to identify why:**

```bash
# All containers
docker-compose logs

# Specific container
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db
```

**Common causes:**
- **Database**: Port 5432 already in use by another PostgreSQL instance
- **Backend**: Python syntax error or missing dependency
- **Frontend**: Node modules not installed or build error

**Solutions:**

```bash
# Stop all containers and start fresh
docker-compose down
docker-compose up -d

# Rebuild if needed (only if code changed)
docker-compose up -d --build

# Watch logs in real-time
docker-compose logs -f
```

### Issue 3: Frontend Shows Blank Page

**Check browser console:**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors

**Common errors:**

#### "NetworkError when attempting to fetch resource"
- Backend is not running
- CORS headers missing
- Wrong API URL

**Solution:**
```bash
# Verify backend is accessible
curl http://localhost:8000/api/v1/floor-plans

# Check frontend environment
docker-compose exec frontend cat /app/.env
# Should show: REACT_APP_API_URL=http://localhost:8000/api/v1
```

#### "Failed to load floor plans"
- See Issue 1 above

### Issue 4: Can't Connect to Backend API

**Test connectivity:**

```bash
# 1. Test from host machine
curl http://localhost:8000/health

# 2. Test from within backend container
docker-compose exec backend curl http://localhost:8000/health

# 3. Test from within frontend container
docker-compose exec frontend curl http://backend:8000/health
```

**If host can't connect but containers can:**
- Port mapping issue in docker-compose.yml
- Firewall blocking port 8000

**If containers can't connect to each other:**
- Docker network issue
- Recreate network:

```bash
docker-compose down
docker-compose up -d
```

### Issue 5: Database Connection Errors

**Symptoms:**
- Backend logs show: "could not connect to server"
- API returns 500 errors

**Solutions:**

```bash
# 1. Check if database is running
docker-compose ps db

# 2. Check if database is healthy
docker-compose exec db psql -U navio_user -d navio_db -c "SELECT 1;"

# 3. Restart database
docker-compose restart db

# Wait for it to be ready
sleep 5

# 4. Restart backend
docker-compose restart backend
```

### Issue 6: "No floor plans available"

**Even though database was seeded:**

```bash
# 1. Verify data is in database
docker-compose exec backend python test_api.py

# 2. Check API directly
curl http://localhost:8000/api/v1/floor-plans

# 3. If API returns empty array []
# Reseed the database
docker-compose exec backend python seed_dynamic_demo.py
```

## Diagnostic Commands

### Check Everything at Once

```bash
./quick-fix.sh
```

### Manual Diagnostics

```bash
# 1. Docker status
docker-compose ps

# 2. Backend health
curl http://localhost:8000/health

# 3. API endpoint
curl http://localhost:8000/api/v1/floor-plans | jq .

# 4. Database query
docker-compose exec backend python -c "
from app.core.database import SessionLocal
from app.models import FloorPlan, Node, POI
db = SessionLocal()
print(f'Floor Plans: {db.query(FloorPlan).count()}')
print(f'Nodes: {db.query(Node).count()}')
print(f'POIs: {db.query(POI).count()}')
db.close()
"

# 5. Run comprehensive test
docker-compose exec backend python test_api.py
```

## Complete Reset

If nothing else works, perform a complete reset:

```bash
# 1. Stop all containers
docker-compose down

# 2. Remove volumes (WARNING: This deletes all data!)
docker-compose down -v

# 3. Rebuild images
docker-compose build --no-cache

# 4. Start fresh
docker-compose up -d

# 5. Wait for services to be ready
sleep 15

# 6. Seed database
docker-compose exec backend python seed_dynamic_demo.py

# 7. Verify
./quick-fix.sh
```

## Verifying Success

When everything is working correctly, you should see:

```bash
# 1. All containers running
$ docker-compose ps
NAME              COMMAND                 STATUS
navio_backend     "uvicorn app.main:..."  Up
navio_frontend    "docker-entrypoint..."  Up
navio_db          "docker-entrypoint..."  Up (healthy)

# 2. Backend responding
$ curl http://localhost:8000/health
{"status":"healthy","service":"NavIO API"}

# 3. API returning data
$ curl http://localhost:8000/api/v1/floor-plans
[{"id":"...","name":"Food Hall - Main Floor",...}]

# 4. Frontend accessible
$ curl -I http://localhost:3000
HTTP/1.1 200 OK

# 5. Browser shows floor plan selector with options
```

## Still Having Issues?

1. **Check logs:**
   ```bash
   docker-compose logs backend --tail=100
   docker-compose logs frontend --tail=100
   docker-compose logs db --tail=100
   ```

2. **Verify Docker resources:**
   - Ensure Docker has enough memory (at least 4GB)
   - Ensure Docker has disk space

3. **Check system requirements:**
   - Docker Desktop 4.0+ installed
   - At least 4GB RAM available
   - Ports 3000, 8000, 5432 not in use

4. **Platform-specific issues:**

   **Windows:**
   - WSL2 must be enabled for Docker Desktop
   - Use PowerShell or Git Bash to run scripts
   - Line ending issues: run `dos2unix *.sh` if available

   **Mac:**
   - Docker Desktop must be running
   - Grant necessary permissions when prompted

   **Linux:**
   - Ensure Docker daemon is running: `sudo systemctl status docker`
   - User must be in docker group: `sudo usermod -aG docker $USER`

## Getting Help

If you're still stuck:

1. Run the diagnostic script and save output:
   ```bash
   ./quick-fix.sh > diagnostic_output.txt 2>&1
   ```

2. Collect logs:
   ```bash
   docker-compose logs > all_logs.txt 2>&1
   ```

3. Check the following:
   - Operating system and version
   - Docker version: `docker --version`
   - Docker Compose version: `docker-compose --version`
   - Available memory: `free -h` (Linux/Mac) or Task Manager (Windows)
