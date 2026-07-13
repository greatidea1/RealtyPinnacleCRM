import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

/** Reads and normalizes backup-admin credentials from process env. */
export function getBackupAdminEnv() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  // Trim — Dokploy/.env files often append a trailing newline that breaks bcrypt login.
  const password = (process.env.ADMIN_PASSWORD || '').trim();
  const name = (process.env.ADMIN_NAME || 'Admin').trim() || 'Admin';
  return { email, password, name };
}
// End getBackupAdminEnv

/**
 * Ensures the env backup admin exists with the current ADMIN_PASSWORD hash.
 * Uses the same Prisma + bcryptjs stack as login (avoids bootstrap hash drift).
 */
export async function ensureBackupAdmin() {
  const { email, password, name } = getBackupAdminEnv();
  if (!email || !password) return null;

  const hashed = await hash(password, 10);
  const user = await db.user.upsert({
    where: { email },
    create: {
      email,
      password: hashed,
      name,
      role: 'ADMIN',
      isActive: true,
    },
    update: {
      password: hashed,
      name,
      role: 'ADMIN',
      isActive: true,
    },
  });
  return user;
}
// End ensureBackupAdmin

/**
 * True when the typed credentials match the env backup admin.
 * @param email - Normalized login email
 * @param password - Typed password (will be trimmed)
 */
export function matchesBackupAdmin(email: string, password: string) {
  const env = getBackupAdminEnv();
  if (!env.email || !env.password) return false;
  return email === env.email && password.trim() === env.password;
}
// End matchesBackupAdmin
