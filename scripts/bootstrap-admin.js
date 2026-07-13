/**
 * Ensures a backup ADMIN exists from ADMIN_EMAIL + ADMIN_PASSWORD env vars.
 * Creates the user if missing; updates password + ADMIN role if already present.
 */
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

/** Syncs the env-configured backup admin into the database. */
async function ensureBackupAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Admin').trim() || 'Admin';

  if (!email || !password) {
    console.log('Backup admin skipped (set ADMIN_EMAIL and ADMIN_PASSWORD to enable)');
    return;
  }

  if (password.length < 6) {
    console.error('ADMIN_PASSWORD must be at least 6 characters');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const hashed = await hash(password, 10);
    const existing = await prisma.user.findUnique({ where: { email } });

    if (!existing) {
      await prisma.user.create({
        data: {
          email,
          password: hashed,
          name,
          role: 'ADMIN',
          isActive: true,
        },
      });
      console.log(`Backup admin created: ${email}`);
      return;
    }

    await prisma.user.update({
      where: { email },
      data: {
        password: hashed,
        name: existing.name || name,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`Backup admin synced: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}
// End ensureBackupAdmin

ensureBackupAdmin().catch((err) => {
  console.error('Backup admin bootstrap failed:', err);
  process.exit(1);
});
