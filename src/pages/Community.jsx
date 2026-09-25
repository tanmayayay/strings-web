import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, MessageCircle } from 'lucide-react';
import { PageHead, Avatar } from '../components/ui';
import { COMMUNITIES } from '../data/demo';
import { useStore } from '../store/store';

export default function Community() {
  const { joined, setJoined, wallExtra, setWallExtra, user, pushToast } = useStore();
  const navigate = useNavigate();
  const [wallId, setWallId] = useState(null);
  const [draft, setDraft] = useState('');

  const toggleJoin = (id) => {
    const has = joined.includes(id);
    setJoined(has ? joined.filter((x) => x !== id) : [...joined, id]);
    pushToast(has ? 'Left the community.' : 'Joined — say hello on the wall.');
  };

  const openWall = (id) => { setWallId(id); setDraft(''); };
  const community = COMMUNITIES.find((c) => c.id === wallId);
  const extra = wallExtra[wallId] || [];
  const wall = community ? [...extra, ...community.wall] : [];

  const postToWall = () => {
    if (!draft.trim() || !community) return;
    const entry = { who: user?.name || 'Demo User', pid: user?.id || null, time: 'now', body: draft.trim(), replies: 0 };
    setWallExtra({ ...wallExtra, [wallId]: [entry, ...extra] });
    setDraft('');
    pushToast('Posted to the wall.');
  };

  if (community) {
    return (
      <div>
        <button className="wall-back" onClick={() => setWallId(null)}>
          <ArrowLeft size={15} /> Back to communities
        </button>
        <div className="wall-header">
          <div className="community-icon" style={{ background: 'var(--blue-dim)', marginBottom: 0 }}>{community.icon}</div>
          <div>
            <h3 style={{ fontSize: 19 }}>{community.name}</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 2 }}>{community.members.toLocaleString()} members · {community.desc}</p>
          </div>
          <button
            className={`btn btn-sm ${joined.includes(community.id) ? 'btn-ghost' : 'btn-blue'}`}
            style={{ marginLeft: 'auto' }}
            onClick={() => toggleJoin(community.id)}
          >
            {joined.includes(community.id) ? <><Check size={14} /> Joined</> : 'Join'}
          </button>
        </div>
        <div className="composer">
          <Avatar name={user?.name || 'Guest'} size={36} />
          <input type="text" placeholder="Start a discussion…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && postToWall()} />
          <button className="btn btn-blue btn-sm" onClick={postToWall}>Post</button>
        </div>
        {wall.map((w, i) => (
          <div className="post-card" key={i}>
            <div className="post-head">
              <Avatar name={w.who} size={36} />
              <div className="who" onClick={() => w.pid && navigate(`/profile/${w.pid}`)} style={w.pid ? { cursor: 'pointer' } : undefined}>
                <b>{w.who}</b><span>{w.time}</span>
              </div>
            </div>
            <div className="post-body">{w.body}</div>
            <div className="post-actions">
              <span style={{ color: 'var(--text-faint)', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageCircle size={14} /> {w.replies} replies
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <PageHead title="Community" sub="Join a circle built around your instrument or role, and talk shop on the wall." />
      <div className="community-grid">
        {COMMUNITIES.map((c) => {
          const isJ = joined.includes(c.id);
          return (
            <div className="community-card" key={c.id}>
              <div className="community-icon" style={{ background: 'var(--blue-dim)' }}>{c.icon}</div>
              <h4>{c.name}</h4>
              <p className="desc">{c.desc}</p>
              <div className="meta-row">
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{c.members.toLocaleString()} members</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openWall(c.id)}>View wall</button>
                  <button className={`btn btn-sm ${isJ ? 'btn-ghost' : 'btn-blue'}`} onClick={() => toggleJoin(c.id)}>
                    {isJ ? <><Check size={14} /> Joined</> : 'Join'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
