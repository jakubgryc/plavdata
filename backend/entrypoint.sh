#!/bin/sh
# Container entrypoint: apply pending DB migrations, then start the app.
# The DB is guaranteed to be ready via compose `depends_on: service_healthy`.
set -e

echo "Running alembic migrations..."
alembic upgrade head

exec "$@"
