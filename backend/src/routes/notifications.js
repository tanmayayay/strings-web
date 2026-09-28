import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, pagination } from '../lib/http.js';

const router = Router();

// All notification routes require auth and are scoped to the caller.

// GET /api/notifications?unread=true&take=20&skip=0
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const where = { userId: req.user.id };
    if (req.query.unread === 'true') where.read = false;
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.id, read: false } }),
    ]);
    res.json({ items, total, unreadCount, take, skip });
  })
);

// POST /api/notifications/read  (auth)  { ids?: string[] }
// Marks the given notifications as read, or all of the caller's when `ids`
// is omitted.
router.post(
  '/read',
  auth,
  asyncHandler(async (req, res) => {
    const { ids } = req.body ?? {};
    const where = { userId: req.user.id, read: false };
    if (Array.isArray(ids) && ids.length > 0) {
      where.id = { in: ids.filter((x) => typeof x === 'string') };
    }
    const result = await prisma.notification.updateMany({ where, data: { read: true } });
    res.json({ updated: result.count });
  })
);

export default router;
