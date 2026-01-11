"""
Database configuration and session management.

Provides connection pooling, health checks, and proper session lifecycle
management for production deployments.
"""
import logging
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Generator

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create database engine with production-ready connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before use
    pool_size=settings.DB_POOL_SIZE,  # Number of persistent connections
    max_overflow=settings.DB_MAX_OVERFLOW,  # Additional connections allowed
    pool_timeout=settings.DB_POOL_TIMEOUT,  # Wait time for available connection
    pool_recycle=settings.DB_POOL_RECYCLE,  # Recycle connections after N seconds
    echo=settings.DEBUG
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI.

    Provides automatic session cleanup and proper error handling.

    Yields:
        Database session
    """
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Context manager for database sessions outside of FastAPI.

    Usage:
        with get_db_context() as db:
            db.query(Model).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except SQLAlchemyError as e:
        logger.error(f"Database error in context: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def check_database_health() -> dict:
    """
    Check database connectivity and return health status.

    Returns:
        Dictionary with health status information
    """
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            result.fetchone()

            # Get connection pool status
            pool_status = {
                "pool_size": engine.pool.size(),
                "checked_in": engine.pool.checkedin(),
                "checked_out": engine.pool.checkedout(),
                "overflow": engine.pool.overflow(),
            }

            return {
                "status": "healthy",
                "connected": True,
                "pool": pool_status
            }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "unhealthy",
            "connected": False,
            "error": str(e)
        }
