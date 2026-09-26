# Shared image for both the API and the parser worker.
# Which process runs is decided by the command in docker-compose.yml / Render blueprint,
# not by this file — that's why there's a single Dockerfile for both services.
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Default command runs the API; overridden for the worker service.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
