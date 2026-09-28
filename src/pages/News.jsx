import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Bookmark, ArrowRight, ExternalLink } from 'lucide-react';
import { PageHead, Tag, EmptyState } from '../components/ui';
import { liveNews, fmtRelative, viaLabel } from '../data/liveData';
import { Directory } from '../lib/api';
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
      {liveNews.length > 0 && (
        <section style={{ margin: '18px 0 6px' }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            Live now
            <Tag color="indigo">Real stories</Tag>
            <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>{liveNews.length} headlines</span>
          </h4>
          {liveNews.slice(0, 10).map((n, i) => {
            const rel = fmtRelative(n.published_at);
            return (
              <div className="article-card" key={n.id || `${n.title || 'story'}-${i}`} style={{ borderColor: 'var(--blue)' }}>
                <div className="post-tags">
                  {n.source && <Tag color="blue">{n.source}</Tag>}
                  {rel && (
                    <span style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {rel}
                    </span>
                  )}
                  <Tag color="indigo">{viaLabel(n)}</Tag>
                </div>
                <h4 style={{ fontSize: 16, margin: '10px 0 8px' }}>{n.title || 'Untitled story'}</h4>
                {n.excerpt && <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.6 }}>{n.excerpt}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    {n.source ? `Via ${n.source}` : 'Live feed'}{rel ? ` · ${rel}` : ''}
                  </span>
                  {n.url && (
                    <a className="btn btn-blue btn-xs" href={n.url} target="_blank" rel="noopener noreferrer">
                      Read story <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
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
