import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Image as ImageIcon, Heart, Bookmark, MapPin, CalendarDays, ExternalLink } from 'lucide-react';
import { PageHead, Avatar, Verified, EmptyState, Tag } from '../components/ui';
import { liveEvents, fmtLiveDateTime, viaLabel } from '../data/liveData';
import { Posts } from '../lib/api';
import { useStore } from '../store/store';

const FILTERS = ['all', 'video', 'photo'];

function isVideoUrl(url) {
  return /\.(mp4|mov|webm|m4v|ogv)(\?|#|$)/i.test(url || '');
}

// Deterministic tile gradient derived from the post id (presentation only).
function gradientFor(id) {
  const h = String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [222, 200, 245, 210, 232, 190];
  const hue = hues[h % hues.length];
  return `linear-gradient(135deg, hsl(${hue}, 60%, 20%), hsl(${(hue + 40) % 360}, 70%, 45%))`;
}

function postToTile(p) {
  const video = isVideoUrl(p.mediaUrl);
  return {
    id: p.id,
    kind: video ? 'video' : 'photo',
    who: p.author?.name || 'Unknown',
    pid: p.author?.id || null,
    role: [p.author?.stakeholderType, p.author?.city].filter(Boolean).join(' · '),
    verified: p.author?.verificationStatus === 'VERIFIED',
    caption: p.body || '',
    likes: p._count?.likes ?? 0,
    mediaUrl: p.mediaUrl,
    gradient: gradientFor(p.id),
  };
}

export default function Gighub() {
  const [filter, setFilter] = useState('all');
  const { isBookmarked, toggleBookmark, pushToast } = useStore();
  const navigate = useNavigate();
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Posts.list({ take: 60 })
      .then((d) => {
        if (!cancelled) setTiles((d.items || []).filter((p) => p.mediaUrl).map(postToTile));
      })
      .catch((e) => { if (!cancelled) pushToast(e.message, 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pushToast]);

  const list = tiles.filter((m) => filter === 'all' || m.kind === filter);

  return (
    <div>
      <PageHead title="Gighub" sub="Performance clips and service showcases from across the network — pure photo & video." />
      {liveEvents.length > 0 && (
        <section style={{ margin: '26px 0 8px' }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            Live events in India
            <Tag color="indigo">Real listings</Tag>
            <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>{liveEvents.length} upcoming</span>
          </h4>
          {liveEvents.slice(0, 12).map((e, i) => {
            const dt = fmtLiveDateTime(e.date);
            const where = [e.venue, e.city].filter(Boolean).join(' · ');
            return (
              <div className="opp-card" key={e.id || `${e.title || 'event'}-${i}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 15 }}>{e.title || 'Untitled event'}</b>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {e.genre && <Tag color="blue">{e.genre}</Tag>}
                      {where && <Tag color="sky"><MapPin size={11} /> {where}</Tag>}
                      {dt && <Tag color="gray"><CalendarDays size={11} /> {dt}</Tag>}
                      <Tag color="indigo">{viaLabel(e)}</Tag>
                    </div>
                  </div>
                  {e.url && (
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="btn btn-blue btn-sm" style={{ flexShrink: 0 }}>
                      Tickets <ExternalLink size={13} />
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
            {f === 'all' ? 'All' : f === 'video' ? 'Videos' : 'Photos'}
          </button>
        ))}
      </div>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>Loading media…</p>
      ) : list.length === 0 ? (
        <EmptyState icon={<ImageIcon size={22} />} title="Nothing here yet" text="No photos or videos have been shared yet — be the first from Home." />
      ) : (
        <div className="media-grid">
          {list.map((m) => {
            const saved = isBookmarked('media', m.id);
            return (
              <div className="media-tile" key={m.id}>
                <div className="media-thumb" style={{ background: m.gradient }} onClick={() => pushToast('Media viewer opens in the full app — Phase 2.')}>
                  {m.kind === 'photo' && (
                    <img src={m.mediaUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <div className="media-badges-row" style={{ position: 'relative' }}>
                    <span className="media-kind-badge">{m.kind === 'video' ? 'Video' : 'Photo'}</span>
                    {m.kind === 'video'
                      ? <Play size={20} color="#fff" fill="rgba(0,0,0,.35)" />
                      : <ImageIcon size={18} color="#fff" />}
                  </div>
                  <div className="media-overlay" style={{ position: 'relative' }}>
                    <div className="who" onClick={(e) => { e.stopPropagation(); if (m.pid) navigate(`/profile/${m.pid}`); }}>
                      <Avatar name={m.who} size={26} />
                      <div><b>{m.who}{m.verified && <Verified size={12} />}</b><span>{m.role}</span></div>
                    </div>
                    <p>{m.caption}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="media-likes"><Heart size={12} style={{ verticalAlign: -1 }} /> {m.likes}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nowSaved = toggleBookmark('media', m.id);
                          pushToast(nowSaved ? 'Saved to your bookmarks.' : 'Removed from bookmarks.');
                        }}
                        style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.35)', borderRadius: 8, color: '#fff', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}
                      >
                        <Bookmark size={12} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
