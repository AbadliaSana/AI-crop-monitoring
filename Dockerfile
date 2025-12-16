FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps for psycopg2 and science stack
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install python deps via pipenv (already in repo)
COPY Pipfile Pipfile.lock* ./
RUN pip install --no-cache-dir pipenv && \
    PIPENV_VENV_IN_PROJECT=1 pipenv install --deploy --system

# Copy project
COPY . .

ENV DJANGO_SETTINGS_MODULE=backend.settings.docker

EXPOSE 8000

# Default command: run migrations then start dev server (override in compose for worker, etc.)
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
