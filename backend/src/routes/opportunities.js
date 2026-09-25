import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, pagination } from '../lib/http.js';

const router = Router();

const OPP_STATUSES = ['OPEN', 'CLOSED'];

const posterSelect = {
  id: true,
  name: true,
  stakeholderType: true,
  city: true,
  verificationStatus: true,
};

// GET /api/opportunities?status=OPEN&city=Mumbai&genre=&take=20&skip=0
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const where = {};
    if (req.query.status) {
      if (!OPP_STATUSES.includes(req.query.status)) {
        return bad(res, 400, `Invalid status. One of: ${OPP_STATUSES.join(', ')}`);
      }
      where.status = req.query.status;
    }
    if (req.query.city) where.city = req.query.city;
    if (req.query.genre) where.genre = req.query.genre;

    const [items, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        include: {
          poster: { select: posterSelect },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.opportunity.count({ where }),
    ]);

    res.json({ items, total, take, skip });
  })
);

// POST /api/opportunities  (auth)
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { title, description, requirements, city, genre, budgetMin, budgetMax } = req.body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return bad(res, 400, 'Field "title" is required.');
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return bad(res, 400, 'Field "description" is required.');
    }
    if (budgetMin !== undefined && budgetMax !== undefined && budgetMin > budgetMax) {
      return bad(res, 400, 'budgetMin cannot be greater than budgetMax.');
    }

    const opp = await prisma.opportunity.create({
      data: {
        posterId: req.user.id,
        title: title.trim(),
        description: description.trim(),
        requirements: requirements ?? null,
        city: city ?? null,
        genre: genre ?? null,
        budgetMin: budgetMin ?? null,
        budgetMax: budgetMax ?? null,
      },
      include: { poster: { select: posterSelect } },
    });

    res.status(201).json(opp);
  })
);

// GET /api/opportunities/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const opp = await prisma.opportunity.findUnique({
      where: { id: req.params.id },
      include: {
        poster: { select: posterSelect },
        _count: { select: { applications: true } },
      },
    });
    if (!opp) return notFound(res, 'Opportunity');
    res.json(opp);
  })
);

// POST /api/opportunities/:id/apply  (auth)  { message? }
router.post(
  '/:id/apply',
  auth,
  asyncHandler(async (req, res) => {
    const opp = await prisma.opportunity.findUnique({ where: { id: req.params.id } });
    if (!opp) return notFound(res, 'Opportunity');
    if (opp.status !== 'OPEN') return bad(res, 400, 'This opportunity is closed.');
    if (opp.posterId === req.user.id) return bad(res, 400, 'You cannot apply to your own opportunity.');

    try {
      const application = await prisma.application.create({
        data: {
          opportunityId: opp.id,
          applicantId: req.user.id,
          message: req.body?.message ?? null,
        },
        include: { applicant: { select: posterSelect } },
      });
      res.status(201).json(application);
    } catch {
      return bad(res, 409, 'You have already applied to this opportunity.');
    }
  })
);

// GET /api/opportunities/:id/applications  (auth, poster only)
router.get(
  '/:id/applications',
  auth,
  asyncHandler(async (req, res) => {
    const opp = await prisma.opportunity.findUnique({ where: { id: req.params.id } });
    if (!opp) return notFound(res, 'Opportunity');
    if (opp.posterId !== req.user.id) {
      return bad(res, 403, 'Only the poster can view applications.');
    }

    const { take, skip } = pagination(req);
    const [items, total] = await Promise.all([
      prisma.application.findMany({
        where: { opportunityId: opp.id },
        include: { applicant: { select: posterSelect } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.application.count({ where: { opportunityId: opp.id } }),
    ]);

    res.json({ items, total, take, skip });
  })
);

export default router;
