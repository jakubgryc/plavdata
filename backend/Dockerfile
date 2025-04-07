# Use a Python image with uv pre-installed
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# Install the project into `/app`
WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy from the cache instead of linking since it's a mounted volume
ENV UV_LINK_MODE=copy

# Install the project's dependencies using the lockfile and settings
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project

# Then, add the rest of the project source code and install it
# Installing separately from its dependencies allows optimal layer caching
ADD . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

ENTRYPOINT []

# FROM python:3.12-slim
#
# # Set environment
# ENV PYTHONDONTWRITEBYTECODE=1
# ENV PYTHONUNBUFFERED=1
#
# WORKDIR /app
#
# # Install system build dependencies
# RUN apt-get update && apt-get install -y \
#     curl \
#     gcc \
#     libpq-dev \
#     build-essential \
#     && apt-get clean \
#     && rm -rf /var/lib/apt/lists/*
#
# # Install uv
# COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
#
#
#
# # Copy dependency files
# COPY ./pyproject.toml ./uv.lock /app
#
# # RUN uv sync
#
#
# # Copy rest of the backend app
# COPY ./app /app/app 
# COPY ./data /app/data
# COPY ./scripts /app/scripts

ENV VIRTUAL_ENV="/app/.venv"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
