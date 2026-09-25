import { useNavigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Bookmark, Share2, ChevronRight } from 'lucide-react';
import { Tag, EmptyState } from '../components/ui';
import { NEWS_ARTICLES } from '../data/demo';
import { useStore } from '../store/store';

export default function NewsArticle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isBookmarked, toggleBookmark, pushToast } = useStore();
  const article = NEWS_ARTICLES.find((a) => a.id === id);

  if (!article) {
    return <EmptyState icon={<Clock size={22} />} title="Article not found" text="This story may have been moved." action={<button className="btn btn-blue btn-sm" onClick={() => navigate('/news')}>Back to News</button>} />;
  }

  const saved = isBookmarked('article', article.id);
  const related = NEWS_ARTICLES.filter((a) => a.id !== article.id && a.cat === article.cat).slice(0, 3);

  return (
    <div className="article-layout">
      <div>
        <button className="wall-back" onClick={() => navigate('/news')}><ArrowLeft size={15} /> All news</button>
        <div className="article-hero" style={{ background: article.gradient }}>
          <div style={{ position: 'relative' }}>
            <Tag color="gray">{article.cat}</Tag>
            <h1>{article.title}</h1>
            <p>By {article.author} · Published {article.time} · {article.body.length} min read</p>
          </div>
        </div>
        <div className="article-body">
          <p className="lede">{article.deck}</p>
          {article.body.map((p, i) => <p key={i}>{p}</p>)}
          <div className="divider" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { const s = toggleBookmark('article', article.id); pushToast(s ? 'Article saved.' : 'Removed from saved.'); }}
              style={saved ? { color: 'var(--amber)', borderColor: 'var(--amber)' } : undefined}
            >
              <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save article'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => pushToast('Share link copied to clipboard.')}>
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>
      </div>
      <div>
        <div className="side-card">
          <h4>More in {article.cat}</h4>
          {related.map((r) => (
            <Link key={r.id} to={`/news/${r.id}`} className="mini-list-item" style={{ alignItems: 'flex-start' }}>
              <div><b style={{ fontWeight: 500, lineHeight: 1.4 }}>{r.title}</b><span>{r.time}</span></div>
              <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-faint)', flexShrink: 0 }} />
            </Link>
          ))}
        </div>
        <div className="side-card">
          <h4>Daily digest</h4>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 12 }}>Ten stories, every morning at 6 AM. Never miss what moves the industry.</p>
          <button className="btn btn-blue btn-sm" style={{ width: '100%' }} onClick={() => pushToast('Subscribed — see you at 6 AM.')}>Get the digest</button>
        </div>
      </div>
    </div>
  );
}
