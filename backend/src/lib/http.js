// Shared HTTP helpers.

// Wrap async route handlers so rejections reach the Express error handler.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Parse ?take= / ?skip= with sane defaults and a hard cap.
export function pagination(req) {
  let take = parseInt(req.query.take ?? '20', 10);
  let skip = parseInt(req.query.skip ?? '0', 10);
  if (Number.isNaN(take) || take < 1) take = 20;
  if (Number.isNaN(skip) || skip < 0) skip = 0;
  return { take: Math.min(take, 100), skip };
}

// Consistent error payload.
export function bad(res, code, message, details) {
  return res.status(code).json({ error: message, ...(details ? { details } : {}) });
}

// 404 for a missing record, e.g. `if (!post) return notFound(res, 'Post')`.
export function notFound(res, what = 'Resource') {
  return bad(res, 404, `${what} not found`);
}

// Build a Prisma `where` from optional exact-match query params.
export function exactWhere(query, fields) {
  const where = {};
  for (const f of fields) {
    if (query[f] !== undefined && query[f] !== '') where[f] = query[f];
  }
  return where;
}
