"""
Pytest configuration and fixtures for NavIO tests.
"""
import os
import pytest
from typing import Generator
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import get_db
from app.core.security import get_password_hash, create_access_token
from app.models.base import Base
from app.models import FloorPlan, Node, Edge, POI, User, UserRole


# Use in-memory SQLite for testing
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def test_engine():
    """Create a test database engine."""
    engine = create_engine(
        SQLALCHEMY_TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(test_engine) -> Generator[Session, None, None]:
    """Create a fresh database session for each test."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()

    # Clean up tables before each test
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()

    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Create a test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_floor_plan(db_session: Session) -> FloorPlan:
    """Create a sample floor plan for testing."""
    floor_plan = FloorPlan(
        name="Test Floor Plan",
        description="A test floor plan",
        image_url="/demo/test_image.png",
        image_width=1000,
        image_height=800,
    )
    db_session.add(floor_plan)
    db_session.commit()
    db_session.refresh(floor_plan)
    return floor_plan


@pytest.fixture
def sample_nodes(db_session: Session, sample_floor_plan: FloorPlan) -> list:
    """Create sample nodes for testing."""
    nodes = []
    positions = [(100, 100), (200, 100), (200, 200), (100, 200)]

    for i, (x, y) in enumerate(positions):
        node = Node(
            floor_plan_id=sample_floor_plan.id,
            x=x,
            y=y,
            node_type="waypoint",
            name=f"Node {i+1}",
        )
        db_session.add(node)
        nodes.append(node)

    db_session.commit()
    for node in nodes:
        db_session.refresh(node)
    return nodes


@pytest.fixture
def sample_edges(db_session: Session, sample_floor_plan: FloorPlan, sample_nodes: list) -> list:
    """Create sample edges connecting nodes."""
    edges = []

    # Create edges forming a square
    connections = [(0, 1), (1, 2), (2, 3), (3, 0)]

    for source_idx, target_idx in connections:
        edge = Edge(
            floor_plan_id=sample_floor_plan.id,
            source_node_id=sample_nodes[source_idx].id,
            target_node_id=sample_nodes[target_idx].id,
            weight=100.0,
            bidirectional=True,
        )
        db_session.add(edge)
        edges.append(edge)

    db_session.commit()
    for edge in edges:
        db_session.refresh(edge)
    return edges


@pytest.fixture
def sample_poi(db_session: Session, sample_floor_plan: FloorPlan, sample_nodes: list) -> POI:
    """Create a sample POI for testing."""
    poi = POI(
        floor_plan_id=sample_floor_plan.id,
        node_id=sample_nodes[0].id,
        name="Test POI",
        description="A test point of interest",
        category="vendor",
        x=100,
        y=100,
        searchable=True,
    )
    db_session.add(poi)
    db_session.commit()
    db_session.refresh(poi)
    return poi


@pytest.fixture
def sample_user(db_session: Session) -> User:
    """Create a sample user for testing."""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("TestPassword123"),
        full_name="Test User",
        role=UserRole.VIEWER.value,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Create an admin user for testing."""
    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("AdminPassword123"),
        full_name="Admin User",
        role=UserRole.ADMIN.value,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(sample_user: User) -> dict:
    """Create authentication headers for a regular user."""
    token = create_access_token(
        data={
            "sub": str(sample_user.id),
            "email": sample_user.email,
            "role": sample_user.role
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(admin_user: User) -> dict:
    """Create authentication headers for an admin user."""
    token = create_access_token(
        data={
            "sub": str(admin_user.id),
            "email": admin_user.email,
            "role": admin_user.role
        }
    )
    return {"Authorization": f"Bearer {token}"}
