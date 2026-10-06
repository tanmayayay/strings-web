import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, ExternalLink, Layers, LayoutList, Clock, Newspaper } from 'lucide-react';
import { EmptyState } from '../components/ui';
import SwipeDeck from '../components/news/SwipeDeck';
import NewsCover, { topicOf } from '../components/news/NewsCover';
import { Directory, NewsLive } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useStore } from '../store/store';
import './news.css';

const MODE_KEY = 'strings.newsMode';
const TOPICS = ['All', 'Live music', 'Industry', 'New music', 'Pop culture'];

/* Normalise both feeds into one card shape. */
function fromLive(n, i) {
  return {
    id: `live:${n.id || n.url || i}`,
    rawId: n.id || n.url,
    title: n.title || 'Untitled story',
    excerpt: n.excerpt || '',
    url: n.url,
    source: n.source || 'Live feed',
    publishedAt: n.publishedAt || n.published_at || null,
    image: n.image || '',
    isLive: true,
  };
}
function fromArticle(a) {
  return {
    id: `art:${a.id}`,
    rawId: a.id,
    title: a.title,
    excerpt: a.excerpt || '',
    body: a.body,
    category: a.category,
    source: a.author?.name || 'Strings newsroom',
    publishedAt: a.publishedAt || a.createdAt,
    image: '',
    isLive: false,
  };
}

export default function News() {
  const navigate = useNavigate();
  const { isBookmarked, toggleBookmark, pushToast } = useStore();
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(MODE_KEY) || 'swipe'; } catch { return 'swipe'; }
  });
  const [topic, setTopic] = useState('All');
  const [live, setLive] = useState([]);
  const [articles, setArticles] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ } }, [mode]);

  useEffect(() => {
    let off = false;
    setLoading(true);
    setError('');
    Promise.allSettled([NewsLive.get(), Directory.articles({ take: 40 })]).then(([l, a]) => {
      if (off) return;
      if (l.status === 'fulfilled') { setLive(l.value.items || []); setUpdatedAt(l.value.updatedAt || null); }
      if (a.status === 'fulfilled') setArticles(a.value.items || []);
      if (l.status === 'rejected' && a.status === 'rejected') setError(a.reason?.message || 'Could not load stories.');
      setLoading(false);
    });
    return () => { off = true; };
  }, [reloadKey]);

  const all = useMemo(() => {
    const seen = new Set();
    const merged = [...live.map(fromLive), ...articles.map(fromArticle)];
    return merged.filter((it) => {
      const k = it.title.toLowerCase().slice(0, 60);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [live, articles]);

  const items = useMemo(
    () => (topic === 'All' ? all : all.filter((it) => topicOf(it) === topic)),
    [all, topic],
  );

  const kindOf = (it) => (it.isLive ? 'live' : 'article');
  const isSaved = useCallback((it) => isBookmarked(kindOf(it), it.rawId), [isBookmarked]);
  const snapshot = (it) => ({ title: it.title, url: it.url, source: it.source, publishedAt: it.publishedAt });
  const save = useCallback((it) => {
    toggleBookmark(kindOf(it), it.rawId, it.isLive ? snapshot(it) : undefined);
  }, [toggleBookmark]);
  const unsave = useCallback((it) => { if (isBookmarked(kindOf(it), it.rawId)) toggleBookmark(kindOf(it), it.rawId); }, [isBookmarked, toggleBookmark]);
  const read = useCallback((it) => {
    if (it.isLive) window.open(it.url, '_blank', 'noopener,noreferrer');
    else navigate(`/news/${it.rawId}`);
  }, [navigate]);

  const toggleSaveList = (e, it) => {
    e.stopPropagation();
    const now = toggleBookmark(kindOf(it), it.rawId, it.isLive ? snapshot(it) : undefined);
    pushToast(now ? 'Saved for later.' : 'Removed from saved.');
  };

  const [hero, ...rest] = items;

  return (
    <div className="news-page">
      <header className="news-head">
        <div>
          <span className="news-kicker"><span className="dot" /> Strings Daily</span>
          <h1>Today in Indian music</h1>
          <p>
            {all.length} stories{updatedAt ? ` · updated ${timeAgo(updatedAt)}` : ''} · swipe right to save, left to pass
          </p>
        </div>
        <div className="news-mode" role="tablist" aria-label="View">
          <button role="tab" aria-selected={mode === 'swipe'} className={mode === 'swipe' ? 'on' : ''} onClick={() => setMode('swipe')}>
            <Layers size={15} /> Swipe
          </button>
          <button role="tab" aria-selected={mode === 'list'} className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>
            <LayoutList size={15} /> List
          </button>
        </div>
      </header>

      <div className="news-topics">
        {TOPICS.map((t) => {
          const n = t === 'All' ? all.length : all.filter((it) => topicOf(it) === t).length;
          if (t !== 'All' && n === 0) return null;
          return (
            <button key={t} className={`filter-chip${topic === t ? ' active' : ''}`} onClick={() => setTopic(t)}>
              {t} <span className="news-topic-n">{n}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="deck-skel shimmer-strip" />
      ) : error ? (
        <EmptyState
          icon={<Clock size={22} />}
          title="Could not load stories"
          text={error}
          action={<button className="btn btn-blue btn-sm" onClick={() => setReloadKey((k) => k + 1)}>Retry</button>}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={<Newspaper size={22} />} title="No stories here" text="Try a different topic — new stories land every few hours." />
      ) : mode === 'swipe' ? (
        <SwipeDeck
          key={topic}
          items={items}
          isSaved={isSaved}
          onSave={(it) => { save(it); }}
          onUnsave={unsave}
          onRead={read}
          onSwitchToList={() => setMode('list')}
        />
      ) : (
        <div className="news-list">
          {hero && (
            <article className="news-hero" onClick={() => read(hero)}>
              <NewsCover item={hero} large />
              <div className="news-hero-text">
                <span className="news-pill">{topicOf(hero)}</span>
                <h2>{hero.title}</h2>
                {hero.excerpt && <p>{hero.excerpt.replace(/\s*The post .*appeared first on .*$/, '')}</p>}
                <div className="news-row-meta">
                  <span>{hero.source}{hero.publishedAt ? ` · ${timeAgo(hero.publishedAt)}` : ''}</span>
                  <SaveBtn it={hero} saved={isSaved(hero)} onClick={toggleSaveList} light />
                </div>
              </div>
            </article>
          )}
          <div className="news-grid">
            {rest.map((it) => (
              <article key={it.id} className="news-tile" onClick={() => read(it)}>
                <div className="news-tile-cover"><NewsCover item={it} /></div>
                <div className="news-tile-body">
                  <span className="news-pill subtle">{topicOf(it)}</span>
                  <h3>{it.title}</h3>
                  <div className="news-row-meta">
                    <span>
                      {it.source}{it.publishedAt ? ` · ${timeAgo(it.publishedAt)}` : ''}
                      {it.isLive && <ExternalLink size={11} style={{ marginLeft: 4, verticalAlign: -1 }} />}
                    </span>
                    <SaveBtn it={it} saved={isSaved(it)} onClick={toggleSaveList} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SaveBtn({ it, saved, onClick, light }) {
  return (
    <button
      className={`news-save${saved ? ' on' : ''}${light ? ' light' : ''}`}
      onClick={(e) => onClick(e, it)}
      aria-label={saved ? 'Remove from saved' : 'Save for later'}
      aria-pressed={saved}
    >
      <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
