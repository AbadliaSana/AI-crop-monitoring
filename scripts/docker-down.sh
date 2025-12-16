#!/usr/bin/env sh
set -e

# Stop services and keep volumes unless --volumes passed
docker compose down "$@"
