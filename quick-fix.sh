#!/bin/bash

# NavIO Quick Fix Script
# This script diagnoses and fixes common issues with the NavIO setup

set -e

echo ""
echo "================================================="
echo "  🔧 NavIO Quick Fix & Diagnostic Tool"
echo "================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check Docker
check_docker() {
    echo "1️⃣  Checking Docker..."
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        echo "   Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running${NC}"
        echo "   Please start Docker Desktop and try again"
        exit 1
    fi

    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Function to check container status
check_containers() {
    echo ""
    echo "2️⃣  Checking Docker containers..."

    # Check if docker-compose or docker compose is available
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi

    echo "   Using command: $COMPOSE_CMD"

    # Get container status
    BACKEND_STATUS=$($COMPOSE_CMD ps backend 2>&1 | grep -c "Up" || echo "0")
    FRONTEND_STATUS=$($COMPOSE_CMD ps frontend 2>&1 | grep -c "Up" || echo "0")
    DB_STATUS=$($COMPOSE_CMD ps db 2>&1 | grep -c "Up" || echo "0")

    if [ "$BACKEND_STATUS" -eq "0" ] || [ "$FRONTEND_STATUS" -eq "0" ] || [ "$DB_STATUS" -eq "0" ]; then
        echo -e "${YELLOW}⚠️  Some containers are not running${NC}"
        echo ""
        echo "   Current status:"
        $COMPOSE_CMD ps
        echo ""
        echo "   Restarting all containers..."
        $COMPOSE_CMD down
        $COMPOSE_CMD up -d
        echo ""
        echo "   ⏳ Waiting for services to be ready (15 seconds)..."
        sleep 15
    else
        echo -e "${GREEN}✅ All containers are running${NC}"
    fi
}

# Function to check backend health
check_backend() {
    echo ""
    echo "3️⃣  Checking backend API..."

    # Try to connect to backend health endpoint
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend API is responding${NC}"

        # Check floor plans endpoint
        FLOOR_PLAN_COUNT=$(curl -s http://localhost:8000/api/v1/floor-plans | grep -o '"id"' | wc -l)

        if [ "$FLOOR_PLAN_COUNT" -gt "0" ]; then
            echo -e "${GREEN}✅ Floor plans API: $FLOOR_PLAN_COUNT floor plans found${NC}"
        else
            echo -e "${YELLOW}⚠️  No floor plans found in database${NC}"
            echo "   Seeding database..."
            if command -v docker-compose &> /dev/null; then
                docker-compose exec -T backend python seed_dynamic_demo.py
            else
                docker compose exec -T backend python seed_dynamic_demo.py
            fi
        fi
    else
        echo -e "${RED}❌ Backend API is not responding${NC}"
        echo "   Checking backend logs..."
        echo ""

        if command -v docker-compose &> /dev/null; then
            docker-compose logs --tail=50 backend
        else
            docker compose logs --tail=50 backend
        fi

        echo ""
        echo "   Attempting to restart backend..."

        if command -v docker-compose &> /dev/null; then
            docker-compose restart backend
        else
            docker compose restart backend
        fi

        sleep 5
    fi
}

# Function to check frontend
check_frontend() {
    echo ""
    echo "4️⃣  Checking frontend..."

    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is responding${NC}"
    else
        echo -e "${RED}❌ Frontend is not responding${NC}"
        echo "   Checking frontend logs..."

        if command -v docker-compose &> /dev/null; then
            docker-compose logs --tail=30 frontend
        else
            docker compose logs --tail=30 frontend
        fi
    fi
}

# Function to run diagnostic tests
run_diagnostics() {
    echo ""
    echo "5️⃣  Running comprehensive diagnostics..."
    echo ""

    if command -v docker-compose &> /dev/null; then
        docker-compose exec backend python test_api.py
    else
        docker compose exec backend python test_api.py
    fi
}

# Function to check CORS
check_cors() {
    echo ""
    echo "6️⃣  Testing CORS configuration..."

    CORS_HEADER=$(curl -s -H "Origin: http://localhost:3000" -I http://localhost:8000/api/v1/floor-plans 2>&1 | grep -i "access-control-allow-origin" || echo "")

    if [ -n "$CORS_HEADER" ]; then
        echo -e "${GREEN}✅ CORS headers are present${NC}"
        echo "   $CORS_HEADER"
    else
        echo -e "${RED}❌ CORS headers are missing${NC}"
        echo "   This will cause the frontend to fail!"
        echo "   Restarting backend to reload configuration..."

        if command -v docker-compose &> /dev/null; then
            docker-compose restart backend
        else
            docker compose restart backend
        fi

        sleep 5
    fi
}

# Function to show final status
show_status() {
    echo ""
    echo "================================================="
    echo "  📊 Final Status"
    echo "================================================="
    echo ""

    # Test all endpoints
    BACKEND_OK=$(curl -s http://localhost:8000/health > /dev/null 2>&1 && echo "1" || echo "0")
    FRONTEND_OK=$(curl -s http://localhost:3000 > /dev/null 2>&1 && echo "1" || echo "0")
    API_OK=$(curl -s http://localhost:8000/api/v1/floor-plans | grep -q '"id"' && echo "1" || echo "0")

    if [ "$BACKEND_OK" -eq "1" ]; then
        echo -e "${GREEN}✅ Backend:${NC}  http://localhost:8000"
    else
        echo -e "${RED}❌ Backend:${NC}  Not responding"
    fi

    if [ "$API_OK" -eq "1" ]; then
        echo -e "${GREEN}✅ API:${NC}      http://localhost:8000/api/v1/floor-plans"
    else
        echo -e "${RED}❌ API:${NC}      Not working"
    fi

    if [ "$FRONTEND_OK" -eq "1" ]; then
        echo -e "${GREEN}✅ Frontend:${NC} http://localhost:3000"
    else
        echo -e "${RED}❌ Frontend:${NC} Not responding"
    fi

    echo ""
    echo "================================================="

    if [ "$BACKEND_OK" -eq "1" ] && [ "$FRONTEND_OK" -eq "1" ] && [ "$API_OK" -eq "1" ]; then
        echo -e "${GREEN}🎉 Success! NavIO is ready to use!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Open http://localhost:3000 in your browser"
        echo "  2. Select a floor plan from the dropdown"
        echo "  3. Choose start and end locations"
        echo "  4. Click 'Calculate Route' to see the path!"
    else
        echo -e "${YELLOW}⚠️  Some issues detected${NC}"
        echo ""
        echo "Troubleshooting steps:"
        echo "  1. Check logs: docker-compose logs"
        echo "  2. Restart: docker-compose restart"
        echo "  3. Full reset: docker-compose down && docker-compose up -d"
        echo "  4. Run diagnostics: docker-compose exec backend python test_api.py"
    fi

    echo ""
    echo "================================================="
    echo ""
}

# Main execution
main() {
    check_docker
    check_containers
    check_backend
    check_frontend
    check_cors
    run_diagnostics
    show_status
}

main
