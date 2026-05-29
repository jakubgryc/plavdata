import os
import logging
import time

import logging_loki
from fastapi import FastAPI
from starlette.requests import Request

logger = logging.getLogger("plavdata")


def setup_logging(app: FastAPI):
    loki_enabled = os.getenv("LOKI_ENABLED", "false").lower() == "true"

    if loki_enabled:
        loki_url = os.getenv("LOKI_URL")
        if not loki_url:
            raise RuntimeError("LOKI_ENABLED is true but LOKI_URL is not set")
        try:
            loki_handler = logging_loki.LokiHandler(
                url=loki_url,
                tags={"application": "plavdata-backend"},
                version="1",
            )
            logger.addHandler(loki_handler)
            logger.setLevel(logging.INFO)
            logger.info("Loki logging handler initialized successfully.")
        except Exception as e:
            logging.basicConfig(level=logging.INFO)
            logger.error(f"Could not connect to Loki: {e}")
    else:
        logging.basicConfig(level=logging.INFO)

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time
        client_ip = request.headers.get("x-real-ip", request.client.host)
        logger.info(
            f"{client_ip} - {request.method} {request.url.path} "
            f"- Status: {response.status_code} "
            f"- Duration: {duration:.3f}s"
        )
        return response
