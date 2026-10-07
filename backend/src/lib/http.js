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

// Photos must come from our own Supabase Storage (not arbitrary third-party URLs,
// which could be tracking pixels or malicious hosts). Dev without Supabase: any https URL.
export function isOwnMediaUrl(url) {
  if (typeof url !== 'string' || url.length > 1000 || !/^https:\/\//.test(url)) return false;
  const base = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  if (!/^https:\/\//.test(base)) return true;
  return url.startsWith(`${base}/storage/v1/object/public/`);
}

// Max length of a string field; returns an error message or null.
export function tooLong(value, max, field) {
  return typeof value === 'string' && value.length > max ? `Field "${field}" must be at most ${max} characters.` : null;
}

// JSON blobs (profile "detail") are capped so nobody can park megabytes in a row.
export function jsonTooBig(value, maxBytes = 10_000) {
  try { return JSON.stringify(value).length > maxBytes; } catch { return true; }
}
