import { useState } from 'react';
import { Play, Music2 } from 'lucide-react';

/** Turn a pasted link into a safe embed address. Only YouTube, Spotify and SoundCloud are allowed. */
export function embedFor(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return /^[\w-]{6,15}$/.test(id) ? { kind: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, tall: false } : null;
  }
  if (host === 'youtube.com') {
    let id = u.searchParams.get('v');
    const parts = u.pathname.split('/').filter(Boolean);
    if (!id && ['shorts', 'embed', 'live'].includes(parts[0])) id = parts[1];
    if (id && /^[\w-]{6,15}$/.test(id)) return { kind: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, tall: false };
    const list = u.searchParams.get('list');
    if (list && /^[\w-]{10,50}$/.test(list)) return { kind: 'YouTube', src: `https://www.youtube-nocookie.com/embed/videoseries?list=${list}&autoplay=1`, tall: false };
    return null;
  }
  if (host === 'open.spotify.com') {
    const parts = u.pathname.split('/').filter(Boolean).filter((p) => !/^intl-/.test(p));
    const [type, id] = parts;
    if (['track', 'album', 'playlist', 'artist', 'episode', 'show'].includes(type) && /^[A-Za-z0-9]{10,30}$/.test(id || '')) {
      return { kind: 'Spotify', src: `https://open.spotify.com/embed/${type}/${id}`, tall: type !== 'track' && type !== 'episode' };
    }
    return null;
  }
  if (host === 'soundcloud.com') {
    if (u.pathname.split('/').filter(Boolean).length < 1) return null;
    return { kind: 'SoundCloud', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(`https://soundcloud.com${u.pathname}`)}&auto_play=true&visual=false`, tall: false };
  }
  return null;
}

const SAMPLE_KEYS = ['featuredUrl', 'sample1Url', 'sample2Url', 'sample3Url'];

export function samplesOf(data = {}) {
  const seen = new Set();
  return SAMPLE_KEYS.map((k) => ({ key: k, url: data[k] })).filter((s) => s.url).map((s) => ({ ...s, embed: embedFor(s.url) }))
    .filter((s) => s.embed && !seen.has(s.embed.src) && seen.add(s.embed.src));
}

/** Click-to-play: nothing from YouTube/Spotify/SoundCloud loads until someone presses play. */
function Sample({ s, i }) {
  const [on, setOn] = useState(false);
  const { embed } = s;
  const h = embed.kind === 'Spotify' ? (embed.tall ? 352 : 152) : embed.kind === 'SoundCloud' ? 166 : null;
  return (
    <div className={`sm-item ${embed.kind.toLowerCase()}`}>
      {on ? (
        <iframe
          title={`${embed.kind} sample ${i + 1}`}
          src={embed.src}
          loading="lazy"
          allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          style={h ? { height: h } : { aspectRatio: '16 / 9' }}
        />
      ) : (
        <button className="sm-facade" onClick={() => setOn(true)} style={h ? { height: Math.min(h, 120) } : { aspectRatio: '16 / 9' }} aria-label={`Play ${embed.kind} sample ${i + 1}`}>
          <span className="sm-play"><Play size={22} fill="currentColor" /></span>
          <span className="sm-label"><Music2 size={13} /> {embed.kind}</span>
        </button>
      )}
    </div>
  );
}

export default function Samples({ data }) {
  const list = samplesOf(data);
  if (!list.length) return null;
  return (
    <div className="pf-card">
      <h3><Play size={16} /> Listen</h3>
      <div className="sm-grid">{list.map((s, i) => <Sample key={s.key} s={s} i={i} />)}</div>
    </div>
  );
}
