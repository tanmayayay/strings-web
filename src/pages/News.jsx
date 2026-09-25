import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Bookmark, ArrowRight, ExternalLink } from 'lucide-react';
import { PageHead, Tag, EmptyState } from '../components/ui';
import { NEWS_ARTICLES } from '../data/demo';
import { liveNews, fmtRelative, viaLabel } from '../data/liveData';
import { useStore } from '../store/store';

const FILTERS = ['all', 'Industry', 'Pop culture', 'Events'];

export default function News() {
  const [filter, setFilter] = useState('all');
  const { isBookmarked, toggleBookmark, pushToast } = useStore();
  const navigate = useNavigate();
  const list = NEWS_ARTICLES.filter((a) => filter === 'all' || a.cat === filter);
  const [featured, ...rest] = list;

  const saveBtn = (a, e) => {
    e.stopPropagation();
    const s = toggleBookmark('article', a.id);
    pushToast(s ? 'Article saved.' : 'Removed from saved.');
  };

  const card = (a, isFeatured) => {
    const saved = isBookmarked('article', a.id);
    return (
      <div
        key={a.id}
        className="article-card"
        onClick={() => navigate(`/news/${a.id}`)}
        style={isFeatured ? { borderColor: 'var(--blue)', background: 'linear-gradient(180deg, var(--blue-dim), var(--panel) 60%)' } : undefined}
      >
        <div className="post-tags">
          <Tag color="blue">{a.cat}</Tag>
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> {a.time}
          </span>
          {isFeatured && <Tag color="indigo">★ Star story</Tag>}
        </div>
        <h4 style={{ fontSize: isFeatured ? 19 : 16, margin: '10px 0 8px' }}>{a.title}</h4>
        <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.6 }}>{a.deck}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>By {a.author} · {a.body.length} min read</span>
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
      {list.length === 0 ? (
        <EmptyState icon={<Clock size={22} />} title="No stories here" text="Try a different category." />
      ) : (
        <>
          {featured && card(featured, true)}
          {rest.map((a) => card(a, false))}
        </>
      )}
    </div>
  );
}
