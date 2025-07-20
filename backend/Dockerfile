# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.13.3

FROM python:${PYTHON_VERSION}-slim

LABEL fly_launch_runtime="flask"

WORKDIR /code

# Install dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose Flask port (Fly.io reverse proxies from 80/443)
EXPOSE 5000

# Set environment variables
ENV FLASK_APP=app:create_app
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5000

# CMD
CMD ["flask", "run"]
