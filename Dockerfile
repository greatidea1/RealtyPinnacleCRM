# syntax=docker/dockerfile:1.7
# Fast multi-stage build for Dokploy (Next.js standalone + Prisma migrate at boot).

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
# Skip package.json "build" file copies — the runner stage copies static/public.
RUN npx prisma generate && npx next build

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

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

# Prisma CLI + bcrypt for migrate/admin bootstrap (cached).
RUN --mount=type=cache,target=/root/.npm \
  npm install --omit=dev --no-audit --no-fund prisma@6.11.1 bcryptjs@3.0.3 \
  && chown -R nextjs:nodejs /app/node_modules /app/scripts

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
# End of Dockerfile
