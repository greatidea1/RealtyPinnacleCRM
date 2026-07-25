#!/bin/sh
# Wait for Postgres, apply Prisma migrations, then start Next.js.
set -e

# wait_for_db polls DATABASE_URL until Postgres accepts connections (or times out).
wait_for_db() {
  if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set"
    exit 1
  fi

  # Log host only (never print credentials).
  db_host=$(printf '%s' "$DATABASE_URL" | sed -E 's#^[^@]*@([^/:?]+).*#\1#')
  echo "Waiting for database at host: ${db_host:-unknown} ..."

  i=0
  max=90
  last_err=""
  while [ "$i" -lt "$max" ]; do
    err_file=$(mktemp)
    if node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.\$queryRaw\`SELECT 1\`
        .then(async () => { await prisma.\$disconnect(); process.exit(0); })
        .catch(async (e) => {
          console.error(e.message || e);
          await prisma.\$disconnect().catch(() => {});
          process.exit(1);
        });
    " 2>"$err_file"; then
      rm -f "$err_file"
      echo "Database is ready"
      return 0
    fi
    last_err=$(cat "$err_file" 2>/dev/null || true)
    rm -f "$err_file"
    i=$((i + 1))
    if [ $((i % 5)) -eq 0 ]; then
      echo "Still waiting (${i}/${max}): ${last_err}"
    fi
    sleep 2
  done

  echo "ERROR: Database did not become ready in time"
  echo "Last error: ${last_err}"
  echo "Hint (Compose): DATABASE_URL host should be the service name 'db',"
  echo "and POSTGRES_PASSWORD in Dokploy must match the URL password."
  exit 1
}

wait_for_db

# Prisma CLI lives in /prisma-tools (full dep tree). App code stays in /app.
echo "Applying Prisma migrations..."
node /prisma-tools/node_modules/prisma/build/index.js migrate deploy --schema=/app/prisma/schema.prisma

echo "Starting Realty Pinnacle CRM on ${HOSTNAME:-0.0.0.0}:${PORT:-3000} ..."
exec node server.js
# End docker-entrypoint.sh
