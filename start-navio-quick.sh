#!/bin/bash

# NavIO Quick Start Script
# Starts both backend and frontend servers
# Updated version with better error handling and logging

echo "🚀 Starting NavIO..."
echo ""

# Kill any existing processes on ports 8001 and 3001
echo "🧹 Cleaning up existing processes..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1

# Add Node.js to PATH
if [ -d "/opt/node22/bin" ]; then
    export PATH="/opt/node22/bin:$PATH"
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found in PATH"
    echo "Please ensure Node.js is installed"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"
echo ""

# Start backend
echo "📡 Starting backend server..."
cd backend-node

# Check if directory exists
if [ ! -d "." ]; then
    echo "❌ backend-node directory not found"
    echo "   If you want to use FastAPI backend, run: ./start-navio.sh"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
    echo "✓ Dependencies installed"
fi

# Setup .env if needed
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ Created backend .env file"
    else
        echo "⚠️  No .env.example found"
    fi
fi

# Start backend server with PORT environment variable
PORT=8001 npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "✓ Backend started (PID: $BACKEND_PID)"
echo "   Running on http://localhost:8001"
echo "   Logs: backend.log"
echo ""

# Wait for backend to start
echo "Waiting for backend to be ready..."
sleep 3

# Check if backend is responding
for i in {1..10}; do
    if curl -s http://localhost:8001/health > /dev/null 2>&1 || \
       curl -s http://localhost:8001/api/venues > /dev/null 2>&1; then
        echo "✓ Backend is responding"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "⚠️  Backend may not be ready yet - check backend.log for errors"
    else
        sleep 1
    fi
done
echo ""

# Start frontend
echo "🌐 Starting frontend server..."
cd ../frontend-next

# Check if directory exists
if [ ! -d "." ]; then
    echo "❌ frontend-next directory not found"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
    echo "✓ Dependencies installed"
fi

# Setup .env if needed and ensure correct API URL
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ Created frontend .env file"
    fi
fi

# Always ensure API URL points to port 8001
if grep -q "NEXT_PUBLIC_API_URL" .env 2>/dev/null; then
    sed -i.bak 's|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://localhost:8001|' .env
    echo "✓ Updated API URL to port 8001"
else
    echo "NEXT_PUBLIC_API_URL=http://localhost:8001" >> .env
    echo "✓ Set API URL to port 8001"
fi

# Start frontend server on port 3001
PORT=3001 npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✓ Frontend started (PID: $FRONTEND_PID)"
echo "   Running on http://localhost:3001"
echo "   Logs: frontend.log"
echo ""

# Wait for frontend to start
sleep 3

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ NavIO is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Frontend:  http://localhost:3001"
echo "📍 Backend:   http://localhost:8001"
echo ""
echo "💡 Both APEX and NavIO can now run simultaneously!"
echo "   APEX: Backend 8000, Frontend 3000"
echo "   NavIO: Backend 8001, Frontend 3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping NavIO servers..."
    
    # Kill backend
    if kill $BACKEND_PID 2>/dev/null; then
        echo "✓ Backend stopped"
    fi
    
    # Kill frontend
    if kill $FRONTEND_PID 2>/dev/null; then
        echo "✓ Frontend stopped"
    fi
    
    echo "✓ NavIO servers stopped"
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Keep script running
wait
