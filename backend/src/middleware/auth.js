// ---------------------------------------------------------------------------
// PLACEHOLDER AUTH — dev only. NOT production security.
//
// POST /api/auth/dev-login returns a token shaped like "dev-<userId>".
// This middleware accepts `Authorization: Bearer dev-<userId>` and sets
// req.user = { id }. Anything else -> 401.
//
// PHASE 2: replace this with real JWT verification (or an OAuth provider):
//   - dev-login goes away; clients get a signed JWT from the login flow.
//   - this middleware verifies the signature, checks expiry, and loads the
//     user from the DB instead of trusting the token string.
//   - keep the contract: req.user = { id }, 401 JSON on failure, so the
//     routes below don't change.
// ---------------------------------------------------------------------------

export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(\S+)$/.exec(header);
  const token = match?.[1];

  if (!token || !token.startsWith('dev-')) {
    return res.status(401).json({
      error: 'Unauthorized: send `Authorization: Bearer <token>` from POST /api/auth/dev-login.',
      hint: 'Dev placeholder auth — Phase 2 will accept real JWTs here.',
    });
  }

  req.user = { id: token.slice('dev-'.length) };
  next();
}
