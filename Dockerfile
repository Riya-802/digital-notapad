# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# We'll rely on the PORT environment variable dynamically rather than hardcoding EXPOSE
# Run gunicorn bound to the PORT environment variable
CMD gunicorn --bind 0.0.0.0:${PORT:-5000} app:app
