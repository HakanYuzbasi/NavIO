#!/bin/bash
# Quick fix script for OpenCV installation

echo "🔧 Fixing OpenCV installation..."
echo ""

# Uninstall the regular opencv-python
echo "1. Removing opencv-python (with GUI dependencies)..."
docker exec navio_backend pip uninstall -y opencv-python

# Install the headless version
echo ""
echo "2. Installing opencv-python-headless (no GUI needed)..."
docker exec navio_backend pip install opencv-python-headless==4.8.1.78

# Verify installation
echo ""
echo "3. Verifying OpenCV installation..."
docker exec navio_backend python -c "import cv2; print('✅ OpenCV version:', cv2.__version__)"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! OpenCV is now working."
    echo ""
    echo "Now test automatic booth detection:"
    echo ""
    echo "FLOOR_PLAN_ID=\$(curl -s http://localhost:8000/api/v1/floor-plans | jq -r '.[0].id')"
    echo "curl -X POST \"http://localhost:8000/api/v1/floor-plans/\$FLOOR_PLAN_ID/detect-booths?method=smart&auto_create=true\""
else
    echo ""
    echo "❌ There was an error. Please rebuild the backend:"
    echo "docker-compose down"
    echo "docker-compose up -d --build backend"
fi
