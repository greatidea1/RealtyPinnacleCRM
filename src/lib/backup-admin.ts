import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

/**
 * Reads and normalizes admin credentials from environment variables.
 * Returns empty strings if not set.
 */
export function getAdminEnv() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = (process.env.ADMIN_PASSWORD || '').trim();
  const name = (process.env.ADMIN_NAME || 'Admin').trim() || 'Admin';
  return { email, password, name };
}

/**
 * Checks if the provided credentials match the env-configured admin.
 * This is a simple string comparison — no hashing, no DB lookup.
 */
export function isEnvAdmin(email: string, password: string): boolean {
  const env = getAdminEnv();
  if (!env.email || !env.password) return false;
  return email === env.email && password.trim() === env.password;
}

/**
 * Ensures the env admin exists in the database (upsert) and returns
 * the full user record. Called only after isEnvAdmin() returns true,
 * so the plaintext password is already verified.
 */
export async function ensureEnvAdminInDb() {
  const { email, password, name } = getAdminEnv();
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
      role: 'ADMIN',
      isActive: true,
    },
  });
  return user;
}
