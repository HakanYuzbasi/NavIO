"""Integration tests for API endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_root_endpoint(self, client: TestClient):
        """Root endpoint should return API info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "status" in data
        assert data["status"] == "operational"

    def test_health_endpoint(self, client: TestClient):
        """Health endpoint should return health status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "service" in data
        assert "timestamp" in data
        assert "components" in data

    def test_live_endpoint(self, client: TestClient):
        """Liveness probe should return alive status."""
        response = client.get("/live")
        assert response.status_code == 200
        data = response.json()
        assert data["alive"] is True


class TestAuthEndpoints:
    """Tests for authentication endpoints."""

    def test_register_user(self, client: TestClient):
        """Should register a new user."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "NewPassword123",
                "full_name": "New User"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["full_name"] == "New User"
        assert "id" in data

    def test_register_duplicate_email(self, client: TestClient, sample_user):
        """Should reject duplicate email registration."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": sample_user.email,
                "password": "Password123"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_login_valid_credentials(self, client: TestClient, sample_user):
        """Should login with valid credentials."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": sample_user.email,
                "password": "TestPassword123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_password(self, client: TestClient, sample_user):
        """Should reject invalid password."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": sample_user.email,
                "password": "WrongPassword"
            }
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient):
        """Should reject login for nonexistent user."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "Password123"
            }
        )
        assert response.status_code == 401

    def test_get_current_user(self, client: TestClient, sample_user, auth_headers):
        """Should return current user profile."""
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == sample_user.email

    def test_get_current_user_no_auth(self, client: TestClient):
        """Should reject request without authentication."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401


class TestFloorPlanEndpoints:
    """Tests for floor plan endpoints."""

    def test_create_floor_plan(self, client: TestClient):
        """Should create a new floor plan."""
        response = client.post(
            "/api/v1/floor-plans",
            json={
                "name": "New Floor Plan",
                "description": "Test description",
                "image_width": 1000,
                "image_height": 800
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Floor Plan"
        assert data["image_width"] == 1000

    def test_list_floor_plans(self, client: TestClient, sample_floor_plan):
        """Should list all floor plans."""
        response = client.get("/api/v1/floor-plans")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_floor_plan(self, client: TestClient, sample_floor_plan):
        """Should get a specific floor plan."""
        response = client.get(f"/api/v1/floor-plans/{sample_floor_plan.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_floor_plan.name

    def test_get_floor_plan_not_found(self, client: TestClient):
        """Should return 404 for nonexistent floor plan."""
        import uuid
        fake_id = uuid.uuid4()
        response = client.get(f"/api/v1/floor-plans/{fake_id}")
        assert response.status_code == 404

    def test_update_floor_plan(self, client: TestClient, sample_floor_plan):
        """Should update floor plan."""
        response = client.patch(
            f"/api/v1/floor-plans/{sample_floor_plan.id}",
            json={"name": "Updated Name"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"

    def test_delete_floor_plan(self, client: TestClient, sample_floor_plan):
        """Should delete floor plan."""
        response = client.delete(f"/api/v1/floor-plans/{sample_floor_plan.id}")
        assert response.status_code == 204

        # Verify it's deleted
        response = client.get(f"/api/v1/floor-plans/{sample_floor_plan.id}")
        assert response.status_code == 404


class TestNodeEndpoints:
    """Tests for node endpoints."""

    def test_create_node(self, client: TestClient, sample_floor_plan):
        """Should create a new node."""
        response = client.post(
            "/api/v1/nodes",
            json={
                "floor_plan_id": str(sample_floor_plan.id),
                "x": 150.0,
                "y": 250.0,
                "node_type": "waypoint",
                "name": "New Node"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["x"] == 150.0
        assert data["y"] == 250.0
        assert data["node_type"] == "waypoint"

    def test_create_node_invalid_type(self, client: TestClient, sample_floor_plan):
        """Should reject invalid node type."""
        response = client.post(
            "/api/v1/nodes",
            json={
                "floor_plan_id": str(sample_floor_plan.id),
                "x": 150.0,
                "y": 250.0,
                "node_type": "invalid"
            }
        )
        assert response.status_code == 422

    def test_list_nodes(self, client: TestClient, sample_floor_plan, sample_nodes):
        """Should list nodes for a floor plan."""
        response = client.get(f"/api/v1/floor-plans/{sample_floor_plan.id}/nodes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == len(sample_nodes)

    def test_get_node(self, client: TestClient, sample_nodes):
        """Should get a specific node."""
        node = sample_nodes[0]
        response = client.get(f"/api/v1/nodes/{node.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["x"] == node.x
        assert data["y"] == node.y


class TestPOIEndpoints:
    """Tests for POI endpoints."""

    def test_create_poi(self, client: TestClient, sample_floor_plan):
        """Should create a new POI."""
        response = client.post(
            "/api/v1/pois",
            json={
                "floor_plan_id": str(sample_floor_plan.id),
                "name": "New POI",
                "x": 100.0,
                "y": 200.0,
                "category": "vendor"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New POI"
        assert data["category"] == "vendor"

    def test_list_pois(self, client: TestClient, sample_floor_plan, sample_poi):
        """Should list POIs for a floor plan."""
        response = client.get(f"/api/v1/floor-plans/{sample_floor_plan.id}/pois")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_list_pois_searchable_only(self, client: TestClient, sample_floor_plan, sample_poi):
        """Should filter to searchable POIs only."""
        response = client.get(
            f"/api/v1/floor-plans/{sample_floor_plan.id}/pois",
            params={"searchable_only": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert all(poi["searchable"] for poi in data)


class TestAdminEndpoints:
    """Tests for admin-only endpoints."""

    def test_list_users_as_admin(self, client: TestClient, admin_auth_headers, sample_user):
        """Admin should be able to list users."""
        response = client.get("/api/v1/auth/users", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_users_as_regular_user(self, client: TestClient, auth_headers):
        """Regular user should not be able to list users."""
        response = client.get("/api/v1/auth/users", headers=auth_headers)
        assert response.status_code == 403

    def test_update_user_as_admin(self, client: TestClient, admin_auth_headers, sample_user):
        """Admin should be able to update users."""
        response = client.patch(
            f"/api/v1/auth/users/{sample_user.id}",
            headers=admin_auth_headers,
            json={"role": "staff"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "staff"
