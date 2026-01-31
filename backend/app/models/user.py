"""User model for authentication and authorization."""
from sqlalchemy import Column, String, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
import enum
from .base import BaseModel


class UserRole(str, enum.Enum):
    """User roles for authorization."""
    ADMIN = "admin"
    STAFF = "staff"
    VIEWER = "viewer"


class User(BaseModel):
    """User model for authentication."""

    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default=UserRole.VIEWER.value, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=True)

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
