"""
NavIO - Indoor Wayfinding SaaS
FastAPI application entry point.

This module initializes the FastAPI application with proper logging,
middleware configuration, and health monitoring for production deployments.
"""
import logging
import sys
import os
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import check_database_health
from app.api.routes import router as api_router


def setup_logging() -> None:
    """Configure application-wide logging."""
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper()),
        format=settings.LOG_FORMAT,
        handlers=[
            logging.StreamHandler(sys.stdout),
        ]
    )
    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.DEBUG if settings.DEBUG else logging.WARNING
    )


# Configure logging before app initialization
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"API prefix: {settings.API_V1_PREFIX}")

    # Verify database connection on startup
    db_health = check_database_health()
    if db_health["status"] == "healthy":
        logger.info("Database connection verified")
    else:
        logger.error(f"Database connection failed: {db_health.get('error', 'Unknown error')}")

    yield

    # Shutdown
    logger.info(f"Shutting down {settings.PROJECT_NAME}")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Indoor Wayfinding and Navigation API for building navigation, "
                "QR code localization, and A* pathfinding.",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log incoming requests for monitoring."""
    start_time = datetime.utcnow()
    response = await call_next(request)
    process_time = (datetime.utcnow() - start_time).total_seconds() * 1000

    # Log slow requests (>500ms)
    if process_time > 500:
        logger.warning(
            f"Slow request: {request.method} {request.url.path} "
            f"took {process_time:.2f}ms"
        )

    return response


# Create upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs("./public/demo", exist_ok=True)

# Mount static files for uploads and demo
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/demo", StaticFiles(directory="./public/demo"), name="demo")

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to NavIO - Indoor Wayfinding API",
        "version": settings.VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "api": settings.API_V1_PREFIX,
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    """
    Comprehensive health check endpoint.

    Returns service health including database connectivity and connection pool status.
    """
    db_health = check_database_health()

    overall_status = "healthy" if db_health["status"] == "healthy" else "degraded"

    return {
        "status": overall_status,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "database": db_health
        }
    }


@app.get("/ready")
async def readiness_check():
    """
    Kubernetes-style readiness probe.

    Returns 200 only if the service is ready to accept traffic.
    """
    db_health = check_database_health()

    if db_health["status"] != "healthy":
        return JSONResponse(
            status_code=503,
            content={
                "ready": False,
                "reason": "Database not available"
            }
        )

    return {"ready": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
