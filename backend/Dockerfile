# Use a Python image with uv pre-installed
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

ARG UID=1000
ARG GID=1000

# 1. Create the user first so we can use it for file ownership
RUN groupadd -g ${GID} appuser && \
    useradd -u ${UID} -g appuser -s /bin/bash -m appuser

# 2. Set the working directory and ensure the user owns it
WORKDIR /app
RUN chown appuser:appuser /app

# 3. Environment configurations
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV UV_TOOL_BIN_DIR=/usr/local/bin
ENV PATH="/app/.venv/bin:$PATH"

# 4. Switch to the user BEFORE installing dependencies
USER appuser

# 5. Install dependencies
# Since we are 'appuser', uv will create the .venv with correct permissions
RUN --mount=type=cache,target=/home/appuser/.cache/uv,uid=${UID},gid=${GID} \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-dev

# 6. Copy source code with correct ownership and finish sync
COPY --chown=appuser:appuser . /app
RUN --mount=type=cache,target=/home/appuser/.cache/uv,uid=${UID},gid=${GID} \
    uv sync --locked --no-dev

ENTRYPOINT []
