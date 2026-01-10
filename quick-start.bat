@echo off
REM NavIO Quick Start Script for Windows
REM This script will set up and run NavIO on your local machine

echo.
echo ======================================
echo    NavIO - Quick Start Setup
echo ======================================
echo.

REM Check if Docker is installed
echo Checking prerequisites...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed
    echo Please install Docker Desktop which includes Docker Compose
    pause
    exit /b 1
)

echo [OK] Docker is installed
echo [OK] Docker Compose is installed
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Check if .env file exists
if not exist "backend\.env" (
    echo Creating backend .env file...
    copy "backend\.env.example" "backend\.env" >nul
    echo [OK] Created backend\.env
) else (
    echo [WARNING] backend\.env already exists, skipping
)
echo.

REM Stop any existing containers
echo Stopping any existing NavIO containers...
docker-compose down >nul 2>&1
echo [OK] Cleaned up existing containers
echo.

REM Build and start containers
echo Building and starting containers...
echo This may take a few minutes on first run...
docker-compose up -d --build

echo.
echo Waiting for services to be ready...
timeout /t 5 /nobreak >nul

REM Check if services are running
docker-compose ps | find "Up" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] All services are running!
) else (
    echo [ERROR] Some services failed to start
    echo Run 'docker-compose logs' to see what went wrong
    pause
    exit /b 1
)

echo.
echo ======================================
echo     NavIO is now running!
echo ======================================
echo.
echo Access the application:
echo.
echo    Frontend (User Interface):
echo    http://localhost:3000
echo.
echo    Backend API Documentation:
echo    http://localhost:8000/docs
echo.
echo    Alternative API Docs:
echo    http://localhost:8000/redoc
echo.
echo ======================================
echo.
echo Useful commands:
echo.
echo    View logs:           docker-compose logs -f
echo    Stop services:       docker-compose down
echo    Restart services:    docker-compose restart
echo    View status:         docker-compose ps
echo.
echo Documentation available in the docs\ folder
echo.
echo Happy coding!
echo.
pause
