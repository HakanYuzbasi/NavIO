"""
NavIO - Indoor Wayfinding SaaS
FastAPI application entry point.

This module initializes the FastAPI application with proper logging,
middleware configuration, exception handling, rate limiting, and health monitoring.
"""
import logging
import sys
import os
import uuid
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import check_database_health
from app.core.cache import cache
from app.core.exceptions import register_exception_handlers
from app.api.routes import router as api_router
from app.api.detection import router as detection_router
from app.api.auth import router as auth_router
from app.api.docs import TAGS_METADATA, API_DESCRIPTION


def setup_logging() -> None:
    """Configure application-wide structured JSON logging."""
    try:
        from pythonjsonlogger import jsonlogger

        class CustomJsonFormatter(jsonlogger.JsonFormatter):
            """Custom JSON formatter with additional fields."""

            def add_fields(self, log_record, record, message_dict):
                super().add_fields(log_record, record, message_dict)
                log_record['timestamp'] = datetime.utcnow().isoformat()
                log_record['level'] = record.levelname
                log_record['logger'] = record.name
                log_record['service'] = settings.PROJECT_NAME
                log_record['version'] = settings.VERSION

        handler = logging.StreamHandler(sys.stdout)
        formatter = CustomJsonFormatter(
            '%(timestamp)s %(level)s %(name)s %(message)s'
        )
        handler.setFormatter(formatter)

        root_logger = logging.getLogger()
        root_logger.handlers = []
        root_logger.addHandler(handler)
        root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))

    except ImportError:
        # Fallback to basic logging if python-json-logger not installed
        logging.basicConfig(
            level=getattr(logging, settings.LOG_LEVEL.upper()),
            format=settings.LOG_FORMAT,
            handlers=[logging.StreamHandler(sys.stdout)]
        )

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.DEBUG if settings.DEBUG else logging.WARNING
    )


# Configure logging before app initialization
setup_logging()
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["1000/hour"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    logger.info(
        "Starting application",
        extra={
            "project": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "debug": settings.DEBUG,
            "api_prefix": settings.API_V1_PREFIX
        }
    )

    # Verify database connection on startup
    db_health = check_database_health()
    if db_health["status"] == "healthy":
        logger.info("Database connection verified", extra={"pool": db_health.get("pool")})
    else:
        logger.error(
            "Database connection failed",
            extra={"error": db_health.get("error", "Unknown error")}
        )

    yield

    # Shutdown
    logger.info("Shutting down application")


# Create FastAPI application with enhanced documentation
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=API_DESCRIPTION,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan,
    openapi_url="/api/v1/openapi.json",
    contact={
        "name": "NavIO Support",
        "url": "https://github.com/HakanYuzbasi/NavIO",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
)

# Add rate limiter to app state
app.state.limiter = limiter

# Register rate limit exceeded handler
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Register custom exception handlers
register_exception_handlers(app)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Correlation-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
)


@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    """Add correlation ID to requests for distributed tracing."""
    correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    request.state.correlation_id = correlation_id

    start_time = datetime.utcnow()
    response = await call_next(request)
    process_time = (datetime.utcnow() - start_time).total_seconds() * 1000

    # Add correlation ID to response headers
    response.headers["X-Correlation-ID"] = correlation_id

    # Log request with correlation ID
    log_extra = {
        "correlation_id": correlation_id,
        "method": request.method,
        "path": request.url.path,
        "status_code": response.status_code,
        "process_time_ms": round(process_time, 2),
        "client_ip": request.client.host if request.client else None
    }

    # Log slow requests (>500ms) at warning level
    if process_time > 500:
        logger.warning("Slow request detected", extra=log_extra)
    elif settings.DEBUG:
        logger.debug("Request completed", extra=log_extra)

    return response


# Create upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs("./public/demo", exist_ok=True)

# Mount static files for uploads and demo
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/demo", StaticFiles(directory="./public/demo"), name="demo")

# Include API routes
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.include_router(detection_router, prefix=settings.API_V1_PREFIX, tags=["detection"])


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


@app.get("/health", tags=["health"])
@limiter.exempt
async def health_check(request: Request):
    """
    Comprehensive health check endpoint.

    Returns service health including database connectivity, cache status,
    and connection pool information.

    **Response Fields:**
    - `status`: Overall health status (healthy, degraded, unhealthy)
    - `service`: Service name
    - `version`: API version
    - `timestamp`: Current server time
    - `components`: Individual component health statuses
    """
    db_health = check_database_health()
    cache_health = cache.health_check()

    # Determine overall status
    if db_health["status"] == "healthy" and cache_health.get("status") in ["healthy", "disabled"]:
        overall_status = "healthy"
    elif db_health["status"] == "healthy":
        overall_status = "degraded"  # Cache unavailable but DB works
    else:
        overall_status = "unhealthy"

    return {
        "status": overall_status,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "database": db_health,
            "cache": cache_health
        }
    }


@app.get("/ready")
@limiter.exempt
async def readiness_check(request: Request):
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


@app.get("/live")
@limiter.exempt
async def liveness_check(request: Request):
    """
    Kubernetes-style liveness probe.

    Returns 200 if the service is alive (basic health check).
    """
    return {"alive": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
