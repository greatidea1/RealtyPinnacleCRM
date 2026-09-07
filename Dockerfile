# syntax=docker/dockerfile:1.7
# Multi-stage build: Next.js standalone + Prisma migrate at boot.
# Dokploy builds this on the server (compose pull_policy: build) so GHCR auth is not required.

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
  npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma generate does not need a live DB.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/realtypinnacle"
ENV NEXT_TELEMETRY_DISABLED=1
# Build with npm + Next compile caches (effective when BuildKit cache persists).
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/.next/cache \
  npx prisma generate && npx next build

# Full Prisma CLI dependency tree (c12/effect/engines) for migrate deploy at boot.
FROM node:22-alpine AS prisma-tools
WORKDIR /prisma-tools
RUN apk add --no-cache libc6-compat openssl
COPY package.json ./
RUN node -e "\
  const pkg = require('./package.json');\
  require('fs').writeFileSync('package.json', JSON.stringify({\
    name: 'prisma-tools',\
    private: true,\
    dependencies: {\
      prisma: pkg.dependencies.prisma,\
      '@prisma/client': pkg.dependencies['@prisma/client']\
    }\
  }));" \
  && npm install --no-audit --no-fund

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl tzdata \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV TZ=Asia/Kolkata
# Keep Node heap modest on the 900MB Ampere box.
ENV NODE_OPTIONS=--max-old-space-size=384

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Generated client engines used by wait_for_db / app runtime.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
# Complete Prisma CLI install (separate tree so migrate has c12/effect/engines).
COPY --from=prisma-tools --chown=nextjs:nodejs /prisma-tools /prisma-tools
COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
# End Dockerfile
