import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Image as ImageIcon, Heart, Bookmark } from 'lucide-react';
import { PageHead, Avatar, Verified, EmptyState } from '../components/ui';
import { MEDIA_ITEMS } from '../data/demo';
import { useStore } from '../store/store';
import { PEOPLE_BY_ID } from '../data/demo';

const FILTERS = ['all', 'Performance', 'Service showcase'];

export default function Gighub() {
  const [filter, setFilter] = useState('all');
  const { isBookmarked, toggleBookmark, pushToast } = useStore();
  const navigate = useNavigate();
  const list = MEDIA_ITEMS.filter((m) => filter === 'all' || m.kind === filter);

  return (
    <div>
      <PageHead title="Gighub" sub="Performance clips and service showcases from across the network — pure photo & video." />
      <div className="filter-row">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'Performance' ? 'Performances' : 'Service showcase'}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<ImageIcon size={22} />} title="Nothing here yet" text="Try a different filter." />
      ) : (
        <div className="media-grid">
          {list.map((m) => {
            const person = m.pid ? PEOPLE_BY_ID[m.pid] : null;
            const saved = isBookmarked('media', m.id);
            return (
              <div className="media-tile" key={m.id}>
                <div className="media-thumb" style={{ background: m.gradient }} onClick={() => pushToast('Media viewer opens in the full app — Phase 2.')}>
                  <div className="media-badges-row">
                    <span className="media-kind-badge">{m.kind}</span>
                    {m.type === 'video'
                      ? <Play size={20} color="#fff" fill="rgba(0,0,0,.35)" />
                      : <ImageIcon size={18} color="#fff" />}
                  </div>
                  <div className="media-overlay">
                    <div className="who" onClick={(e) => { e.stopPropagation(); if (m.pid) navigate(`/profile/${m.pid}`); }}>
                      <Avatar name={m.who} size={26} />
                      <div><b>{m.who}{person?.verified && <Verified size={12} />}</b><span>{m.role}</span></div>
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
