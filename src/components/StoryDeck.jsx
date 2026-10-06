import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Star, ExternalLink, RotateCcw, Layers, Clock } from 'lucide-react';
import { Tag } from './ui';
import { timeAgo } from '../lib/format';
import { useStore } from '../store/store';

const DISMISSED_KEY = 'strings.deck.dismissed';
// Live headlines (RSS) aren't resolvable from the newsroom API later, so
// cache the saved ones' metadata here — the Saved page reads this to render
// swipe-saved stories that no longer appear in the live feed.
const META_KEY = 'strings.deck.meta';

function loadDismissed() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

const itemKey = (it) => it.id || it.url || '';

/* ------------------------------------------------------------------ */
/* Top (active) card — draggable, with Tinder-style SAVE / SKIP stamps */
/* ------------------------------------------------------------------ */
function TopCard({ item, num, total, direction, onSwipe }) {
  const x = useMotionValue(0);

  const saveOpacity = useTransform(x, [40, 120], [0, 1]);
  const saveRotate = useTransform(x, [40, 120], [-14, 14]);
  const skipOpacity = useTransform(x, [-120, -40], [1, 0]);
  const skipRotate = useTransform(x, [-120, -40], [-14, 14]);
  const cardRotate = useTransform(x, [-220, 220], [-9, 9]);

  return (
    <motion.article
      className="deck-card"
      custom={direction}
      style={{ x, rotate: cardRotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      whileDrag={{ scale: 1.02 }}
      onDragEnd={(_e, info) => {
        const px = info.offset.x;
        const vx = info.velocity.x;
        if (px > 100 || vx > 600) onSwipe(1);
        else if (px < -100 || vx < -600) onSwipe(-1);
      }}
      initial={{ scale: 0.93, y: 34, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={(d) => ({
        x: (d || 0) * 560,
        rotate: (d || 0) * 18,
        opacity: 0,
        transition: { duration: 0.26, ease: 'easeIn' },
      })}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      aria-roledescription="swipeable story card"
      aria-label={`Story ${num} of ${total}: ${item.title || 'Untitled story'}`}
    >
      <motion.div className="deck-stamp deck-stamp-save" style={{ opacity: saveOpacity, rotate: saveRotate }}>
        SAVE
      </motion.div>
      <motion.div className="deck-stamp deck-stamp-skip" style={{ opacity: skipOpacity, rotate: skipRotate }}>
        SKIP
      </motion.div>

      <div className="deck-meta">
        {item.source && <Tag color="blue">{item.source}</Tag>}
        <span className="deck-index">#{num}</span>
      </div>

      <h3 className="deck-headline">{item.title || 'Untitled story'}</h3>

      <div className="deck-foot">
        <span className="deck-when">
          <Clock size={12} /> {timeAgo(item.publishedAt) || 'Live'}
        </span>
        <span className="deck-via">{item.source ? `Via ${item.source}` : 'Live feed'}</span>
      </div>
    </motion.article>
  );
}

/* -------------------------------- */
/* The deck                         */
/* -------------------------------- */
export default function StoryDeck({ items }) {
  const { isBookmarked, toggleBookmark, pushToast } = useStore();

  const dismissedRef = useRef(null);
  if (dismissedRef.current === null) dismissedRef.current = loadDismissed();

  const [queue, setQueue] = useState([]);
  const [booted, setBooted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  // Build the swipe queue once the live items arrive, filtering out
  // anything already swiped in an earlier session (persisted in localStorage).
  useEffect(() => {
    if (!booted && items && items.length > 0) {
      const dismissed = dismissedRef.current;
      setQueue(items.filter((it) => it && !dismissed.has(itemKey(it))));
      setBooted(true);
    }
  }, [items, booted]);

  const idxRef = useRef(0);

  const markDismissed = (id) => {
    if (!id) return;
    dismissedRef.current.add(id);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissedRef.current]));
    } catch {
      /* storage full/blocked — deck still works for this session */
    }
  };

  const cacheMeta = (item) => {
    if (!item || !item.id) return;
    try {
      const raw = localStorage.getItem(META_KEY);
      const meta = raw ? JSON.parse(raw) : {};
      meta[item.id] = { title: item.title, source: item.source, url: item.url, publishedAt: item.publishedAt };
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch {
      /* storage full/blocked — save still works, Saved may not resolve the story */
    }
  };

  const swipe = useCallback(
    (dir) => {
      const i = idxRef.current;
      const item = queue[i];
      if (!item) return;
      const id = itemKey(item);
      markDismissed(id);
      if (dir > 0) {
        if (!isBookmarked('article', item.id)) {
          toggleBookmark('article', item.id);
          setSavedCount((c) => c + 1);
        }
        cacheMeta(item);
        pushToast('Saved to your reading list.');
      }
      setDirection(dir);
      idxRef.current = i + 1;
      setIdx(i + 1);
    },
    [queue, isBookmarked, toggleBookmark, pushToast]
  );

  const openStory = useCallback(() => {
    const item = queue[idxRef.current];
    if (item && item.url) window.open(item.url, '_blank', 'noopener');
  }, [queue]);

  // Keyboard alternatives: ← skip · → save · Enter open. Cleaned up on unmount.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        swipe(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        swipe(1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        openStory();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const restart = () => {
    try {
      localStorage.removeItem(DISMISSED_KEY);
    } catch {
      /* ignore */
    }
    dismissedRef.current = new Set();
    idxRef.current = 0;
    setIdx(0);
    setDirection(0);
    setSavedCount(0);
    setQueue((items || []).filter((it) => it));
    setBooted(true);
  };

  if (!items || items.length === 0) return null;

  const total = queue.length;
  const done = total === 0 || idx >= total;
  const current = !done ? queue[idx] : null;
  const savedCurrent = current ? isBookmarked('article', current.id) : false;
  const pct = total === 0 ? 100 : Math.min(100, (idx / total) * 100);
  const behind1 = !done ? queue[idx + 1] : null;
  const behind2 = !done ? queue[idx + 2] : null;

  return (
    <div className="story-deck">
      <div className="deck-progress-row">
        <span className="deck-counter">
          {total === 0 ? '0 of 0' : `${Math.min(idx + 1, total)} of ${total}`}
        </span>
        <div className="deck-progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100">
          <div className="deck-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {done ? (
        <div className="deck-end">
          <div className="deck-end-icon">
            <Layers size={28} />
          </div>
          <h3>You&rsquo;re all caught up</h3>
          <p>
            {savedCount > 0
              ? `You saved ${savedCount} ${savedCount === 1 ? 'story' : 'stories'} to your reading list this session.`
              : 'Swipe through the next drop when fresh headlines land.'}
          </p>
          <button className="btn btn-blue btn-sm" onClick={restart}>
            <RotateCcw size={15} /> Review skipped
          </button>
        </div>
      ) : (
        <>
          <div className="deck-stack">
            {behind2 && (
              <div key={`b2-${itemKey(behind2)}`} className="deck-card deck-card-behind deck-behind-2" aria-hidden="true">
                <div className="deck-meta">{behind2.source && <Tag color="blue">{behind2.source}</Tag>}</div>
                <h3 className="deck-headline">{behind2.title || 'Untitled story'}</h3>
              </div>
            )}
            {behind1 && (
              <div key={`b1-${itemKey(behind1)}`} className="deck-card deck-card-behind deck-behind-1" aria-hidden="true">
                <div className="deck-meta">{behind1.source && <Tag color="blue">{behind1.source}</Tag>}</div>
                <h3 className="deck-headline">{behind1.title || 'Untitled story'}</h3>
              </div>
            )}
            <AnimatePresence custom={direction}>
              {current && (
                <TopCard
                  key={`${itemKey(current)}-${idx}`}
                  item={current}
                  num={idx + 1}
                  total={total}
                  direction={direction}
                  onSwipe={swipe}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="deck-actions">
            <button className="deck-btn deck-btn-skip" onClick={() => swipe(-1)} aria-label="Skip story">
              <X size={22} />
              <span>Skip</span>
            </button>
            <button className="deck-btn deck-btn-save" onClick={() => swipe(1)} aria-label={savedCurrent ? 'Saved story' : 'Save story'}>
              <Star size={22} fill={savedCurrent ? 'var(--amber)' : 'none'} color={savedCurrent ? 'var(--amber)' : 'currentColor'} />
              <span>{savedCurrent ? 'Saved' : 'Save'}</span>
            </button>
            <button
              className="deck-btn deck-btn-open"
              onClick={openStory}
              disabled={!current || !current.url}
              aria-label="Open story"
            >
              <ExternalLink size={22} />
              <span>Open</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
