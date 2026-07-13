#!/bin/sh
# Production start helper for Dokploy / Node (standalone output).
# Prefer the Docker image entrypoint in production; this mirrors it for bare hosts.
set -e

cd "$(dirname "$0")"

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set"
  exit 1
fi

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"

npx prisma migrate deploy --schema=./prisma/schema.prisma
exec node .next/standalone/server.js
# End start-server.sh
