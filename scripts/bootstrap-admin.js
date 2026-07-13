/**
 * Ensures a backup ADMIN exists from ADMIN_EMAIL + ADMIN_PASSWORD env vars.
 * Creates/updates the user; verifies bcrypt round-trip before exiting.
 */
const { PrismaClient } = require('@prisma/client');
const { hash, compare } = require('bcryptjs');

/** Syncs the env-configured backup admin into the database. */
async function ensureBackupAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  // Trim — Dokploy/.env often adds a trailing newline (shows as "6 chars" for a 5-char password).
  const password = (process.env.ADMIN_PASSWORD || '').trim();
  const name = (process.env.ADMIN_NAME || 'Admin').trim() || 'Admin';

  console.log(
    `Backup admin env: ADMIN_EMAIL=${email ? `"${email}"` : '(empty)'} ADMIN_PASSWORD=${password ? `(set, ${password.length} chars after trim)` : '(empty)'} ADMIN_NAME="${name}"`,
  );

  if (!email || !password) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set in Dokploy Compose Environment.');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error(`ERROR: ADMIN_PASSWORD must be at least 6 characters (got ${password.length} after trim)`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const hashed = await hash(password, 10);
    const verify = await compare(password, hashed);
    if (!verify) {
      console.error('ERROR: bcrypt hash/compare round-trip failed inside bootstrap');
      process.exit(1);
    }

    await prisma.user.upsert({
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

    const stored = await prisma.user.findUnique({ where: { email } });
    const dbOk = stored ? await compare(password, stored.password) : false;
    if (!dbOk) {
      console.error('ERROR: password stored in DB does not verify — login would fail');
      process.exit(1);
    }

    console.log(`Backup admin ready: ${email} (bcrypt verify OK)`);
  } finally {
    await prisma.$disconnect();
  }
}
// End ensureBackupAdmin

ensureBackupAdmin().catch((err) => {
  console.error('Backup admin bootstrap failed:', err);
  process.exit(1);
});
