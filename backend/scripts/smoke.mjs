// Smoke test: new backend routes with two real Supabase Auth users.
// Creates A + B via the Admin API (email auto-confirmed), runs the multi-user
// flows, then deletes both the Supabase Auth users AND their Prisma rows
// (Prisma relations all cascade, so one deleteMany cleans everything).
//
// Run from backend/:   set -a; source .env; set +a; node scripts/smoke.mjs
import { setTimeout as sleep } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const API = (process.env.API_URL || 'http://localhost:4000').replace(/\/+$/, '');

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in env.');
  process.exit(2);
}

const stamp = Date.now().toString(36);
const users = [
  { email: `smoke-a-${stamp}@example.com`, password: 'SmokeTest!123', name: 'Smoke Alice' },
  { email: `smoke-b-${stamp}@example.com`, password: 'SmokeTest!123', name: 'Smoke Bob' },
];

async function req(url, { method = 'GET', token, service = false, body } = {}) {
  const key = service ? SERVICE_KEY : ANON_KEY;
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (service) headers.Authorization = `Bearer ${SERVICE_KEY}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

const results = [];
function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const createdIds = [];
try {
  // 1. Create + confirm two users via Admin API
  for (const u of users) {
    const r = await req(`${SUPABASE_URL}/auth/v1/admin/users`, {
      service: true, method: 'POST',
      body: { email: u.email, password: u.password, email_confirm: true, user_metadata: { name: u.name } },
    });
    if (r.status !== 200 && r.status !== 201) throw new Error(`admin create failed: ${r.status} ${r.text}`);
    createdIds.push(r.json.id);
    // sign in to get access token
    const s = await req(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST', body: { email: u.email, password: u.password },
    });
    if (s.status !== 200) throw new Error(`sign-in failed: ${s.status} ${s.text}`);
    u.token = s.json.access_token;
  }
  const [A, B] = users;
  const api = (path, opts = {}) => req(`${API}${path}`, opts);

  // 2. /api/profiles/me auto-provisions
  let r = await api('/api/profiles/me', { token: A.token });
  check('A /profiles/me provisions (200)', r.status === 200, `status=${r.status}`);
  const aId = r.json?.id;
  r = await api('/api/profiles/me', { token: B.token });
  check('B /profiles/me provisions (200)', r.status === 200);
  const bId = r.json?.id;

  // give them names via PATCH (owner)
  await api(`/api/profiles/${aId}`, { token: A.token, method: 'PATCH', body: { name: 'Smoke Alice', stakeholderType: 'PERFORMER', city: 'Mumbai' } });
  await api(`/api/profiles/${bId}`, { token: B.token, method: 'PATCH', body: { name: 'Smoke Bob', stakeholderType: 'VENUE', city: 'Mumbai' } });

  // 3. Follow
  r = await api(`/api/profiles/${bId}/follow`, { token: A.token, method: 'POST' });
  check('A follows B (200/201)', r.status === 200 || r.status === 201, `status=${r.status}`);
  r = await api(`/api/profiles/${bId}/follow`, { token: A.token, method: 'POST' });
  check('duplicate follow is idempotent', r.status === 200 || r.status === 201, `status=${r.status}`);

  // 4. B posts an opportunity; A applies; B shortlists
  r = await api('/api/opportunities', { token: B.token, method: 'POST', body: { title: 'Smoke gig', description: 'Test gig', city: 'Mumbai', genre: 'Jazz' } });
  check('B creates opportunity (201)', r.status === 201, `status=${r.status}`);
  const oppId = r.json?.id;
  r = await api(`/api/opportunities/${oppId}/apply`, { token: A.token, method: 'POST', body: { message: 'I play sax' } });
  check('A applies (201)', r.status === 201, `status=${r.status}`);
  const appId = r.json?.id;
  r = await api(`/api/opportunities/${oppId}/apply`, { token: A.token, method: 'POST', body: {} });
  check('duplicate apply → 409', r.status === 409, `status=${r.status}`);
  r = await api(`/api/opportunities/${oppId}/applications`, { token: B.token });
  check('B lists applications (200, 1 item)', r.status === 200 && r.json?.items?.length === 1, `status=${r.status} items=${r.json?.items?.length}`);
  r = await api(`/api/opportunities/applications/${appId}`, { token: B.token, method: 'PATCH', body: { status: 'SHORTLISTED' } });
  check('B shortlists A (200)', r.status === 200, `status=${r.status} ${r.text?.slice(0, 80)}`);
  r = await api(`/api/opportunities/applications/${appId}`, { token: A.token, method: 'PATCH', body: { status: 'REJECTED' } });
  check('A cannot change status (403)', r.status === 403, `status=${r.status}`);

  // 5. Messaging: A opens convo with B, sends; B reads
  r = await api('/api/conversations', { token: A.token, method: 'POST', body: { userId: bId } });
  check('A opens convo with B (200/201)', (r.status === 200 || r.status === 201) && !!r.json?.id, `status=${r.status}`);
  const convoId = r.json?.id;
  r = await api(`/api/conversations/${convoId}/messages`, { token: A.token, method: 'POST', body: { body: 'Hey Bob, smoke test!' } });
  check('A sends message (201)', r.status === 201, `status=${r.status}`);
  r = await api('/api/conversations', { token: B.token });
  check('B lists convos (200, 1 convo)', r.status === 200 && r.json?.items?.length === 1, `status=${r.status} items=${r.json?.items?.length}`);
  r = await api(`/api/conversations/${convoId}/messages`, { token: B.token });
  check('B reads messages (200, 1 msg)', r.status === 200 && r.json?.items?.length === 1 && r.json.items[0].body === 'Hey Bob, smoke test!', `status=${r.status}`);

  // 6. Notifications: B should have follow + message + application notifs
  r = await api('/api/notifications', { token: B.token });
  const types = (r.json?.items || []).map((n) => n.type);
  check('B has notifications (follow/message/application)', r.status === 200 && types.includes('follow') && types.includes('message') && types.includes('application'), `types=${types.join(',')}`);
  r = await api('/api/notifications/read', { token: B.token, method: 'POST', body: {} });
  check('B marks all read (200)', r.status === 200, `status=${r.status}`);
  r = await api('/api/notifications?unread=true', { token: B.token });
  check('B unread count is 0', r.status === 200 && r.json?.unreadCount === 0, `unreadCount=${r.json?.unreadCount}`);

  // 7. Bookings: A requests, B confirms
  r = await api('/api/bookings', { token: A.token, method: 'POST', body: { hostId: bId, date: new Date(Date.now() + 86400000).toISOString(), timeSlot: 'Evening', budget: '₹5k', message: 'Smoke booking' } });
  check('A creates booking (201)', r.status === 201, `status=${r.status} ${r.text?.slice(0, 80)}`);
  const bookingId = r.json?.id;
  r = await api(`/api/bookings/${bookingId}`, { token: B.token, method: 'PATCH', body: { status: 'CONFIRMED' } });
  check('B confirms booking (200)', r.status === 200, `status=${r.status}`);
  r = await api('/api/bookings?role=host', { token: B.token });
  check('B sees booking as host', r.status === 200 && r.json?.items?.length === 1, `items=${r.json?.items?.length}`);

  // 8. Negative: no token → 401
  r = await api('/api/conversations');
  check('no token → 401', r.status === 401, `status=${r.status}`);
} finally {
  // cleanup: Prisma rows first (all relations cascade), then the Auth users.
  if (createdIds.length) {
    try {
      const prisma = new PrismaClient();
      const del = await prisma.user.deleteMany({ where: { authId: { in: createdIds } } });
      await prisma.$disconnect();
      console.log(`cleaned up ${del.count} Prisma test users (cascaded)`);
    } catch (e) {
      console.log(`Prisma cleanup failed: ${e.message}`);
    }
    for (const id of createdIds) {
      await req(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { service: true, method: 'DELETE' });
    }
    console.log(`deleted ${createdIds.length} Supabase Auth test users`);
  }
}

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
