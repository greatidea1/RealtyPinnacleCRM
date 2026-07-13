import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/** Shared Prisma client for API routes (singleton in dev to avoid hot-reload leaks). */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
  })
// End db

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
