// News from Rolling Stone India RSS (plus optional fallback feeds).
// Usage: node fetch-news.mjs -> returns articles array (also writes src/data/live/news.json)
import { fetchWithRetry, sleep, cacheGet, cacheSet, dedupe, writeOutput, stripHtml, toISODate } from "./normalize.mjs";

const CACHE_KEY = "news";
const CACHE_TTL_MS = 6 * 3600 * 1000; // 6h

const FEEDS = [
  { url: "https://rollingstoneindia.com/feed/", source: "Rolling Stone India" },
  // Best-effort alternates — a dead feed must not fail the run.
  { url: "https://www.thehindu.com/entertainment/feeder/default.rss", source: "The Hindu Entertainment" },
  { url: "https://indianexpress.com/section/entertainment/feed/", source: "Indian Express Entertainment" },
];

const EXCERPT_LEN = 220;
const MAX_PER_FEED = 50; // keep the output file a sane size

function itemId(item, source) {
  const guid = (item.guid || "").trim();
  if (guid) return `rsi-${slugify(guid)}`;
  return `rsi-${slugify(item.link || item.title || "")}`;
}

function slugify(s) {
  return stripHtml(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `item-${Date.now()}`;
}

function pickImage(itemXml) {
  const m =
    itemXml.match(/<media:content[^>]*url="([^"]+)"/i) ||
    itemXml.match(/<media:thumbnail[^>]*url="([^"]+)"/i) ||
    itemXml.match(/<enclosure[^>]*url="([^"]+)"/i);
  return m ? m[1] : "";
}

function getTag(itemXml, tag) {
  const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

/** Minimal RSS 2.0 item parser via regex + CDATA handling. */
function parseRss(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const b of blocks) {
    items.push({
      title: stripHtml(getTag(b, "title")),
      link: stripHtml(getTag(b, "link")),
      guid: stripHtml(getTag(b, "guid")),
      pubDate: stripHtml(getTag(b, "pubDate") || getTag(b, "dc:date")),
      description: stripHtml(getTag(b, "description") || getTag(b, "content:encoded")),
      image: pickImage(b),
    });
  }
  return items;
}

function toArticle(item, sourceName) {
  const excerpt = item.description.slice(0, EXCERPT_LEN) + (item.description.length > EXCERPT_LEN ? "…" : "");
  return {
    id: itemId(item, sourceName),
    title: item.title,
    excerpt,
    url: item.link,
    published_at: toISODate(item.pubDate),
    source: sourceName,
    image: item.image || "",
  };
}

async function fetchFeed(feed, notes) {
  try {
    const res = await fetchWithRetry(feed.url, { timeoutMs: 20000, retries: 2 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseRss(xml)
      .filter((i) => i.title && i.link && i.description) // skip description-less items
      .slice(0, MAX_PER_FEED)
      .map((i) => toArticle(i, feed.source));
    console.log(`[news] ${feed.source}: ${items.length} articles`);
    return items;
  } catch (err) {
    const msg = `${feed.source} skipped: ${err.message}`;
    notes.push(msg);
    console.warn(`[news] ${msg}`);
    return [];
  }
}

export async function fetchNews(notes = []) {
  const cached = await cacheGet(CACHE_KEY, CACHE_TTL_MS);
  if (cached) {
    console.log(`[news] using cache (${cached.articles.length} articles)`);
    return { articles: cached.articles, notes: cached.notes };
  }
  const all = [];
  for (const feed of FEEDS) {
    const items = await fetchFeed(feed, notes);
    all.push(...items);
    await sleep(800);
  }
  if (!all.length) {
    notes.push("no news items from any feed");
    console.warn("[news] no items from any feed");
  }
  const articles = dedupe(all, (a) => a.url || a.id);
  await cacheSet(CACHE_KEY, { articles, notes });
  return { articles, notes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { ensureDirs } = await import("./normalize.mjs");
  await ensureDirs();
  const { articles } = await fetchNews([]);
  await writeOutput("news.json", articles);
  console.log(`[news] wrote ${articles.length} articles`);
}
