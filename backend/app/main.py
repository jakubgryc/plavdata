import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import personal_bests
from app.api import swimmers
from app.api import dashboard_stats
from app.api.results import results_router
from app.api import utils


app = FastAPI()

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
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(personal_bests.router, prefix="/api")
app.include_router(swimmers.router, prefix="/api")
app.include_router(results_router, prefix="/api")
app.include_router(dashboard_stats.router, prefix="/api")
app.include_router(utils.router, prefix="/api")


@app.get("/")
async def read_root():
    return {"message": "Hello, world"}
