import { useNavigate } from 'react-router-dom';
import { Bookmark, Newspaper, Handshake, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { PageHead, Avatar, Tag, EmptyState } from '../components/ui';
import { OPPORTUNITIES, NEWS_ARTICLES, MEDIA_ITEMS, HOME_FEED } from '../data/demo';
import { useStore } from '../store/store';

export default function Saved() {
  const { bookmarks, toggleBookmark, pushToast } = useStore();
  const navigate = useNavigate();

  const unsave = (kind, id) => { toggleBookmark(kind, id); pushToast('Removed from bookmarks.'); };

  const groups = [
    {
      kind: 'opp', title: 'Opportunities', icon: Handshake,
      items: bookmarks.filter((b) => b.kind === 'opp').map((b) => OPPORTUNITIES.find((o) => o.id === b.id)).filter(Boolean),
      render: (o) => (
        <div className="opp-card" key={o.id}>
          <b style={{ fontSize: 14.5 }}>{o.title}</b>
          <div style={{ margin: '6px 0' }}><Tag color="blue">{o.type}</Tag> <Tag color="sky">{o.city}</Tag></div>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{o.desc}</p>
        </div>
      ),
    },
    {
      kind: 'article', title: 'Articles', icon: Newspaper,
      items: bookmarks.filter((b) => b.kind === 'article').map((b) => NEWS_ARTICLES.find((a) => a.id === b.id)).filter(Boolean),
      render: (a) => (
        <div className="article-card" key={a.id} onClick={() => navigate(`/news/${a.id}`)}>
          <Tag color="blue">{a.cat}</Tag>
          <h4 style={{ fontSize: 15.5, margin: '8px 0 6px' }}>{a.title}</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{a.deck}</p>
        </div>
      ),
    },
    {
      kind: 'media', title: 'Gighub clips', icon: ImageIcon,
      items: bookmarks.filter((b) => b.kind === 'media').map((b) => MEDIA_ITEMS.find((m) => m.id === b.id)).filter(Boolean),
      render: (m) => (
        <div className="media-tile" key={m.id}>
          <div className="media-thumb" style={{ background: m.gradient, aspectRatio: '16/9' }}>
            <div className="media-badges-row"><span className="media-kind-badge">{m.kind}</span></div>
            <div className="media-overlay">
              <div className="who"><Avatar name={m.who} size={24} /><div><b>{m.who}</b></div></div>
              <p>{m.caption}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      kind: 'post', title: 'Posts', icon: MessageSquare,
      items: bookmarks.filter((b) => b.kind === 'post').map((b) => HOME_FEED.find((p) => p.id === b.id)).filter(Boolean),
      render: (p) => (
        <div className="post-card" key={p.id}>
          <div className="post-head"><Avatar name={p.who} size={32} /><div className="who"><b>{p.who}</b><span>{p.role} · {p.time}</span></div></div>
          <div className="post-body">{p.body}</div>
        </div>
      ),
    },
  ];

  const total = groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <div>
      <PageHead title="Saved" sub="Your bookmarks collection — opportunities, articles, clips and posts, in one place." />
      {total === 0 ? (
        <EmptyState
          icon={<Bookmark size={22} />}
          title="Nothing saved yet"
          text="Tap Save on any opportunity, article, clip or post and it will land here for later."
          action={<button className="btn btn-blue btn-sm" onClick={() => navigate('/collab')}>Browse Collab</button>}
        />
      ) : groups.filter((g) => g.items.length > 0).map((g) => (
        <div key={g.kind} style={{ marginBottom: 28 }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <g.icon size={15} style={{ color: 'var(--blue)' }} /> {g.title} ({g.items.length})
          </h4>
          <div style={g.kind === 'media' ? { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 } : undefined}>
            {g.items.map((item) => (
              <div key={item.id} style={{ position: 'relative' }}>
                {g.render(item)}
                <button
                  className="btn btn-ghost btn-xs"
                  style={{ position: 'absolute', top: 10, right: 10 }}
                  onClick={() => unsave(g.kind, item.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
