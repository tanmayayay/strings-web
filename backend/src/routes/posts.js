import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, pagination } from '../lib/http.js';

const router = Router();

const POST_VISIBILITIES = ['PUBLIC', 'CONNECTIONS'];

const authorSelect = {
  id: true,
  name: true,
  stakeholderType: true,
  city: true,
  verificationStatus: true,
};

// GET /api/posts?authorId=&take=20&skip=0  — newest first
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const where = {};
    if (req.query.authorId) where.authorId = req.query.authorId;

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: authorSelect },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ items, total, take, skip });
  })
);

// POST /api/posts  (auth)
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { body, mediaUrl, visibility } = req.body ?? {};

    if (!body || typeof body !== 'string' || !body.trim()) {
      return bad(res, 400, 'Field "body" is required.');
    }
    if (visibility !== undefined && !POST_VISIBILITIES.includes(visibility)) {
      return bad(res, 400, `Field "visibility" must be one of: ${POST_VISIBILITIES.join(', ')}`);
    }

    const post = await prisma.post.create({
      data: {
        authorId: req.user.id,
        body: body.trim(),
        mediaUrl: mediaUrl ?? null,
        visibility: visibility ?? 'PUBLIC',
      },
      include: { author: { select: authorSelect } },
    });

    res.status(201).json(post);
  })
);

// GET /api/posts/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!post) return notFound(res, 'Post');
    res.json(post);
  })
);

// POST /api/posts/:id/like  (auth) — idempotent-ish: 409 if already liked
router.post(
  '/:id/like',
  auth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return notFound(res, 'Post');

    try {
      await prisma.like.create({
        data: { postId: post.id, userId: req.user.id },
      });
      res.status(201).json({ liked: true, postId: post.id });
    } catch {
      return bad(res, 409, 'You already liked this post.');
    }
  })
);

// DELETE /api/posts/:id/like  (auth) — unlike
router.delete(
  '/:id/like',
  auth,
  asyncHandler(async (req, res) => {
    const result = await prisma.like.deleteMany({
      where: { postId: req.params.id, userId: req.user.id },
    });
    if (result.count === 0) return bad(res, 404, 'Like not found.');
    res.json({ liked: false, postId: req.params.id });
  })
);

// GET /api/posts/:id/comments
router.get(
  '/:id/comments',
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return notFound(res, 'Post');

    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId: post.id },
        include: { author: { select: authorSelect } },
        orderBy: { createdAt: 'asc' },
        take,
        skip,
      }),
      prisma.comment.count({ where: { postId: post.id } }),
    ]);

    res.json({ items, total, take, skip });
  })
);

// POST /api/posts/:id/comments  (auth)
router.post(
  '/:id/comments',
  auth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return notFound(res, 'Post');

    const { body } = req.body ?? {};
    if (!body || typeof body !== 'string' || !body.trim()) {
      return bad(res, 400, 'Field "body" is required.');
    }

    const comment = await prisma.comment.create({
      data: { postId: post.id, authorId: req.user.id, body: body.trim() },
      include: { author: { select: authorSelect } },
    });

    res.status(201).json(comment);
  })
);

export default router;
