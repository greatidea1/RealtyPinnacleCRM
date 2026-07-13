/**
 * Ensures a backup ADMIN exists from ADMIN_EMAIL + ADMIN_PASSWORD env vars.
 * Creates the user if missing; updates password + ADMIN role if already present.
 */
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

/** Syncs the env-configured backup admin into the database. */
async function ensureBackupAdmin() {
  const rawEmail = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Admin').trim() || 'Admin';
  const email = (rawEmail || '').trim().toLowerCase();

  console.log(
    `Backup admin env: ADMIN_EMAIL=${email ? `"${email}"` : '(empty)'} ADMIN_PASSWORD=${password ? `(set, ${password.length} chars)` : '(empty)'} ADMIN_NAME="${name}"`,
  );

  if (!email || !password) {
    console.error(
      'ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set in Dokploy Compose Environment, then Redeploy.',
    );
    console.error(
      'Without them, invite-only mode has no login until an admin exists.',
    );
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('ERROR: ADMIN_PASSWORD must be at least 6 characters');
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
      console.log(`Backup admin CREATED: ${email}`);
      return;
    }

    await prisma.user.update({
      where: { email },
      data: {
        password: hashed,
        name: name || existing.name,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`Backup admin SYNCED (password + ADMIN role): ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}
// End ensureBackupAdmin

ensureBackupAdmin().catch((err) => {
  console.error('Backup admin bootstrap failed:', err);
  process.exit(1);
});
