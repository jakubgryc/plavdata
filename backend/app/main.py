from fastapi import FastAPI
from app.core.logging import setup_logging
from app.core.middleware import register_middleware
from app.core.routers import register_routers
from app.constants import TARGET_CLUB
from app.api.limiter import custom_rate_limit_handler, limiter
from slowapi.errors import RateLimitExceeded

if not TARGET_CLUB:
    raise RuntimeError("TARGET_CLUB is not set. Define it in .env to start the API.")

app = FastAPI(title="Plavdata API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

setup_logging(app)
register_middleware(app)
register_routers(app)
