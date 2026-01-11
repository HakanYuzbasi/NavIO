@echo off
REM NavIO Food Hall Demo Setup Script (Windows)
REM This script sets up the complete MVP demo

echo.
echo ======================================
echo    NavIO Food Hall MVP Demo
echo ======================================
echo.

REM Check if Docker is running
echo Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

REM Check if containers are running
echo Checking if NavIO is running...
docker-compose ps | find "Up" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] NavIO containers not running
    echo.
    echo Starting NavIO containers...
    docker-compose up -d

    echo.
    echo Waiting for services to be ready...
    timeout /t 10 /nobreak >nul
)
echo [OK] NavIO is running
echo.

REM Seed the database
echo Setting up Food Hall demo data (dynamic multi-floor)...
echo.
docker-compose exec -T backend python seed_dynamic_demo.py

echo.
echo ======================================
echo     Demo Setup Complete!
echo ======================================
echo.
echo Access Points:
echo.
echo    Frontend (User Interface):
echo    http://localhost:3000
echo.
echo    Backend API Docs:
echo    http://localhost:8000/docs
echo.
echo ======================================
echo.
echo Demo Features:
echo.
echo    * Food Hall with 31 vendor booths
echo    * 11 navigation nodes (intersections)
echo    * 13 walkable paths (corridors)
echo    * 5 QR code anchors for positioning
echo    * A* pathfinding algorithm
echo.
echo ======================================
echo.
echo Next Steps:
echo.
echo    1. Open http://localhost:3000 in your browser
echo    2. Select a start location (e.g., Main Entrance)
echo    3. Choose a destination (e.g., Booth 4: Ramen)
echo    4. Click 'Calculate Route'
echo    5. See the navigation path on the map!
echo.
echo    Full guide: MVP_DEMO_GUIDE.md
echo.
echo ======================================
echo.
echo Value Proposition:
echo    "Help visitors find booths in seconds"
echo.
echo ======================================
echo.
echo Happy navigating!
echo.
pause
