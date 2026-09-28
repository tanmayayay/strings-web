import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const publicUser = {
  id: true, stakeholderType: true, name: true, bio: true, city: true,
  visibility: true, verificationStatus: true, createdAt: true, detail: true,
};
try {
  const where = {};
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { ...publicUser, _count: { select: { posts: true, followers: true } } },
      orderBy: { createdAt: 'desc' }, take: 20, skip: 0,
    }),
    prisma.user.count({ where }),
  ]);
  console.log('EXACT QUERY OK, items:', items.length, 'total:', total);
} catch (e) {
  console.error('EXACT QUERY FAILED:', e.code || '', e.message);
}
await prisma.$disconnect();
