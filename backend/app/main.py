import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import personal_bests
from app.api import swimmers
from app.api import dashboard_stats
from app.api.results import results_router


app = FastAPI()

# Get allowed origins from environment variable, default to allowing all in development
allowed_origins = os.getenv("CORS_ORIGINS", "*").split(",")

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


@app.get("/")
async def read_root():
    return {"message": "Hello, world"}
