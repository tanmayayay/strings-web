import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronLeft, ChevronRight, MapPin, MessageCircle, UserPlus, Check, Pause, Play } from 'lucide-react';
import { Avatar, Verified } from '../ui';
import { hashStr } from '../../data/demo';
import { Convos } from '../../lib/api';

const SEEN_KEY = 'strings.spotlightSeen';
const DURATION = 6000;

const BACKDROPS = [
  'radial-gradient(120% 80% at 20% 0%,#2A63EE 0%,#0E2E6B 55%,#071634 100%)',
  'radial-gradient(120% 80% at 80% 0%,#A855F7 0%,#4F46E5 45%,#1F1147 100%)',
  'radial-gradient(120% 80% at 20% 10%,#F97316 0%,#BE185D 50%,#3B0D2E 100%)',
  'radial-gradient(120% 80% at 70% 0%,#22C55E 0%,#0F766E 50%,#052E2B 100%)',
  'radial-gradient(120% 80% at 30% 0%,#38BDF8 0%,#0369A1 50%,#082F49 100%)',
];

function readSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
}

function typeLabel(t) {
  return t ? t.charAt(0) + t.slice(1).toLowerCase() : 'Member';
}

function detailTags(p) {
  const d = p?.detail?.data || {};
  return [...(d.genres || []), ...(d.instruments || []), ...(d.skills || [])]
    .filter((x) => typeof x === 'string').slice(0, 5);
}

/* Horizontal "stories" row — every member you could meet today. */
export function SpotlightRail({ people, me, onCreate, following, onFollow }) {
  const [seen, setSeen] = useState(readSeen);
  const [openAt, setOpenAt] = useState(null);
  const scroller = useRef(null);

  const markSeen = useCallback((id) => {
    setSeen((s) => {
      if (s.includes(id)) return s;
      const next = [...s, id].slice(-200);
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // unseen first, like Instagram
  const ordered = [...people].sort((a, b) => Number(seen.includes(a.id)) - Number(seen.includes(b.id)));

  const nudge = (dir) => scroller.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });

  return (
    <section className="spot-wrap" aria-label="Spotlight">
      <button className="spot-nav left" onClick={() => nudge(-1)} aria-label="Scroll spotlight left"><ChevronLeft size={16} /></button>
      <div className="spot-rail" ref={scroller}>
        <button className="spot-item" onClick={onCreate}>
          <span className="spot-ring me">
            <Avatar name={me?.name || 'You'} size={58} />
            <span className="spot-plus"><Plus size={13} strokeWidth={3} /></span>
          </span>
          <span className="spot-name">Your update</span>
        </button>
        {ordered.map((p, i) => (
          <button key={p.id} className="spot-item" onClick={() => setOpenAt(i)}>
            <span className={`spot-ring${seen.includes(p.id) ? ' seen' : ''}`}>
              <Avatar name={p.name} size={58} />
            </span>
            <span className="spot-name">{p.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
      <button className="spot-nav right" onClick={() => nudge(1)} aria-label="Scroll spotlight right"><ChevronRight size={16} /></button>
      {openAt !== null && (
        <SpotlightViewer
          people={ordered}
          start={openAt}
          onSeen={markSeen}
          onClose={() => setOpenAt(null)}
          following={following}
          onFollow={onFollow}
        />
      )}
    </section>
  );
}

/* Full-screen viewer with progress bars, tap zones, keyboard + hold-to-pause. */
function SpotlightViewer({ people, start, onClose, onSeen, following, onFollow }) {
  const [idx, setIdx] = useState(start);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();
  const p = people[idx];

  const next = useCallback(() => {
    setProgress(0);
    setIdx((i) => {
      if (i >= people.length - 1) { onClose(); return i; }
      return i + 1;
    });
  }, [people.length, onClose]);
  const prev = useCallback(() => { setProgress(0); setIdx((i) => Math.max(0, i - 1)); }, []);

  useEffect(() => { if (p) onSeen(p.id); }, [p, onSeen]);

  useEffect(() => {
    if (paused) return undefined;
    const startT = performance.now() - progress * DURATION;
    let raf;
    const tick = (t) => {
      const v = (t - startT) / DURATION;
      if (v >= 1) { next(); return; }
      setProgress(v);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, paused, next]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') { e.preventDefault(); setPaused((x) => !x); }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [next, prev, onClose]);

  if (!p) return null;
  const tags = detailTags(p);
  const isFollowing = following?.has(p.id);

  return createPortal(
    <div className="sv-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${p.name} spotlight`}>
      <button className="sv-close" onClick={onClose} aria-label="Close"><X size={22} /></button>
      <button className="sv-side left" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous" disabled={idx === 0}>
        <ChevronLeft size={22} />
      </button>
      <AnimatePresence mode="wait">
        <motion.div
          key={p.id}
          className="sv-card"
          style={{ background: BACKDROPS[hashStr(p.id) % BACKDROPS.length] }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          <div className="sv-bars">
            {people.map((x, i) => (
              <span key={x.id}><i style={{ width: `${i < idx ? 100 : i === idx ? progress * 100 : 0}%` }} /></span>
            ))}
          </div>
          <div className="sv-top">
            <Avatar name={p.name} size={34} />
            <b>{p.name}{p.verificationStatus === 'VERIFIED' && <Verified size={13} />}</b>
            <button className="sv-pause" onClick={() => setPaused((x) => !x)} aria-label={paused ? 'Play' : 'Pause'}>
              {paused ? <Play size={15} /> : <Pause size={15} />}
            </button>
          </div>
          {/* tap zones */}
          <button className="sv-zone l" onClick={prev} aria-label="Previous member" tabIndex={-1} />
          <button className="sv-zone r" onClick={next} aria-label="Next member" tabIndex={-1} />

          <div className="sv-center">
            <div className="sv-avatar-xl"><Avatar name={p.name} size={112} /></div>
            <span className="sv-kicker">{typeLabel(p.stakeholderType)} spotlight</span>
            <h2>{p.name}</h2>
            {p.city && <span className="sv-city"><MapPin size={13} /> {p.city}</span>}
            {p.bio && <p className="sv-bio">{p.bio}</p>}
            {tags.length > 0 && (
              <div className="sv-tags">{tags.map((t) => <span key={t}>{t}</span>)}</div>
            )}
            {p._count && (
              <div className="sv-stats">
                <span><b>{p._count.followers ?? 0}</b> followers</span>
                <span><b>{p._count.posts ?? 0}</b> posts</span>
              </div>
            )}
          </div>

          <div className="sv-actions">
            <button className="sv-btn ghost" onClick={async () => {
              try {
                const c = await Convos.open(p.id);
                onClose();
                navigate(`/messages?c=${c.id}`);
              } catch { onClose(); navigate(`/profile/${p.id}`); }
            }}>
              <MessageCircle size={16} /> Message
            </button>
            {onFollow && (
              <button className={`sv-btn${isFollowing ? ' ghost' : ''}`} onClick={() => onFollow(p)}>
                {isFollowing ? <><Check size={16} /> Following</> : <><UserPlus size={16} /> Follow</>}
              </button>
            )}
            <button className="sv-btn ghost" onClick={() => { onClose(); navigate(`/profile/${p.id}`); }}>
              View profile
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
      <button className="sv-side right" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next">
        <ChevronRight size={22} />
      </button>
    </div>,
    document.body,
  );
}
