const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node scripts/reset-password.js <email> <new_password>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const hashed = await hash(password.trim(), 10);
    const user = await prisma.user.update({
      where: { email: email.trim().toLowerCase() },
      data: {
        password: hashed,
        isActive: true, // ensure they are active
      },
    });
    console.log(`Successfully updated password for ${user.email} (${user.role})`);
  } catch (error) {
    console.error('Error updating password:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
