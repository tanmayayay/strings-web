// ---------------------------------------------------------------------------
// Strings auth middleware — Supabase JWT verification with a dev-only fallback.
//
// SUPABASE MODE (SUPABASE_URL + SUPABASE_JWT_SECRET are both set):
//   Expects `Authorization: Bearer <supabase-access-token>`.
//   Supabase projects sign access tokens with ES256 (asymmetric, newer
//   projects) or HS256 (shared secret, older projects) — we support both,
//   picking the verifier from the token's own `alg` header:
//     - ES256 → verified against the project's public JWKS
//       (<supabase-url>/auth/v1/.well-known/jwks.json), fetched once then cached.
//     - HS256 → verified locally with SUPABASE_JWT_SECRET.
//   The JWT `sub` claim is the Supabase auth user id; it is mapped to our
//   Prisma User via User.authId, auto-provisioning a minimal profile on first
//   sight. Sets req.user = { id, authId, email }. Anything else -> 401 JSON.
//
// DEV-ONLY FALLBACK (Supabase env vars NOT set):
//   Accepts the old `Bearer dev-<userId>` placeholder tokens so local frontend
//   work can continue before a Supabase project exists. Sets req.user = { id }.
//   This path is NEVER active in Supabase mode — dev tokens are rejected there.
//
// Contract for routes (unchanged): req.user.id is always the Prisma User id,
// 401 JSON on failure.
// ---------------------------------------------------------------------------

import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';

// A value counts as "set" only if it is non-empty AND not still a template
// placeholder (e.g. "<ref>", "<password>") from .env.example. This keeps a
// fresh `cp .env.example .env` in dev mock-auth mode instead of tripping the
// half-configured warning.
export function isSet(v) {
  return typeof v === 'string' && v.trim() !== '' && !/[<>]/.test(v);
}

// True once the founder has wired a real Supabase project (see
// backend/SUPABASE_SETUP.md). Both must be set; one without the other is a
// misconfiguration and counts as "not configured".
export const isSupabaseMode = isSet(process.env.SUPABASE_URL) && isSet(process.env.SUPABASE_JWT_SECRET);

function unauthorized(res, message, hint) {
  return res.status(401).json({
    error: message,
    ...(hint ? { hint } : {}),
  });
}

// Base Supabase URL with no `/rest/v1` suffix and no trailing slash.
function supabaseBaseUrl() {
  return (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

// Remote JWKS for ES256-signed tokens (the default on new Supabase projects).
// Fetched lazily on first verification, then cached by jose.
let _jwks = null;
function getJWKS() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', supabaseBaseUrl() + '/'));
  }
  return _jwks;
}

// Verify a Supabase access token — ES256 (via the project's JWKS) or HS256
// (via SUPABASE_JWT_SECRET), chosen from the token's `alg` header.
// Throws on bad signature, expiry, wrong audience/issuer, or missing `sub`.
export async function verifySupabaseToken(token) {
  const { alg } = decodeProtectedHeader(token);
  let key;
  if (alg === 'ES256') {
    key = getJWKS();
  } else if (alg === 'HS256') {
    if (!isSet(process.env.SUPABASE_JWT_SECRET)) {
      throw new Error('SUPABASE_JWT_SECRET is not set (required for HS256 tokens)');
    }
    key = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
  } else {
    throw new Error(`Unsupported token algorithm: ${alg}`);
  }
  const { payload } = await jwtVerify(token, key, {
    audience: 'authenticated', // Supabase signs access tokens with aud=authenticated
    issuer: `${supabaseBaseUrl()}/auth/v1`,
  });
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Token has no sub claim');
  }
  return payload;
}

// Map a verified Supabase identity to our Prisma User, creating a minimal
// profile on first sight (the "claim your profile" flow enriches it later).
export async function getOrCreateUser(payload) {
  const authId = payload.sub;
  let user = await prisma.user.findUnique({ where: { authId } });
  if (user) return user;

  const meta = payload.user_metadata ?? {};
  const email = typeof payload.email === 'string' ? payload.email : null;
  user = await prisma.user.create({
    data: {
      authId,
      name:
        meta.name ||
        meta.full_name ||
        (email ? email.split('@')[0] : null) ||
        'Strings user',
      stakeholderType: 'PERFORMER', // default; user picks their real type in onboarding
      bio: typeof meta.bio === 'string' ? meta.bio : null,
      city: typeof meta.city === 'string' ? meta.city : null,
    },
  });
  return user;
}

export const auth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = /^Bearer\s+(\S+)$/.exec(header)?.[1];

  if (!token) {
    return unauthorized(
      res,
      'Unauthorized: send `Authorization: Bearer <token>`.',
      isSupabaseMode
        ? 'Sign in via Supabase Auth and send the access token.'
        : 'Dev mode: get a token from POST /api/auth/dev-login. Set SUPABASE_URL + SUPABASE_JWT_SECRET to require real Supabase JWTs.'
    );
  }

  // ---- Supabase mode: real JWTs only ----
  if (isSupabaseMode) {
    let payload;
    try {
      payload = await verifySupabaseToken(token);
    } catch {
      return unauthorized(res, 'Invalid or expired token.', 'Sign in again via Supabase Auth to get a fresh access token.');
    }
    const user = await getOrCreateUser(payload);
    req.user = { id: user.id, authId: user.authId, email: payload.email ?? null };
    return next();
  }

  // ---- DEV-ONLY fallback: mock tokens (Supabase not configured) ----
  if (!token.startsWith('dev-')) {
    return unauthorized(
      res,
      'Unauthorized: send `Authorization: Bearer dev-<userId>` from POST /api/auth/dev-login.',
      'Dev placeholder auth — set SUPABASE_URL + SUPABASE_JWT_SECRET (see SUPABASE_SETUP.md) to switch to real Supabase JWTs.'
    );
  }
  req.user = { id: token.slice('dev-'.length) };
  next();
});
