import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const items = await prisma.user.findMany({
    select: { id: true, name: true, _count: { select: { posts: true, followers: true } } },
    orderBy: { createdAt: 'desc' }, take: 20, skip: 0,
  });
  console.log('QUERY OK, users:', items.length);
} catch (e) {
  console.error('QUERY FAILED:', e.code || '', e.message);
}
await prisma.$disconnect();
