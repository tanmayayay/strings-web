// One-off cleanup for smoke-test leftovers.
// Deletes Prisma users whose name starts with "Smoke " (all their
// opportunities, applications, messages, bookings, etc. cascade).
// Run from backend/:  set -a; source .env; set +a; node scripts/cleanup-smoke.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
try {
  const del = await prisma.user.deleteMany({ where: { name: { startsWith: 'Smoke ' } } });
  console.log(`deleted ${del.count} test user(s)`);
} finally {
  await prisma.$disconnect();
}
