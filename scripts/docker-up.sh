#!/usr/bin/env sh
set -e

# Build and start all services
docker compose up --build "$@"
