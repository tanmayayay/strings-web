import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth.js';
import profilesRouter from './routes/profiles.js';
import postsRouter from './routes/posts.js';
import opportunitiesRouter from './routes/opportunities.js';
import bookingsRouter from './routes/bookings.js';
import directoryRouter from './routes/directory.js';
import messagesRouter from './routes/messages.js';
import notificationsRouter from './routes/notifications.js';
import tracksRouter from './routes/tracks.js';
import groupsRouter from './routes/groups.js';
import newsRouter from './routes/news.js';
import { isSupabaseMode, isSet } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Warn loudly on half-configured Supabase: exactly one of the two set means
// the founder probably forgot the other (see backend/SUPABASE_SETUP.md).
// (Placeholder values like "<ref>" from .env.example count as unset.)
const hasUrl = isSet(process.env.SUPABASE_URL);
const hasSecret = isSet(process.env.SUPABASE_JWT_SECRET);
if (hasUrl !== hasSecret) {
  console.warn(
    '[strings-backend] WARNING: only one of SUPABASE_URL / SUPABASE_JWT_SECRET is set — ' +
    'running in DEV mock-auth mode. Set both to require real Supabase JWTs.'
  );
}
console.log(
  `[strings-backend] auth mode: ${isSupabaseMode ? 'SUPABASE (real JWTs required)' : 'DEV-ONLY mock (set SUPABASE_URL + SUPABASE_JWT_SECRET to switch)'}`
);

// In production set FRONTEND_URL to the deployed web origin(s),
// comma-separated — e.g. FRONTEND_URL=https://tanmayayay.github.io
// When unset (local dev), all origins are allowed as before.
if (process.env.FRONTEND_URL) {
  const origins = process.env.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({ origin: origins }));
} else {
  app.use(cors());
}
app.use(express.json({ limit: '1mb' }));

// Health — no auth, used by uptime checks and the smoke test.
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'strings-backend',
    version: '0.1.0',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/posts', postsRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api', directoryRouter); // /api/venues, /api/events, /api/articles
app.use('/api/conversations', messagesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/news', newsRouter);

// 404 for unknown /api routes.
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// Central error handler — never leaks stack traces to clients.
app.use((err, req, res, _next) => {
  console.error('[api-error]', err);
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

app.listen(PORT, () => {
  console.log(`[strings-backend] listening on http://localhost:${PORT}`);
});
