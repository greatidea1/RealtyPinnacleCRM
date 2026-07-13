#!/bin/sh
# Wait for Postgres (when available), apply Prisma migrations, then start Next.js.
set -e

# wait_for_db polls DATABASE_URL until Postgres accepts connections (or times out).
wait_for_db() {
  if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL is not set"
    exit 1
  fi

  echo "Waiting for database..."
  i=0
  max=60
  while [ "$i" -lt "$max" ]; do
    if node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.\$queryRaw\`SELECT 1\`
        .then(async () => { await prisma.\$disconnect(); process.exit(0); })
        .catch(async () => { await prisma.\$disconnect().catch(() => {}); process.exit(1); });
    " 2>/dev/null; then
      echo "Database is ready"
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done

  echo "Database did not become ready in time"
  exit 1
}
# End wait_for_db

wait_for_db

echo "Applying Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting Realty Pinnacle CRM..."
exec node server.js
# End docker-entrypoint.sh
