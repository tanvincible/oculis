# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.13.3

FROM python:${PYTHON_VERSION}-slim

WORKDIR /code/backend

# Install venv system dependencies (slim images often need this)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc build-essential libpq-dev python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Set up virtual environment
RUN python -m venv /code/backend/venv

# Activate virtual environment and install dependencies
COPY backend/requirements.txt ./
RUN . /code/backend/venv/bin/activate && pip install --no-cache-dir -r requirements.txt

# Copy code
COPY backend/ ./

# Expose port
EXPOSE 5000

# Set env variables for Flask
ENV FLASK_APP=app:create_app
ENV PATH="/code/backend/venv/bin:$PATH"

# Default command
CMD python -m flask seed-db --force && python app.py
