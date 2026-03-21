# ---------------------------------------------------------------------------
# FireTrek backend — multi-stage Docker image
#
# Stage 1 (builder): installs Python dependencies into a virtual environment.
# Stage 2 (runtime): copies only the venv and app code.
#
# Using python:3.12-slim keeps the image small while still providing GDAL/GEOS
# system libraries needed by PostGIS.
# ---------------------------------------------------------------------------

# Stage 1 — builder
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY requirements/production.txt ./
RUN python -m venv /venv && \
    /venv/bin/pip install --upgrade pip && \
    /venv/bin/pip install -r production.txt

# Stage 2 — runtime
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE="config.settings.production"

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    gdal-bin \
    libgdal32 \
    libgeos-c1v5 \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN groupadd -r firetrek && useradd -r -g firetrek firetrek

COPY --from=builder /venv /venv

WORKDIR /app
COPY . .

RUN chown -R firetrek:firetrek /app
USER firetrek

EXPOSE 8000

# Default command is the ASGI server.
# Override in docker-compose for the Celery worker.
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
