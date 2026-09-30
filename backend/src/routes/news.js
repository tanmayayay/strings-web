import { Router } from 'express';
import Parser from 'rss-parser';
import { asyncHandler } from '../lib/http.js';

const router = Router();

// Public live music-news feed. Google News RSS needs no API key.
// Cached for 6h; refresh happens on request (not on a timer) so it keeps
// working even when the host sleeps between requests.

const parser = new Parser({ timeout: 15000 });

const FEEDS = [
  {
    url: 'https://news.google.com/rss/search?q=music%20industry&hl=en-IN&gl=IN&ceid=IN%3Aen',
    source: 'Music industry',
  },
  {
    url: 'https://news.google.com/rss/search?q=indian%20musicians&hl=en-IN&gl=IN&ceid=IN%3Aen',
    source: 'Artists',
  },
  {
    url: 'https://news.google.com/rss/search?q=concerts%20live%20music%20india&hl=en-IN&gl=IN&ceid=IN%3Aen',
    source: 'Live music',
  },
];

const TTL_MS = 6 * 3600 * 1000;
const MAX_ITEMS = 30;

let cache = { updatedAt: 0, items: [] };

function toISO(pubDate) {
  if (!pubDate) return null;
  const t = Date.parse(pubDate);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

async function fetchFeed(feed) {
  const parsed = await parser.parseURL(feed.url);
  return (parsed.items || [])
    .map((it) => ({
      id: it.guid || it.link,
      title: it.title,
      url: it.link,
      source: feed.source,
      publishedAt: toISO(it.pubDate),
    }))
    .filter((it) => it.title && it.url);
}

async function refresh() {
  // allSettled: one dead feed must not kill the others.
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const merged = [];
  for (const r of results) {
    if (r.status === 'fulfilled') merged.push(...r.value);
  }
  const seen = new Set();
  const items = merged
    .filter((it) => {
      if (seen.has(it.url)) return false;
      seen.add(it.url);
      return true;
    })
    .sort((a, b) => {
      if (!a.publishedAt && !b.publishedAt) return 0;
      if (!a.publishedAt) return 1;
      if (!b.publishedAt) return -1;
      return b.publishedAt.localeCompare(a.publishedAt);
    })
    .slice(0, MAX_ITEMS);
  cache = { updatedAt: Date.now(), items };
}

// GET /api/news/live — public.
router.get(
  '/live',
  asyncHandler(async (req, res) => {
    if (Date.now() - cache.updatedAt > TTL_MS || cache.items.length === 0) {
      try {
        await refresh();
      } catch {
        // Keep serving the stale cache on failure.
      }
    }
    res.json({
      updatedAt: cache.updatedAt ? new Date(cache.updatedAt).toISOString() : null,
      items: cache.items,
    });
  })
);

export default router;
