#!/bin/bash

# NaviO Quick Start Script
# Starts both backend and frontend servers

echo "🚀 Starting NaviO..."
echo ""

# Add Node.js to PATH
export PATH="/opt/node22/bin:$PATH"

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

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created backend .env file"
fi

npm run dev &
BACKEND_PID=$!
echo "✓ Backend started (PID: $BACKEND_PID)"
echo "   Running on http://localhost:8000"
echo ""

# Wait for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend server..."
cd ../frontend-next

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created frontend .env file"
fi

npm run dev &
FRONTEND_PID=$!
echo "✓ Frontend started (PID: $FRONTEND_PID)"
echo "   Running on http://localhost:3000"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ NaviO is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Frontend:  http://localhost:3000"
echo "📍 Backend:   http://localhost:8000"
echo "📍 API Docs:  http://localhost:8000 (see endpoints)"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for user interrupt
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '✓ Servers stopped'; exit 0" INT

# Keep script running
wait
