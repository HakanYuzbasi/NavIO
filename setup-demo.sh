#!/bin/bash

# NavIO Food Hall Demo Setup Script
# This script sets up the complete MVP demo

set -e

echo ""
echo "======================================"
echo "  🍽️  NavIO Food Hall MVP Demo"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
echo "📦 Checking Docker..."
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Check if containers are running
echo "🔍 Checking if NavIO is running..."
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  NavIO containers not running${NC}"
    echo ""
    echo "Starting NavIO containers..."
    docker-compose up -d

    echo ""
    echo "⏳ Waiting for services to be ready..."
    sleep 10
fi
echo -e "${GREEN}✅ NavIO is running${NC}"
echo ""

# Check if database has been seeded
echo "🌱 Setting up Food Hall demo data (dynamic multi-floor)..."
echo ""
docker-compose exec -T backend python seed_dynamic_demo.py

echo ""
echo "======================================"
echo -e "${GREEN}🎉 Demo Setup Complete!${NC}"
echo "======================================"
echo ""
echo "📍 Access Points:"
echo ""
echo -e "   ${BLUE}Frontend (User Interface):${NC}"
echo "   👉 http://localhost:3000"
echo ""
echo -e "   ${BLUE}Backend API Docs:${NC}"
echo "   👉 http://localhost:8000/docs"
echo ""
echo "======================================"
echo ""
echo "🎯 Demo Features:"
echo ""
echo "   ✅ Food Hall with 31 vendor booths"
echo "   ✅ 11 navigation nodes (intersections)"
echo "   ✅ 13 walkable paths (corridors)"
echo "   ✅ 5 QR code anchors for positioning"
echo "   ✅ A* pathfinding algorithm"
echo ""
echo "======================================"
echo ""
echo "📚 Next Steps:"
echo ""
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Select a start location (e.g., Main Entrance)"
echo "   3. Choose a destination (e.g., Booth 4: Ramen)"
echo "   4. Click 'Calculate Route'"
echo "   5. See the navigation path on the map!"
echo ""
echo "   📖 Full guide: MVP_DEMO_GUIDE.md"
echo ""
echo "======================================"
echo ""
echo -e "${GREEN}Value Proposition:${NC}"
echo -e "   ${BLUE}\"Help visitors find booths in seconds\"${NC}"
echo ""
echo "======================================"
echo ""
echo -e "${GREEN}Happy navigating! 🚀${NC}"
echo ""
