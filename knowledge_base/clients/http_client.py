import httpx
import logging
from typing import Optional, Callable
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from pybreaker import CircuitBreaker, CircuitBreakerError

logger = logging.getLogger(__name__)

# Shared Circuit Breaker for HTTP calls
# Fails after 3 consecutive errors, stays open for 30 seconds
http_circuit_breaker = CircuitBreaker(fail_max=3, reset_timeout=30)

class HttpClientManager:
    """
    Manages the lifecycle of a singleton httpx.AsyncClient to ensure 
    connection pooling is reused across the application lifecycle.
    """
    _client: Optional[httpx.AsyncClient] = None

    @classmethod
    def start(cls):
        """Initialize the global client. Should be called in FastAPI startup/lifespan."""
        if cls._client is None:
            limits = httpx.Limits(max_keepalive_connections=20, max_connections=100)
            cls._client = httpx.AsyncClient(limits=limits, timeout=httpx.Timeout(10.0))
            logger.info("HttpClientManager started connection pool.")

    @classmethod
    async def stop(cls):
        """Close the global client. Should be called in FastAPI shutdown/lifespan."""
        if cls._client is not None:
            await cls._client.aclose()
            cls._client = None
            logger.info("HttpClientManager closed connection pool.")

    @classmethod
    def get_client(cls) -> httpx.AsyncClient:
        """Get the singleton client. Raises if not started."""
        if cls._client is None:
            # Fallback for scripts or tests that didn't call start()
            limits = httpx.Limits(max_keepalive_connections=20, max_connections=100)
            cls._client = httpx.AsyncClient(limits=limits, timeout=httpx.Timeout(10.0))
        return cls._client

# Decorator combining Tenacity (retries/backoff) and PyBreaker (circuit breaker)
def with_resiliency():
    """
    Decorator for robust HTTP calls.
    1. Uses Tenacity to retry on httpx network errors with exponential backoff.
    2. Wraps the call in a CircuitBreaker to prevent cascading failures if the downstream is completely dead.
    """
    def decorator(func: Callable):
        # Apply the pybreaker circuit breaker
        breaker_wrapped = http_circuit_breaker(func)
        
        # Apply tenacity retries on top of the breaker
        # We retry only on specific transient httpx errors, NOT on CircuitBreakerError or HTTP 400s
        retry_wrapped = retry(
            wait=wait_exponential(multiplier=1, min=2, max=10),
            stop=stop_after_attempt(3),
            retry=retry_if_exception_type((httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout)),
            reraise=True
        )(breaker_wrapped)
        
        return retry_wrapped
    return decorator

# Dependency Injection function for FastAPI
def get_http_client() -> httpx.AsyncClient:
    """FastAPI Dependency to inject the global httpx client."""
    return HttpClientManager.get_client()
