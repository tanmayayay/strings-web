import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Newspaper, Handshake, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { PageHead, Avatar, Tag, EmptyState } from '../components/ui';
import { Opps, Posts, Directory } from '../lib/api';
import { useStore } from '../store/store';

/* Bookmarks store {kind, id} locally. Resolve each id against the real API.
 * Entries that no longer resolve (e.g. pre-launch demo bookmarks) are dropped. */

function useResolvedBookmarks(bookmarks) {
  const [resolved, setResolved] = useState({});
  useEffect(() => {
    let alive = true;
    (async () => {
      const out = {};
      let articles = [];
      if (bookmarks.some((b) => b.kind === 'article')) {
        try {
          const r = await Directory.articles({ take: 100 });
          articles = r.items || [];
        } catch {
          articles = [];
        }
      }
      await Promise.all(bookmarks.map(async (b) => {
        const key = `${b.kind}:${b.id}`;
        let item = null;
        try {
          if (b.kind === 'opp') item = await Opps.get(b.id);
          else if (b.kind === 'post' || b.kind === 'media') item = await Posts.get(b.id);
          else if (b.kind === 'article') item = articles.find((a) => a.id === b.id) || null;
        } catch {
          item = null;
        }
        out[key] = item || null;
      }));
      if (alive) setResolved(out);
    })();
    return () => { alive = false; };
  }, [bookmarks]);
  return resolved;
}

export default function Saved() {
  const { bookmarks, toggleBookmark, pushToast } = useStore();
  const navigate = useNavigate();
  const resolved = useResolvedBookmarks(bookmarks);

  const unsave = (kind, id) => { toggleBookmark(kind, id); pushToast('Removed from bookmarks.'); };
  const itemsFor = (kind) => bookmarks
    .filter((b) => b.kind === kind)
    .map((b) => resolved[`${b.kind}:${b.id}`])
    .filter(Boolean);

  const groups = [
    {
      kind: 'opp', title: 'Opportunities', icon: Handshake,
      items: itemsFor('opp'),
      render: (o) => (
        <div className="opp-card" key={o.id}>
          <b style={{ fontSize: 14.5 }}>{o.title}</b>
          <div style={{ margin: '6px 0' }}><Tag color="blue">{o.type || 'Opportunity'}</Tag> {o.city && <Tag color="sky">{o.city}</Tag>}</div>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{o.desc || o.description}</p>
        </div>
      ),
    },
    {
      kind: 'article', title: 'Articles', icon: Newspaper,
      items: itemsFor('article'),
      render: (a) => (
        <div className="article-card" key={a.id} onClick={() => navigate(`/news/${a.id}`)}>
          <Tag color="blue">{a.cat || a.category || 'News'}</Tag>
          <h4 style={{ fontSize: 15.5, margin: '8px 0 6px' }}>{a.title}</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{a.excerpt}</p>
        </div>
      ),
    },
    {
      kind: 'media', title: 'Gighub clips', icon: ImageIcon,
      items: itemsFor('media'),
      render: (p) => {
        const name = p.author?.name || 'Strings member';
        const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(p.mediaUrl || '');
        return (
          <div className="media-tile" key={p.id} onClick={() => navigate(`/profile/${p.author?.id}`)} style={{ cursor: 'pointer' }}>
            <div className="media-thumb" style={{ aspectRatio: '16/9' }}>
              {p.mediaUrl && !isVideo && (
                <img src={p.mediaUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div className="media-badges-row" style={{ position: 'relative' }}>
                <span className="media-kind-badge">{isVideo ? 'Video' : 'Photo'}</span>
              </div>
              <div className="media-overlay" style={{ position: 'relative' }}>
                <div className="who"><Avatar name={name} size={24} /><div><b>{name}</b></div></div>
                <p>{p.body}</p>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      kind: 'post', title: 'Posts', icon: MessageSquare,
      items: itemsFor('post'),
      render: (p) => {
        const name = p.author?.name || p.who || 'Strings member';
        const sub = p.author ? `${p.author.stakeholderType || ''}`.trim() : `${p.role || ''} · ${p.time || ''}`;
        return (
          <div className="post-card" key={p.id}>
            <div className="post-head"><Avatar name={name} size={32} /><div className="who"><b>{name}</b><span>{sub}</span></div></div>
            <div className="post-body">{p.body}</div>
          </div>
        );
      },
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
