import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.api import (
    dashboard_stats,
    personal_bests,
    swimmers,
    utils,
    auth,
    admin,
    groups,
)
from app.constants import TARGET_CLUB
from app.api.limiter import custom_rate_limit_handler, limiter
from app.api.results import results_router

app = FastAPI()

if not TARGET_CLUB:
    raise RuntimeError("TARGET_CLUB is not set. Define it in .env to start the API.")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

env = os.getenv("ENV", "production").lower()
if env == "development":
    allowed_origins = ["*"]
else:
    cors_origins = os.getenv("CORS_ORIGINS", "")
    allowed_origins = (
        [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
        if cors_origins
        else []
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(personal_bests.router, prefix="/api")
app.include_router(swimmers.router, prefix="/api")
app.include_router(results_router, prefix="/api")
app.include_router(dashboard_stats.router, prefix="/api")
app.include_router(utils.router, prefix="/api")


@app.get("/")
async def read_root():
    return {"message": "Hello, world"}
