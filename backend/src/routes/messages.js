import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, pagination } from '../lib/http.js';

const router = Router();

// All message routes require auth, and every read/write is scoped to
// conversations the caller is a member of. There is no public access.

const memberSelect = {
  id: true,
  name: true,
  stakeholderType: true,
  city: true,
};

async function requireMember(conversationId, userId) {
  return prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
}

// GET /api/conversations — my conversations, newest activity first.
// Returns the other members + the latest message for list rendering.
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const memberships = await prisma.conversationMember.findMany({
      where: { userId: req.user.id },
      include: {
        conversation: {
          include: {
            members: { include: { user: { select: memberSelect } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });
    const items = memberships.map((m) => {
      const c = m.conversation;
      return {
        id: c.id,
        title: c.title,
        members: c.members.filter((x) => x.userId !== req.user.id).map((x) => x.user),
        lastMessage: c.messages[0] ?? null,
        updatedAt: c.updatedAt,
      };
    });
    res.json({ items, total: items.length });
  })
);

// POST /api/conversations  (auth)  { userId }
// Find-or-create a 1:1 conversation with another user.
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { userId } = req.body ?? {};
    if (!userId || typeof userId !== 'string') {
      return bad(res, 400, 'Field "userId" is required.');
    }
    if (userId === req.user.id) {
      return bad(res, 400, 'You cannot start a conversation with yourself.');
    }
    const other = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!other) return notFound(res, 'User');

    const candidates = await prisma.conversation.findMany({
      where: { members: { every: { userId: { in: [req.user.id, userId] } } } },
      include: { members: { select: { userId: true } } },
    });
    const direct = candidates.find((c) => c.members.length === 2);
    if (direct) return res.json({ id: direct.id, created: false });

    const convo = await prisma.conversation.create({
      data: { members: { create: [{ userId: req.user.id }, { userId }] } },
    });
    res.status(201).json({ id: convo.id, created: true });
  })
);

// GET /api/conversations/:id/messages?take=50&skip=0  (auth, member only)
router.get(
  '/:id/messages',
  auth,
  asyncHandler(async (req, res) => {
    if (!(await requireMember(req.params.id, req.user.id))) {
      return notFound(res, 'Conversation');
    }
    const { take, skip } = pagination(req);
    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: req.params.id },
        include: { sender: { select: memberSelect } },
        orderBy: { createdAt: 'asc' },
        take,
        skip,
      }),
      prisma.message.count({ where: { conversationId: req.params.id } }),
    ]);
    res.json({ items, total, take, skip });
  })
);

// POST /api/conversations/:id/messages  (auth, member only)  { body }
router.post(
  '/:id/messages',
  auth,
  asyncHandler(async (req, res) => {
    if (!(await requireMember(req.params.id, req.user.id))) {
      return notFound(res, 'Conversation');
    }
    const { body } = req.body ?? {};
    if (!body || typeof body !== 'string' || !body.trim()) {
      return bad(res, 400, 'Field "body" is required.');
    }
    if (body.length > 2000) {
      return bad(res, 400, 'Message is too long (max 2000 characters).');
    }
    const [msg, me] = await Promise.all([
      prisma.message.create({
        data: { conversationId: req.params.id, senderId: req.user.id, body: body.trim() },
        include: { sender: { select: memberSelect } },
      }),
      prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }),
    ]);
    // Bump the conversation so lists sort by recent activity, and notify the
    // other members (excluding the sender).
    const others = await prisma.conversationMember.findMany({
      where: { conversationId: req.params.id, NOT: { userId: req.user.id } },
      select: { userId: true },
    });
    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });
    if (others.length) {
      await prisma.notification.createMany({
        data: others.map((o) => ({
          userId: o.userId,
          type: 'message',
          title: `New message from ${me?.name ?? 'a connection'}`,
          body: body.trim().slice(0, 120),
          link: '/messages',
        })),
      }).catch(() => {});
    }
    res.status(201).json(msg);
  })
);

export default router;
