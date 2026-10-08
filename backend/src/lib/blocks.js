import { prisma } from './prisma.js';

/** True when either person has blocked the other. */
export async function isBlockedBetween(a, b) {
  if (!a || !b) return false;
  const row = await prisma.block.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    select: { blockerId: true },
  });
  return !!row;
}

/** Ids of everyone the person blocked or who blocked them. */
export async function blockedIdsFor(userId) {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId));
}
