FROM python:3.12-slim

# Set environment
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system build dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    libpq-dev \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV VIRTUAL_ENV="/app/.venv"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"


# Copy dependency files
# COPY pyproject.toml uv.lock ./

# Install dependencies with uv
# RUN uv install

# Copy rest of the backend app
COPY . .

# Default command to run FastAPI
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
