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
    const { name, stakeholderType, bio, city, visibility, verificationStatus, detail } = req.body ?? {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return bad(res, 400, 'Field "name" is required.');
    }
    if (!STAKEHOLDER_TYPES.includes(stakeholderType)) {
      return bad(res, 400, `Field "stakeholderType" must be one of: ${STAKEHOLDER_TYPES.join(', ')}`);
    }
    if (visibility !== undefined && !VISIBILITIES.includes(visibility)) {
      return bad(res, 400, `Field "visibility" must be one of: ${VISIBILITIES.join(', ')}`);
    }
    if (verificationStatus !== undefined && !VERIFICATION_STATUSES.includes(verificationStatus)) {
      return bad(res, 400, `Field "verificationStatus" must be one of: ${VERIFICATION_STATUSES.join(', ')}`);
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        stakeholderType,
        bio: bio ?? null,
        city: city ?? null,
        visibility: visibility ?? 'PUBLIC',
        verificationStatus: verificationStatus ?? 'UNVERIFIED',
        ...(detail
          ? { detail: { create: { type: stakeholderType, data: detail } } }
          : {}),
      },
      select: publicUser,
    });

    res.status(201).json(user);
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

    const { name, bio, city, visibility, verificationStatus, detail } = req.body ?? {};
    const data = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return bad(res, 400, 'Field "name" must be a non-empty string.');
      data.name = name.trim();
    }
    if (bio !== undefined) data.bio = bio;
    if (city !== undefined) data.city = city;
    if (visibility !== undefined) {
      if (!VISIBILITIES.includes(visibility)) return bad(res, 400, `Invalid visibility.`);
      data.visibility = visibility;
    }
    if (verificationStatus !== undefined) {
      if (!VERIFICATION_STATUSES.includes(verificationStatus)) return bad(res, 400, 'Invalid verificationStatus.');
      data.verificationStatus = verificationStatus;
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

export default router;
