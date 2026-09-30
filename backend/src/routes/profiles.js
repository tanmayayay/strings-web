import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, pagination } from '../lib/http.js';

const router = Router();

const STAKEHOLDER_TYPES = ['PERFORMER', 'VENUE', 'BUYER', 'CREW', 'INSTITUTION'];
const VISIBILITIES = ['PUBLIC', 'CONNECTIONS', 'PRIVATE'];
const VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED'];

const publicUser = {
  id: true,
  stakeholderType: true,
  name: true,
  bio: true,
  city: true,
  visibility: true,
  verificationStatus: true,
  createdAt: true,
  detail: true,
};

// GET /api/profiles?type=PERFORMER&city=Mumbai&search=ananya&take=20&skip=0
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const where = {};
    if (req.query.type) {
      if (!STAKEHOLDER_TYPES.includes(req.query.type)) {
        return bad(res, 400, `Invalid type. One of: ${STAKEHOLDER_TYPES.join(', ')}`);
      }
      where.stakeholderType = req.query.type;
    }
    if (req.query.city) where.city = req.query.city;
    if (req.query.search) where.name = { contains: req.query.search };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          ...publicUser,
          _count: { select: { posts: true, followers: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ items, total, take, skip });
  })
);

// POST /api/profiles  (auth) — create a profile.
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { name, stakeholderType, bio, city, visibility, detail } = req.body ?? {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return bad(res, 400, 'Field "name" is required.');
    }
    if (!STAKEHOLDER_TYPES.includes(stakeholderType)) {
      return bad(res, 400, `Field "stakeholderType" must be one of: ${STAKEHOLDER_TYPES.join(', ')}`);
    }
    if (visibility !== undefined && !VISIBILITIES.includes(visibility)) {
      return bad(res, 400, `Field "visibility" must be one of: ${VISIBILITIES.join(', ')}`);
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        stakeholderType,
        bio: bio ?? null,
        city: city ?? null,
        visibility: visibility ?? 'PUBLIC',
        verificationStatus: 'UNVERIFIED',
        ...(detail
          ? { detail: { create: { type: stakeholderType, data: detail } } }
          : {}),
      },
      select: publicUser,
    });

    res.status(201).json(user);
  })
);

// GET /api/profiles/me  (auth) — the caller's own profile.
// The auth middleware auto-provisions the Prisma user on first sight, so this
// always returns a row for a valid token.
router.get(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: publicUser,
    });
    if (!user) return notFound(res, 'Profile');
    res.json(user);
  })
);

// GET /api/profiles/me/following  (auth) — people the caller follows.
// Registered BEFORE /:id so Express doesn't capture "me" as an id.
router.get(
  '/me/following',
  auth,
  asyncHandler(async (req, res) => {
    const rows = await prisma.connection.findMany({
      where: { followerId: req.user.id, kind: 'FOLLOW' },
      include: {
        followee: {
          select: { id: true, name: true, stakeholderType: true, city: true, verificationStatus: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: rows.map((r) => r.followee) });
  })
);

// GET /api/profiles/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        ...publicUser,
        posts: {
          select: { id: true, body: true, mediaUrl: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: { select: { posts: true, followers: true, following: true } },
      },
    });
    if (!user) return notFound(res, 'Profile');
    res.json(user);
  })
);

// PATCH /api/profiles/:id  (auth, owner only)
router.patch(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    if (req.user.id !== req.params.id) {
      return bad(res, 403, 'You can only edit your own profile.');
    }

    const { name, stakeholderType, bio, city, visibility, detail } = req.body ?? {};
    const data = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return bad(res, 400, 'Field "name" must be a non-empty string.');
      data.name = name.trim();
    }
    if (stakeholderType !== undefined) {
      if (!STAKEHOLDER_TYPES.includes(stakeholderType)) return bad(res, 400, `Invalid stakeholderType.`);
      data.stakeholderType = stakeholderType;
    }
    if (bio !== undefined) data.bio = bio;
    if (city !== undefined) data.city = city;
    if (visibility !== undefined) {
      if (!VISIBILITIES.includes(visibility)) return bad(res, 400, `Invalid visibility.`);
      data.visibility = visibility;
    }
    if (detail !== undefined) {
      data.detail = {
        upsert: {
          create: { type: 'custom', data: detail },
          update: { data: detail },
        },
      };
    }

    try {
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data,
        select: publicUser,
      });
      res.json(user);
    } catch {
      return notFound(res, 'Profile');
    }
  })
);

// POST /api/profiles/:id/follow  (auth) — follow a profile.
// Idempotent: following twice stays followed.
router.post(
  '/:id/follow',
  auth,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) {
      return bad(res, 400, 'You cannot follow yourself.');
    }
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!target) return notFound(res, 'Profile');
    await prisma.connection.upsert({
      where: {
        followerId_followeeId: { followerId: req.user.id, followeeId: req.params.id },
      },
      create: { followerId: req.user.id, followeeId: req.params.id, status: 'ACCEPTED', kind: 'FOLLOW' },
      update: { status: 'ACCEPTED' },
    });
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    await prisma.notification
      .create({
        data: {
          userId: req.params.id,
          type: 'follow',
          title: 'New follower',
          body: `${me?.name ?? 'Someone'} started following you.`,
          link: `/profile/${req.user.id}`,
        },
      })
      .catch(() => {});
    res.status(201).json({ ok: true });
  })
);

// DELETE /api/profiles/:id/follow  (auth) — unfollow a profile.
router.delete(
  '/:id/follow',
  auth,
  asyncHandler(async (req, res) => {
    await prisma.connection.deleteMany({
      where: { followerId: req.user.id, followeeId: req.params.id },
    });
    res.json({ ok: true });
  })
);

export default router;
