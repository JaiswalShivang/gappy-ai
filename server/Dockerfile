# Use a slim Python 3.11 image for speed and efficiency
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies, including FFmpeg for audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the SentenceTransformer model to cache it in the Docker image.
# This prevents downloading it at startup/runtime and speeds up container boot.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy the rest of the application files
COPY . .

# Ensure the uploads directories exist
RUN mkdir -p uploads/audio uploads/audio_proofs public/audio_proofs

# Expose port
EXPOSE 8000

# Start the FastAPI application with Uvicorn
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
