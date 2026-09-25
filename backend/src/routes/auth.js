import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, bad } from '../lib/http.js';

const router = Router();

const STAKEHOLDER_TYPES = ['PERFORMER', 'VENUE', 'BUYER', 'CREW', 'INSTITUTION'];

// ---------------------------------------------------------------------------
// POST /api/auth/dev-login   { name, stakeholderType? }
// DEV-ONLY placeholder: finds a user by name or creates one, and returns a
// mock token "dev-<userId>". Phase 2: replace with a real login that issues
// a signed JWT (see src/middleware/auth.js).
// ---------------------------------------------------------------------------
router.post(
  '/dev-login',
  asyncHandler(async (req, res) => {
    const { name, stakeholderType } = req.body ?? {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return bad(res, 400, 'Field "name" is required.');
    }

    const type =
      typeof stakeholderType === 'string' && STAKEHOLDER_TYPES.includes(stakeholderType)
        ? stakeholderType
        : 'PERFORMER';

    let user = await prisma.user.findFirst({ where: { name: name.trim() } });
    if (!user) {
      user = await prisma.user.create({
        data: { name: name.trim(), stakeholderType: type },
      });
    }

    res.json({
      token: `dev-${user.id}`,
      tokenType: 'Bearer',
      user,
      note: 'DEV-ONLY token. Send as `Authorization: Bearer dev-<userId>`. Phase 2 replaces this with a real JWT.',
    });
  })
);

export default router;
