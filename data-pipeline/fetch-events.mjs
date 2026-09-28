// Events from Ticketmaster Discovery API and/or Bandsintown API.
// Both require env keys; when absent the pipeline writes [] and logs why.
// Usage: node fetch-events.mjs -> returns events array (also writes src/data/live/events.json)
import { fetchWithRetry, sleep, cacheGet, cacheSet, dedupe, writeOutput, toISODate } from "./normalize.mjs";

const CACHE_KEY = "events";
const CACHE_TTL_MS = 24 * 3600 * 1000; // 24h

const TM_KEY = process.env.TM_API_KEY || "";
const BIT_APP_ID = process.env.BANDSINTOWN_APP_ID || "";
const SEED_ARTISTS = ["Anuv Jain", "Prateek Kuhad", "DIVINE"];

function tmEvents(json) {
  const events = json?._embedded?.events || [];
  return events.map((e) => {
    const venue = e?._embedded?.venues?.[0] || {};
    const img = (e.images || []).sort((a, b) => (b.width || 0) - (a.width || 0))[0];
    return {
      id: `tm-${e.id}`,
      title: e.name || "",
      venue: venue.name || "",
      city: venue.city?.name || "",
      date: toISODate(e.dates?.start?.dateTime),
      genre: e.classifications?.[0]?.genre?.name || "",
      url: e.url || "",
      source: "Ticketmaster",
      image: img?.url || "",
    };
  });
}

async function fetchTicketmaster(notes) {
  if (!TM_KEY) {
    notes.push("Ticketmaster skipped: TM_API_KEY not set");
    console.log("[events] Ticketmaster skipped: TM_API_KEY not set");
    return [];
  }
  const url =
    `https://app.ticketmaster.com/discovery/v2/events.json` +
    `?apikey=${encodeURIComponent(TM_KEY)}&countryCode=IN&classificationName=music&size=50`;
  try {
    const res = await fetchWithRetry(url, { timeoutMs: 20000, retries: 2 });
    if (!res.ok) {
      notes.push(`Ticketmaster skipped: HTTP ${res.status}`);
      console.log(`[events] Ticketmaster skipped: HTTP ${res.status}`);
      return [];
    }
    const events = tmEvents(await res.json());
    console.log(`[events] Ticketmaster: ${events.length} events`);
    return events;
  } catch (err) {
    notes.push(`Ticketmaster skipped: ${err.message}`);
    console.log(`[events] Ticketmaster skipped: ${err.message}`);
    return [];
  }
}

function bitEvents(json, artist) {
  return (Array.isArray(json) ? json : []).map((e) => ({
    id: `bit-${artist.toLowerCase().replace(/\s+/g, "-")}-${e.id || e.datetime}`,
    title: `${artist} live at ${e.venue?.name || "TBA"}`,
    venue: e.venue?.name || "",
    city: e.venue?.city || "",
    date: toISODate(e.datetime),
    genre: "",
    url: e.url || e.offers?.[0]?.url || "",
    source: "Bandsintown",
    image: "",
  }));
}

async function fetchBandsintown(notes) {
  if (!BIT_APP_ID) {
    notes.push("Bandsintown skipped: BANDSINTOWN_APP_ID not set");
    console.log("[events] Bandsintown skipped: BANDSINTOWN_APP_ID not set");
    return [];
  }
  const all = [];
  for (const artist of SEED_ARTISTS) {
    try {
      const url =
        `https://rest.bandsintown.com/artists/${encodeURIComponent(artist)}/events` +
        `?app_id=${encodeURIComponent(BIT_APP_ID)}`;
      const res = await fetchWithRetry(url, { timeoutMs: 20000, retries: 2 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const events = bitEvents(await res.json(), artist);
      console.log(`[events] Bandsintown ${artist}: ${events.length} events`);
      all.push(...events);
    } catch (err) {
      console.warn(`[events] Bandsintown ${artist}: FAILED (${err.message})`);
    }
    await sleep(1000);
  }
  return all;
}

export async function fetchEvents(notes = []) {
  const cached = await cacheGet(CACHE_KEY, CACHE_TTL_MS);
  if (cached) {
    console.log(`[events] using cache (${cached.events.length} events)`);
    return { events: cached.events, notes: cached.notes };
  }
  const tm = await fetchTicketmaster(notes);
  const bit = await fetchBandsintown(notes);
  const events = dedupe([...tm, ...bit], (e) => `${e.title.toLowerCase()}|${e.date}`);
  await cacheSet(CACHE_KEY, { events, notes });
  return { events, notes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { ensureDirs } = await import("./normalize.mjs");
  await ensureDirs();
  const { events } = await fetchEvents([]);
  await writeOutput("events.json", events);
  console.log(`[events] wrote ${events.length} events`);
}
