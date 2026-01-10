# NavIO - Local Deployment Guide

## 🚀 Complete Setup from Scratch

This guide will walk you through deploying NavIO on your local machine, even if you have nothing installed yet.

---

## 📋 Prerequisites

You need to install these tools first:

### 1. **Git** (for cloning the repository)

**Check if installed:**
```bash
git --version
```

**Install if needed:**
- **Windows**: Download from https://git-scm.com/download/win
- **Mac**: `brew install git` (or install Xcode Command Line Tools)
- **Linux**: `sudo apt-get install git` (Ubuntu/Debian) or `sudo yum install git` (CentOS/RHEL)

### 2. **Docker Desktop** (easiest option - installs Docker + Docker Compose)

**Check if installed:**
```bash
docker --version
docker-compose --version
```

**Install if needed:**
- **Windows/Mac**: Download Docker Desktop from https://www.docker.com/products/docker-desktop/
- **Linux**:
  ```bash
  # Install Docker
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh

  # Install Docker Compose
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  ```

**After installation:**
- Start Docker Desktop (Windows/Mac)
- Verify it's running: `docker ps`

---

## 📥 Step 1: Clone the Repository

Open your terminal/command prompt and run:

```bash
# Navigate to where you want to store the project
cd ~/Documents  # Or C:\Users\YourName\Documents on Windows

# Clone the repository
git clone http://127.0.0.1:20186/git/HakanYuzbasi/NavIO.git

# Enter the project directory
cd NavIO

# Switch to the correct branch
git checkout claude/find-fix-bug-mk8q0kzwa4qgeaju-dO0nZ
```

---

## 🐳 Step 2: Deploy with Docker (EASIEST METHOD)

This is the fastest way to get everything running!

### 2.1 Start All Services

```bash
# Make sure you're in the NavIO directory
cd NavIO

# Start all services (database, backend, frontend)
docker-compose up -d
```

**What this does:**
- ✅ Creates PostgreSQL database
- ✅ Runs database migrations
- ✅ Starts FastAPI backend on port 8000
- ✅ Starts React frontend on port 3000

### 2.2 Wait for Services to Start

```bash
# Check if containers are running
docker-compose ps

# You should see 3 containers:
# - navio-db (PostgreSQL)
# - navio-backend (FastAPI)
# - navio-frontend (React)
```

### 2.3 View Logs (if needed)

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 2.4 Access the Application

**Open your browser and go to:**

- **Frontend (User Interface)**: http://localhost:3000
- **Backend API Documentation**: http://localhost:8000/docs
- **Backend API (alternative docs)**: http://localhost:8000/redoc

### 2.5 Stop the Application

```bash
# Stop all services
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

---

## 💻 Step 3: Manual Setup (Alternative - without Docker)

If you prefer to run services manually or don't want to use Docker:

### Prerequisites for Manual Setup

You'll need:
1. **Python 3.11+** - https://www.python.org/downloads/
2. **Node.js 18+** - https://nodejs.org/
3. **PostgreSQL 15+** - https://www.postgresql.org/download/

### 3.1 Setup PostgreSQL

**Create database:**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE navio_db;
CREATE USER navio_user WITH PASSWORD 'navio_password';
GRANT ALL PRIVILEGES ON DATABASE navio_db TO navio_user;
\q
```

### 3.2 Setup Backend

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env file with your database credentials
# (use your favorite text editor)
nano .env  # or vim, or notepad on Windows

# Run database migrations
alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at**: http://localhost:8000

### 3.3 Setup Frontend

**Open a NEW terminal/command prompt** (keep backend running in the first one):

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

**Frontend will be available at**: http://localhost:3000

---

## 🧪 Step 4: Verify Installation

### 4.1 Check Backend API

Open http://localhost:8000/docs in your browser. You should see:
- Swagger UI with all API endpoints
- Sections: Floor Plans, Nodes, Edges, POIs, QR Anchors, Routes

Try the `/health` endpoint:
1. Click on "GET /health"
2. Click "Try it out"
3. Click "Execute"
4. You should see: `{"status": "healthy"}`

### 4.2 Check Frontend

Open http://localhost:3000 in your browser. You should see:
- NavIO welcome page
- Navigation menu
- (Empty state since no data yet)

### 4.3 Check Database Connection

