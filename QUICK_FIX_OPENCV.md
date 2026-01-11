# Quick Fix for OpenCV Installation

## Problem
Docker cached the pip install step and didn't install opencv-python.

## Solution 1: Install in Running Container (FASTEST)

```bash
# Install OpenCV in the running backend container
docker exec navio_backend pip install opencv-python==4.8.1.78 numpy==1.24.3

# Verify installation
docker exec navio_backend python -c "import cv2; print('OpenCV version:', cv2.__version__)"

# Should output: OpenCV version: 4.8.1.78
```

Now try the detection again:

```bash
FLOOR_PLAN_ID=$(curl -s http://localhost:8000/api/v1/floor-plans | jq -r '.[0].id')
curl -X POST "http://localhost:8000/api/v1/floor-plans/$FLOOR_PLAN_ID/detect-booths?method=smart&auto_create=true"
```

## Solution 2: Force Complete Rebuild (if Solution 1 doesn't work)

```bash
# Stop and remove containers
docker-compose down

# Rebuild without cache
docker-compose build --no-cache backend

# Start everything
docker-compose up -d
```

## Verify Backend is Working

```bash
# Check backend logs
docker-compose logs backend | tail -20

# Test API is responding
curl http://localhost:8000/api/v1/floor-plans
```

## Why This Happened

Docker's build cache saw that `requirements.txt` hadn't changed (from its perspective) and reused the cached pip install layer. This is normally good for speed, but when adding new dependencies, we need to force a reinstall.

## After Installing

Once OpenCV is installed, run the detection command again and you should see:

```json
{
  "success": true,
  "floor_plan_id": "...",
  "booths_detected": 10-15,
  "booths_created": 10-15,
  "method": "smart",
  "message": "Successfully detected X booths using smart method"
}
```
