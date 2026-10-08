import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, pagination, tooLong } from '../lib/http.js';
import { notify } from '../lib/notify.js';

const router = Router();

const IST_MS = 5.5 * 3600 * 1000;
const todayIST = () => new Date(Date.now() + IST_MS).toISOString().slice(0, 10);

const reviewerSelect = { id: true, name: true, avatarUrl: true, stakeholderType: true };

// GET /api/reviews?userId=  (public) — reviews about a person + their average.
router.get('/', asyncHandler(async (req, res) => {
  const userId = String(req.query.userId || '');
  if (!userId) return bad(res, 400, 'Query "userId" is required.');
  const { take, skip } = pagination(req);
  const [items, agg] = await Promise.all([
    prisma.review.findMany({ where: { revieweeId: userId }, orderBy: { createdAt: 'desc' }, take, skip, include: { reviewer: { select: reviewerSelect } } }),
    prisma.review.aggregate({ where: { revieweeId: userId }, _avg: { rating: true }, _count: { _all: true } }),
  ]);
  res.json({ items, average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null, count: agg._count._all });
}));

// GET /api/reviews/pending  (auth) — confirmed gigs whose date has come that I haven't reviewed yet.
router.get('/pending', auth, asyncHandler(async (req, res) => {
  const me = req.user.id;
  const bookings = await prisma.booking.findMany({
    where: { status: 'CONFIRMED', date: { lte: todayIST() }, OR: [{ requesterId: me }, { hostId: me }] },
    orderBy: { date: 'desc' },
    take: 20,
    include: { requester: { select: reviewerSelect }, host: { select: reviewerSelect } },
  });
  if (!bookings.length) return res.json({ items: [] });
  const done = await prisma.review.findMany({ where: { reviewerId: me, bookingId: { in: bookings.map((b) => b.id) } }, select: { bookingId: true } });
  const doneSet = new Set(done.map((d) => d.bookingId));
  res.json({
    items: bookings.filter((b) => !doneSet.has(b.id)).map((b) => ({
      bookingId: b.id,
      date: b.date,
      timeSlot: b.timeSlot,
      person: b.requesterId === me ? b.host : b.requester,
    })),
  });
}));

// POST /api/reviews  (auth)  { bookingId, rating, body? }
// Only the two people on a CONFIRMED booking, once the date has arrived, one review each.
router.post('/', auth, asyncHandler(async (req, res) => {
  const { bookingId, rating, body } = req.body ?? {};
  if (typeof bookingId !== 'string' || !bookingId) return bad(res, 400, 'Field "bookingId" is required.');
  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return bad(res, 400, 'Field "rating" must be a whole number from 1 to 5.');
  const long = tooLong(body, 800, 'body');
  if (long) return bad(res, 400, long);

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return notFound(res, 'Booking');
  const me = req.user.id;
  if (booking.requesterId !== me && booking.hostId !== me) return bad(res, 403, 'This booking is not yours.');
  if (booking.status !== 'CONFIRMED') return bad(res, 400, 'You can review a booking once it is confirmed.');
  if (booking.date.slice(0, 10) > todayIST()) return bad(res, 400, 'You can leave a review once the gig date has arrived.');

  const revieweeId = booking.requesterId === me ? booking.hostId : booking.requesterId;
  try {
    const review = await prisma.review.create({
      data: { bookingId, reviewerId: me, revieweeId, rating: stars, body: typeof body === 'string' && body.trim() ? body.trim() : null },
      include: { reviewer: { select: reviewerSelect } },
    });
    notify(revieweeId, {
      type: 'review',
      title: `New ${stars}★ review`,
      body: `${review.reviewer.name} reviewed your gig.`,
      link: `/profile/${revieweeId}?tab=reviews`,
      from: me,
      email: { subject: `${review.reviewer.name} left you a ${stars}★ review`, cta: 'Read the review' },
    });
    res.status(201).json(review);
  } catch (e) {
    if (e?.code === 'P2002') return bad(res, 409, 'You already reviewed this gig.');
    throw e;
  }
}));

export default router;
