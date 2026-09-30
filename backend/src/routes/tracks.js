import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, pagination } from '../lib/http.js';

const router = Router();

const TRACK_KINDS = ['TRACK', 'BEAT', 'SAMPLE'];

const uploaderSelect = {
  id: true,
  name: true,
  stakeholderType: true,
  city: true,
  verificationStatus: true,
};

const trackInclude = {
  uploader: { select: uploaderSelect },
  _count: { select: { likes: true } },
};

async function likedSet(trackIds, userId) {
  if (trackIds.length === 0) return new Set();
  const rows = await prisma.trackLike.findMany({
    where: { trackId: { in: trackIds }, userId },
    select: { trackId: true },
  });
  return new Set(rows.map((r) => r.trackId));
}

// GET /api/tracks?kind=&take=20&skip=0  (auth) — newest first
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const where = {};
    if (req.query.kind) {
      if (!TRACK_KINDS.includes(req.query.kind)) {
        return bad(res, 400, `Field "kind" must be one of: ${TRACK_KINDS.join(', ')}`);
      }
      where.kind = req.query.kind;
    }

    const [items, total] = await Promise.all([
      prisma.track.findMany({
        where,
        include: trackInclude,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.track.count({ where }),
    ]);

    const liked = await likedSet(items.map((t) => t.id), req.user.id);
    res.json({
      items: items.map((t) => ({ ...t, likedByMe: liked.has(t.id) })),
      total,
      take,
      skip,
    });
  })
);

// POST /api/tracks  (auth)
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { title, kind, audioUrl, durationSec } = req.body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return bad(res, 400, 'Field "title" is required.');
    }
    if (!TRACK_KINDS.includes(kind)) {
      return bad(res, 400, `Field "kind" must be one of: ${TRACK_KINDS.join(', ')}`);
    }
    if (!audioUrl || typeof audioUrl !== 'string' || !audioUrl.trim() || !/^https?:\/\//i.test(audioUrl.trim())) {
      return bad(res, 400, 'Field "audioUrl" must be an http(s) URL.');
    }
    let dur = null;
    if (durationSec !== undefined && durationSec !== null) {
      dur = Math.round(Number(durationSec));
      if (!Number.isFinite(dur) || dur < 0) {
        return bad(res, 400, 'Field "durationSec" must be a non-negative number.');
      }
    }

    const track = await prisma.track.create({
      data: {
        uploaderId: req.user.id,
        title: title.trim(),
        kind,
        audioUrl: audioUrl.trim(),
        durationSec: dur,
      },
      include: trackInclude,
    });

    res.status(201).json({ ...track, likedByMe: false });
  })
);

// GET /api/tracks/:id  (auth)
router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const track = await prisma.track.findUnique({
      where: { id: req.params.id },
      include: trackInclude,
    });
    if (!track) return notFound(res, 'Track');

    const liked = await prisma.trackLike.findUnique({
      where: { trackId_userId: { trackId: track.id, userId: req.user.id } },
    });
    res.json({ ...track, likedByMe: !!liked });
  })
);

// DELETE /api/tracks/:id  (auth, owner only)
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const track = await prisma.track.findUnique({
      where: { id: req.params.id },
      select: { id: true, uploaderId: true },
    });
    if (!track) return notFound(res, 'Track');
    if (track.uploaderId !== req.user.id) {
      return bad(res, 403, 'You can only delete your own tracks.');
    }
    // TrackLike rows cascade via the FK.
    await prisma.track.delete({ where: { id: track.id } });
    res.json({ ok: true });
  })
);

// POST /api/tracks/:id/like  (auth) — toggle star
router.post(
  '/:id/like',
  auth,
  asyncHandler(async (req, res) => {
    const track = await prisma.track.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!track) return notFound(res, 'Track');

    const key = { trackId_userId: { trackId: track.id, userId: req.user.id } };
    const existing = await prisma.trackLike.findUnique({ where: key });
    if (existing) {
      await prisma.trackLike.delete({ where: key });
      return res.json({ liked: false, trackId: track.id });
    }
    await prisma.trackLike.create({ data: { trackId: track.id, userId: req.user.id } });
    res.status(201).json({ liked: true, trackId: track.id });
  })
);

export default router;
