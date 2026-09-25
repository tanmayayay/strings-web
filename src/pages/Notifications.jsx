import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { PageHead, EmptyState } from '../components/ui';
import { NOTIFICATIONS } from '../data/demo';
import { useStore } from '../store/store';

const FILTERS = [['all', 'All'], ['message', 'Messages'], ['follow', 'Connections'], ['opportunity', 'Opportunities'], ['engagement', 'Engagement']];

const FALLBACK_BY_KIND = {
  message: '/messages',
  follow: '/profile/meera',
  opportunity: '/collab',
  engagement: '/profile/meera',
  news: '/news',
};

export default function Notifications() {
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const { readNotifs, setReadNotifs, extraNotifs } = useStore();
  const all = [...extraNotifs, ...NOTIFICATIONS];
  const list = all.filter((n) => filter === 'all' || n.kind === filter);

  const markAll = () => setReadNotifs(all.map((n) => n.id));

  const openNotif = (n) => {
    if (!readNotifs.includes(n.id)) setReadNotifs([...readNotifs, n.id]);
    navigate(n.link || FALLBACK_BY_KIND[n.kind] || '/');
  };

  return (
    <div>
      <PageHead
        title="Notifications"
        sub="Everything relevant to your profile, in one place."
        action={<button className="btn btn-ghost btn-sm" onClick={markAll}><CheckCheck size={14} /> Mark all read</button>}
      />
      <div className="filter-row">
        {FILTERS.map(([v, l]) => (
          <button key={v} className={`filter-chip${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Bell size={22} />} title="Nothing here" text="Try a different filter." />
      ) : list.map((n) => {
        const read = readNotifs.includes(n.id);
        return (
          <div
            key={n.id}
            className="post-card"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', opacity: read ? 0.75 : 1 }}
            onClick={() => openNotif(n)}
          >
            {!read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', marginTop: 6, flexShrink: 0 }} />}
            <div>
              <div style={{ fontSize: 13.5 }} dangerouslySetInnerHTML={{ __html: n.text }} />
              <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{n.time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
