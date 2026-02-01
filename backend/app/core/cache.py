"""
Redis Cache Service for NavIO.

Provides caching functionality for navigation graphs and other
frequently accessed data to improve performance.
"""
import json
import pickle
import logging
from typing import Optional, Any, Callable, TypeVar
from functools import wraps
import hashlib

import redis
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CacheService:
    """
    Redis-based cache service with connection pooling and error handling.

    Features:
    - Automatic connection management
    - Graceful degradation when Redis is unavailable
    - TTL-based expiration
    - Pickle serialization for complex objects
    - JSON serialization for simple objects
    """

    _instance: Optional['CacheService'] = None
    _redis_client: Optional[redis.Redis] = None

    def __new__(cls) -> 'CacheService':
        """Singleton pattern for cache service."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize Redis connection if not already done."""
        if self._redis_client is None and settings.CACHE_ENABLED:
            self._connect()

    def _connect(self) -> None:
        """Establish Redis connection with error handling."""
        try:
            self._redis_client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=False,  # We'll handle encoding ourselves
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
            # Test connection
            self._redis_client.ping()
            logger.info("Redis cache connected successfully")
        except RedisError as e:
            logger.warning(f"Redis connection failed: {e}. Caching disabled.")
            self._redis_client = None

    @property
    def is_available(self) -> bool:
        """Check if Redis is available."""
        if not settings.CACHE_ENABLED or self._redis_client is None:
            return False
        try:
            self._redis_client.ping()
            return True
        except RedisError:
            return False

    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """
        Generate a unique cache key from prefix and arguments.

        Args:
            prefix: Key prefix (e.g., 'graph', 'route')
            *args: Positional arguments to include in key
            **kwargs: Keyword arguments to include in key

        Returns:
            SHA256 hash-based cache key
        """
        key_parts = [prefix] + [str(arg) for arg in args]
        key_parts += [f"{k}={v}" for k, v in sorted(kwargs.items())]
        key_string = ":".join(key_parts)
        key_hash = hashlib.sha256(key_string.encode()).hexdigest()[:16]
        return f"navio:{prefix}:{key_hash}"

    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/error
        """
        if not self.is_available:
            return None

        try:
            data = self._redis_client.get(key)
            if data is None:
                return None

            # Try to unpickle the data
            try:
                return pickle.loads(data)
            except (pickle.UnpicklingError, TypeError):
                # Fall back to JSON
                return json.loads(data.decode('utf-8'))

        except RedisError as e:
            logger.warning(f"Redis get error for key {key}: {e}")
            return None

    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        use_pickle: bool = True
    ) -> bool:
        """
        Set a value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (default: settings.CACHE_TTL)
            use_pickle: Use pickle serialization (default: True)

        Returns:
            True if successful, False otherwise
        """
        if not self.is_available:
            return False

        ttl = ttl or settings.CACHE_TTL

        try:
            if use_pickle:
                data = pickle.dumps(value)
            else:
                data = json.dumps(value).encode('utf-8')

            self._redis_client.setex(key, ttl, data)
            return True

        except (RedisError, pickle.PicklingError, TypeError) as e:
            logger.warning(f"Redis set error for key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete a key from cache.

        Args:
            key: Cache key

        Returns:
            True if successful, False otherwise
        """
        if not self.is_available:
            return False

        try:
            self._redis_client.delete(key)
            return True
        except RedisError as e:
            logger.warning(f"Redis delete error for key {key}: {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.

        Args:
            pattern: Key pattern (e.g., 'navio:graph:*')

        Returns:
            Number of keys deleted
        """
        if not self.is_available:
            return 0

        try:
            keys = list(self._redis_client.scan_iter(match=pattern))
            if keys:
                return self._redis_client.delete(*keys)
            return 0
        except RedisError as e:
            logger.warning(f"Redis delete pattern error for {pattern}: {e}")
            return 0

    def invalidate_floor_plan(self, floor_plan_id: str) -> int:
        """
        Invalidate all cache entries for a floor plan.

        Args:
            floor_plan_id: Floor plan UUID

        Returns:
            Number of keys deleted
        """
        pattern = f"navio:*:{floor_plan_id}:*"
        count = self.delete_pattern(pattern)
        logger.info(f"Invalidated {count} cache entries for floor plan {floor_plan_id}")
        return count

    def get_graph(self, floor_plan_id: str, preferences_hash: str) -> Optional[Any]:
        """
        Get cached navigation graph.

        Args:
            floor_plan_id: Floor plan UUID
            preferences_hash: Hash of route preferences

        Returns:
            Cached graph tuple (graph, node_positions) or None
        """
        key = self._generate_key("graph", floor_plan_id, preferences_hash)
        return self.get(key)

    def set_graph(
        self,
        floor_plan_id: str,
        preferences_hash: str,
        graph_data: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Cache navigation graph.

        Args:
            floor_plan_id: Floor plan UUID
            preferences_hash: Hash of route preferences
            graph_data: Graph tuple to cache
            ttl: Custom TTL (optional)

        Returns:
            True if successful
        """
        key = self._generate_key("graph", floor_plan_id, preferences_hash)
        return self.set(key, graph_data, ttl)

    def health_check(self) -> dict:
        """
        Get cache health status.

        Returns:
            Dict with cache health information
        """
        if not settings.CACHE_ENABLED:
            return {
                "status": "disabled",
                "message": "Caching is disabled in configuration"
            }

        if not self.is_available:
            return {
                "status": "unavailable",
                "message": "Redis connection failed"
            }

        try:
            info = self._redis_client.info("memory")
            return {
                "status": "healthy",
                "used_memory": info.get("used_memory_human", "unknown"),
                "connected_clients": self._redis_client.info("clients").get("connected_clients", 0),
            }
        except RedisError as e:
            return {
                "status": "error",
                "message": str(e)
            }


# Global cache instance
cache = CacheService()


def cached(
    prefix: str,
    ttl: Optional[int] = None,
    key_builder: Optional[Callable[..., str]] = None
):
    """
    Decorator for caching function results.

    Args:
        prefix: Cache key prefix
        ttl: Time-to-live in seconds
        key_builder: Optional function to build custom cache key

    Usage:
        @cached("route", ttl=300)
        def calculate_route(floor_plan_id, start, end):
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = cache._generate_key(prefix, *args, **kwargs)

            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result

            # Execute function
            result = func(*args, **kwargs)

            # Cache result
            cache.set(cache_key, result, ttl)
            logger.debug(f"Cached result for {cache_key}")

            return result

        return wrapper
    return decorator
