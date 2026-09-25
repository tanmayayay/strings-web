import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, pagination } from '../lib/http.js';

// Read-only directory endpoints: venues, events, articles.
// No auth needed — this is the public discovery surface.
const router = Router();

// GET /api/venues?city=Mumbai&search=frog&type=live_music_venue&take=20&skip=0
router.get(
  '/venues',
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const where = {};
    if (req.query.city) where.city = req.query.city;
    if (req.query.type) where.type = req.query.type;
    if (req.query.search) where.name = { contains: req.query.search };

    const [items, total] = await Promise.all([
      prisma.venue.findMany({ where, orderBy: { name: 'asc' }, take, skip }),
      prisma.venue.count({ where }),
    ]);

    res.json({ items, total, take, skip });
  })
);

// GET /api/events?city=Mumbai&genre=Sufi&take=20&skip=0 — upcoming first
router.get(
  '/events',
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const where = {};
    if (req.query.city) where.city = req.query.city;
    if (req.query.genre) where.genre = req.query.genre;

    const [items, total] = await Promise.all([
      prisma.event.findMany({ where, orderBy: { date: 'asc' }, take, skip }),
      prisma.event.count({ where }),
    ]);

    res.json({ items, total, take, skip });
  })
);

// GET /api/articles?category=Industry&take=20&skip=0 — newest first
router.get(
  '/articles',
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const where = {};
    if (req.query.category) where.category = req.query.category;

    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: { author: { select: { id: true, name: true } } },
        orderBy: { publishedAt: 'desc' },
        take,
        skip,
      }),
      prisma.article.count({ where }),
    ]);

    res.json({ items, total, take, skip });
  })
);

export default router;
