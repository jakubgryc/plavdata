import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def register_middleware(app: FastAPI):
    env = os.getenv("ENV", "production").lower()

    if env == "development":
        allowed_origins = ["*"]
    else:
        cors_origins = os.getenv("CORS_ORIGINS", "")
        allowed_origins = (
            [o.strip() for o in cors_origins.split(",") if o.strip()]
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
