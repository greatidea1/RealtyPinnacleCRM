# Multi-stage production image for Dokploy (Next.js standalone + Prisma).
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma generate does not need a live DB; placeholder URL is enough at build time.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/realtypinnacle"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl tzdata
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV TZ=Asia/Kolkata

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone Next.js output first (includes traced node_modules).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

# Install Prisma after standalone so migrate deploy works at container start.
RUN npm install --omit=dev prisma@6.11.1 @prisma/client@6.11.1 \
  && npx prisma generate --schema=./prisma/schema.prisma \
  && npm cache clean --force \
  && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
# End of Dockerfile
