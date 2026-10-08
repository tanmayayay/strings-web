import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad } from '../lib/http.js';
import { vapidPublicKey } from '../lib/push.js';

const router = Router();

// GET /api/push/key — public VAPID key the browser needs to subscribe (null = push not set up).
router.get('/key', (_req, res) => res.json({ key: vapidPublicKey() }));

// POST /api/push/subscribe  { endpoint, keys: { p256dh, auth } }
router.post('/subscribe', auth, asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body ?? {};
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || endpoint.length > 1000) return bad(res, 400, 'Invalid subscription.');
  if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string' || keys.p256dh.length > 200 || keys.auth.length > 100) return bad(res, 400, 'Invalid subscription keys.');
  const count = await prisma.pushSubscription.count({ where: { userId: req.user.id } });
  if (count >= 10) await prisma.pushSubscription.deleteMany({ where: { userId: req.user.id, id: { in: (await prisma.pushSubscription.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'asc' }, take: count - 9, select: { id: true } })).map((r) => r.id) } } });
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: req.user.id, p256dh: keys.p256dh, auth: keys.auth },
  });
  res.status(201).json({ ok: true });
}));

// DELETE /api/push/subscribe  { endpoint }
router.delete('/subscribe', auth, asyncHandler(async (req, res) => {
  const endpoint = req.body?.endpoint;
  if (typeof endpoint === 'string') await prisma.pushSubscription.deleteMany({ where: { userId: req.user.id, endpoint } });
  res.json({ ok: true });
}));

export default router;
