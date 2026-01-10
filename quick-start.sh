#!/bin/bash

# NavIO Quick Start Script
# This script will set up and run NavIO on your local machine

set -e  # Exit on error

echo "🚀 NavIO - Quick Start Setup"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
echo "📦 Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose or use Docker Desktop which includes it"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed${NC}"
echo -e "${GREEN}✅ Docker Compose is installed${NC}"
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Check if .env file exists, if not create from example
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✅ Created backend/.env${NC}"
else
    echo -e "${YELLOW}⚠️  backend/.env already exists, skipping${NC}"
fi
echo ""

# Stop any existing containers
echo "🛑 Stopping any existing NavIO containers..."
docker-compose down &> /dev/null || true
echo -e "${GREEN}✅ Cleaned up existing containers${NC}"
echo ""

# Build and start containers
echo "🏗️  Building and starting containers..."
echo "This may take a few minutes on first run..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ All services are running!${NC}"
else
    echo -e "${RED}❌ Some services failed to start${NC}"
    echo "Run 'docker-compose logs' to see what went wrong"
    exit 1
fi

echo ""
echo "================================"
echo -e "${GREEN}🎉 NavIO is now running!${NC}"
echo "================================"
echo ""
echo "📍 Access the application:"
echo ""
echo "   Frontend (User Interface):"
echo "   👉 http://localhost:3000"
echo ""
echo "   Backend API Documentation:"
echo "   👉 http://localhost:8000/docs"
echo ""
echo "   Alternative API Docs:"
echo "   👉 http://localhost:8000/redoc"
echo ""
echo "================================"
echo ""
echo "📋 Useful commands:"
echo ""
echo "   View logs:           docker-compose logs -f"
echo "   Stop services:       docker-compose down"
echo "   Restart services:    docker-compose restart"
echo "   View status:         docker-compose ps"
echo ""
echo "📚 Documentation available in the docs/ folder"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
