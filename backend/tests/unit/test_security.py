"""Unit tests for security utilities."""
import pytest
from datetime import timedelta

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
)


class TestPasswordHashing:
    """Tests for password hashing functions."""

    def test_password_hash_creates_different_hash(self):
        """Password hash should be different from original."""
        password = "TestPassword123"
        hashed = get_password_hash(password)
        assert hashed != password
        assert len(hashed) > 0

    def test_password_hash_is_unique(self):
        """Same password should create different hashes."""
        password = "TestPassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        # BCrypt generates different hashes due to random salt
        assert hash1 != hash2

    def test_verify_password_correct(self):
        """Verify should return True for correct password."""
        password = "TestPassword123"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Verify should return False for incorrect password."""
        password = "TestPassword123"
        hashed = get_password_hash(password)
        assert verify_password("WrongPassword", hashed) is False

    def test_verify_password_case_sensitive(self):
        """Password verification should be case sensitive."""
        password = "TestPassword123"
        hashed = get_password_hash(password)
        assert verify_password("testpassword123", hashed) is False


class TestJWTTokens:
    """Tests for JWT token creation and validation."""

    def test_create_access_token(self):
        """Should create a valid JWT token."""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_decode_access_token(self):
        """Should decode a valid JWT token."""
        data = {"sub": "user123", "email": "test@example.com", "role": "viewer"}
        token = create_access_token(data)
        decoded = decode_access_token(token)

        assert decoded is not None
        assert decoded.user_id == "user123"
        assert decoded.email == "test@example.com"
        assert decoded.role == "viewer"

    def test_decode_invalid_token(self):
        """Should return None for invalid token."""
        decoded = decode_access_token("invalid_token")
        assert decoded is None

    def test_token_with_custom_expiration(self):
        """Should create token with custom expiration."""
        data = {"sub": "user123"}
        token = create_access_token(data, expires_delta=timedelta(hours=2))
        decoded = decode_access_token(token)
        assert decoded is not None
        assert decoded.user_id == "user123"

    def test_decode_expired_token(self):
        """Should return None for expired token."""
        data = {"sub": "user123"}
        # Create a token that's already expired
        token = create_access_token(data, expires_delta=timedelta(seconds=-1))
        decoded = decode_access_token(token)
        assert decoded is None
