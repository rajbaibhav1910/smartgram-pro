# ==============================================================================
# SmartGram Pro — Production Backend Container
# ==============================================================================
FROM python:3.11-slim AS runtime

# System configuration & Python optimization flags
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    FLASK_ENV=production

# Install essential dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create secure, non-privileged system user
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser

WORKDIR /app

# Install Python dependencies first for optimal Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and dataset
COPY config.py app.py ./
COPY data/villages_index.json ./data/villages_index.json

# If static frontend dist exists, copy it (enables standalone fallback)
COPY frontend/dist ./frontend/dist

# Set file permissions for non-root user
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

# Container health check querying the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; sys_exit = 0 if urllib.request.urlopen('http://127.0.0.1:5000/api/health', timeout=3).getcode() == 200 else 1; exit(sys_exit)"

# Production WSGI server (Gunicorn) with multi-worker threading
CMD ["gunicorn", \
     "--workers=2", \
     "--threads=4", \
     "--worker-class=gthread", \
     "--bind=0.0.0.0:5000", \
     "--timeout=60", \
     "--keep-alive=5", \
     "--access-logfile=-", \
     "--error-logfile=-", \
     "app:app"]
