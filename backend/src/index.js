import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth.js';
import profilesRouter from './routes/profiles.js';
import postsRouter from './routes/posts.js';
import opportunitiesRouter from './routes/opportunities.js';
import bookingsRouter from './routes/bookings.js';
import directoryRouter from './routes/directory.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
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