```bash
# If using Docker:
docker-compose exec backend python -c "from app.core.database import engine; print('DB Connected!' if engine else 'Failed')"

# If manual setup:
# In your backend terminal (with venv activated):
python -c "from app.core.database import engine; print('DB Connected!' if engine else 'Failed')"
```

---

## 📱 Step 5: Create Your First Floor Plan

Now let's test the system by creating a floor plan!

### 5.1 Using the API (Swagger UI)

1. **Go to**: http://localhost:8000/docs

2. **Create a Floor Plan**:
   - Find `POST /api/v1/floor-plans/`
   - Click "Try it out"
   - Replace the JSON with:
   ```json
   {
     "name": "My Building - Floor 1",
     "description": "Test floor plan",
     "organization_id": "00000000-0000-0000-0000-000000000001"
   }
   ```
   - Click "Execute"
   - Copy the `id` from the response

3. **Create Nodes**:
   - Find `POST /api/v1/floor-plans/{floor_plan_id}/nodes/`
   - Click "Try it out"
   - Paste your floor plan ID
   - Create a few nodes:
   ```json
   {
     "x": 100,
     "y": 100,
     "node_type": "entrance",
     "name": "Main Entrance"
   }
   ```

4. **View All Floor Plans**:
   - Find `GET /api/v1/floor-plans/`
   - Click "Try it out"
   - Click "Execute"
   - You should see your floor plan!

---

## 🔧 Troubleshooting

### Problem: "Port already in use"

**Error**: `Bind for 0.0.0.0:3000 failed: port is already allocated`

**Solution**:
```bash
# Find what's using the port
# On Mac/Linux:
lsof -i :3000
# On Windows:
netstat -ano | findstr :3000

# Kill the process or change the port in docker-compose.yml
```

### Problem: "Cannot connect to database"

**Solution**:
```bash
# Check if PostgreSQL is running
docker-compose ps db

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Problem: Docker containers won't start

**Solution**:
```bash
# Remove all containers and start fresh
docker-compose down -v
docker-compose up -d

# Check Docker Desktop is running
docker ps
```

### Problem: Frontend shows "API connection error"

**Solution**:
1. Check backend is running: http://localhost:8000/docs
2. Check CORS settings in `backend/app/main.py`
3. Check browser console for errors (F12)

### Problem: "Module not found" errors

**Backend Solution**:
```bash
cd backend
pip install -r requirements.txt
```

**Frontend Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 🔄 Common Commands

### Docker Commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Restart a specific service
docker-compose restart backend

# View logs
docker-compose logs -f

# Access backend shell
docker-compose exec backend bash

# Access database
docker-compose exec db psql -U navio_user -d navio_db

# Rebuild containers (after code changes)
docker-compose up -d --build
```

### Database Commands

```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Rollback migration
docker-compose exec backend alembic downgrade -1

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"
```

### Development Commands

```bash
# Install new Python package
docker-compose exec backend pip install package-name

# Install new npm package
docker-compose exec frontend npm install package-name

# Run Python shell
docker-compose exec backend python
```

---

## 📊 Default Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 8000 | http://localhost:8000 |
| API Docs (Swagger) | 8000 | http://localhost:8000/docs |
| API Docs (ReDoc) | 8000 | http://localhost:8000/redoc |
| PostgreSQL | 5432 | localhost:5432 |

---

## 🎯 Next Steps

Now that NavIO is running:

1. **Read the documentation**:
   - `docs/IMPLEMENTATION_GUIDE.md` - Full implementation details
   - `docs/DATA_SCHEMA.md` - API schemas
   - `docs/COORDINATE_SYSTEM.md` - How coordinates work

2. **Upload a floor plan**:
   - Get a PNG/JPG of any floor plan
   - Use the API to upload it
   - Start adding navigation nodes

3. **Test navigation**:
   - Create nodes and edges
   - Use the calculate route endpoint
   - See the path on the map

4. **Customize**:
   - Modify the frontend UI
   - Add new API endpoints
   - Integrate with your systems

---

## 🆘 Getting Help

If you run into issues:

1. Check the logs: `docker-compose logs -f`
2. Verify all services are running: `docker-compose ps`
3. Check the documentation in the `docs/` folder
4. Look at the API docs: http://localhost:8000/docs

---

## 🎉 You're All Set!

NavIO is now running locally. Happy coding! 🚀
