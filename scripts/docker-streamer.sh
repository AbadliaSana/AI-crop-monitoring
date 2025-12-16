#!/usr/bin/env sh
set -e

# Use docker-compose service web to run streamer.
# Requires either API_STATIC_ACCESS_TOKEN or API_USERNAME/API_PASSWORD in .env.docker

docker compose exec web sh -c "python backend/simulation/streamer.py"
