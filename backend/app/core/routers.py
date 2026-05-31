from fastapi import FastAPI
from app.api import (
    dashboard_stats,
    competitions,
    personal_bests,
    swimmers,
    utils,
    auth,
    admin,
    groups,
    results,
)

_routers = [
    auth,
    admin,
    competitions,
    groups,
    personal_bests,
    swimmers,
    results,
    dashboard_stats,
    utils,
]


def register_routers(app: FastAPI):
    for module in _routers:
        app.include_router(module.router, prefix="/api")
