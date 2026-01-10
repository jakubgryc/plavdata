from fastapi import Request, Response
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)


def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom handler to return a JSON response when rate limit is hit.
    """
    # exc.detail contains the default message
    # You can also access headers like "Retry-After" if provided

    response = JSONResponse(
        status_code=429,
        content={
            "error": "Too Many Requests",
            "message": "You have exceeded your request quota.",
            "retry_after_seconds": exc.detail,  # SlowAPI puts the limit info here
        },
    )
    return response
