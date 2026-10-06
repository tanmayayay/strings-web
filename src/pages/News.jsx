import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Bookmark, ArrowRight } from 'lucide-react';
import { PageHead, Tag, EmptyState } from '../components/ui';
import StoryDeck from '../components/StoryDeck';
import '../news-deck.css';
import { Directory, NewsLive } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useStore } from '../store/store';

const FILTERS = ['all', 'Industry', 'Pop culture', 'Events'];

function readTime(body) {
  const words = (body || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default function News() {
  const [filter, setFilter] = useState('all');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const { isBookmarked, toggleBookmark, pushToast } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Directory.articles(filter === 'all' ? {} : { category: filter })
      .then((data) => {
        if (!cancelled) setArticles(data.items || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Could not load stories.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filter, reloadKey]);

  const [featured, ...rest] = articles;

  // Live headlines served by the backend (cached, refreshed every 6h).
  // Fails quiet — the section hides and the newsroom articles below still work.
  const [liveItems, setLiveItems] = useState([]);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    NewsLive.get()
      .then((data) => {
        if (!cancelled) {
          setLiveItems(data.items || []);
          setLiveUpdatedAt(data.updatedAt || null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiveItems([]);
          setLiveUpdatedAt(null);
        }
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const saveBtn = (a, e) => {
    e.stopPropagation();
    const s = toggleBookmark('article', a.id);
    pushToast(s ? 'Article saved.' : 'Removed from saved.');
  };

  const card = (a, isFeatured) => {
    const saved = isBookmarked('article', a.id);
    const authorName = a.author?.name || 'Strings newsroom';
    return (
      <div
        key={a.id}
        className="article-card"
        onClick={() => navigate(`/news/${a.id}`)}
        style={isFeatured ? { borderColor: 'var(--blue)', background: 'linear-gradient(180deg, var(--blue-dim), var(--panel) 60%)' } : undefined}
      >
        <div className="post-tags">
          {a.category && <Tag color="blue">{a.category}</Tag>}
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> {timeAgo(a.publishedAt || a.createdAt)}
          </span>
          {isFeatured && <Tag color="indigo">★ Star story</Tag>}
        </div>
        <h4 style={{ fontSize: isFeatured ? 19 : 16, margin: '10px 0 8px' }}>{a.title}</h4>
        {a.excerpt && <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.6 }}>{a.excerpt}</p>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>By {authorName} · {readTime(a.body)} min read</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-xs" onClick={(e) => saveBtn(a, e)}>
              <Bookmark size={13} fill={saved ? 'var(--amber)' : 'none'} color={saved ? 'var(--amber)' : undefined} /> {saved ? 'Saved' : 'Save'}
            </button>
            <button className="btn btn-blue btn-xs">Read <ArrowRight size={13} /></button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHead title="News" sub="Today's Indian music-industry headlines, published daily by the Strings newsroom." />
      {liveItems.length > 0 && (
        <section style={{ margin: '18px 0 6px' }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            Story Deck
            <Tag color="indigo">Swipe through</Tag>
            <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>{liveItems.length} headlines</span>
            {liveUpdatedAt && (
              <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>
                · Updated {timeAgo(liveUpdatedAt)} · refreshes every 6 hours
              </span>
            )}
          </h4>
          <StoryDeck items={liveItems} />
        </section>
      )}
      <div className="filter-row">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>
      {loading ? (
        <>
          {[0, 1, 2].map((i) => (
            <div className="skel-card" key={i}>
              <div className="skel-line shimmer-strip" style={{ width: '40%' }} />
              <div className="skel-line shimmer-strip" style={{ width: '85%' }} />
              <div className="skel-line shimmer-strip" style={{ width: '60%' }} />
            </div>
          ))}
        </>
      ) : error ? (
        <EmptyState
          icon={<Clock size={22} />}
          title="Could not load stories"
          text={error}
          action={<button className="btn btn-blue btn-sm" onClick={() => setReloadKey((k) => k + 1)}>Retry</button>}
        />
      ) : articles.length === 0 ? (
        <EmptyState icon={<Clock size={22} />} title="No stories here" text="Try a different category — new stories land here daily." />
      ) : (
        <>
          {featured && card(featured, true)}
          {rest.map((a) => card(a, false))}
        </>
      )}
    </div>
  );
}
