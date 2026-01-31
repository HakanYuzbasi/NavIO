"""
Base model with common fields and soft delete support.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String, DateTime, Boolean, event
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session


Base = declarative_base()


class SoftDeleteMixin:
    """
    Mixin for soft delete functionality.

    Adds deleted_at timestamp field for soft deletes instead of
    permanently removing records from the database.
    """
    deleted_at = Column(DateTime, nullable=True, default=None)

    @property
    def is_deleted(self) -> bool:
        """Check if the record has been soft deleted."""
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        """Mark the record as deleted."""
        self.deleted_at = datetime.utcnow()

    def restore(self) -> None:
        """Restore a soft-deleted record."""
        self.deleted_at = None


class BaseModel(Base, SoftDeleteMixin):
    """Base model with common fields and soft delete support."""

    __abstract__ = True

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class BaseModelNoSoftDelete(Base):
    """Base model without soft delete support for certain tables."""

    __abstract__ = True

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


def soft_delete_filter(query, model_class):
    """
    Apply soft delete filter to a query.

    Usage:
        query = soft_delete_filter(db.query(FloorPlan), FloorPlan)
    """
    if hasattr(model_class, 'deleted_at'):
        return query.filter(model_class.deleted_at.is_(None))
    return query


def include_deleted_filter(query, model_class):
    """
    Include soft deleted records in a query.

    Usage:
        query = include_deleted_filter(db.query(FloorPlan), FloorPlan)
    """
    return query  # No filter applied, includes all records


def only_deleted_filter(query, model_class):
    """
    Only return soft deleted records.

    Usage:
        query = only_deleted_filter(db.query(FloorPlan), FloorPlan)
    """
    if hasattr(model_class, 'deleted_at'):
        return query.filter(model_class.deleted_at.isnot(None))
    return query.filter(False)  # Return nothing if no soft delete support
