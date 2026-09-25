import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Handshake, Newspaper, Users, Compass } from 'lucide-react';
import { PEOPLE, OPPORTUNITIES, NEWS_ARTICLES, COMMUNITIES } from '../data/demo';
import { Avatar } from './ui';

const PAGES = [
  { label: 'Home', sub: 'Your feed', to: '/home' },
  { label: 'Gighub', sub: 'Discovery feed', to: '/gighub' },
  { label: 'Collab', sub: 'Opportunities marketplace', to: '/collab' },
  { label: 'Community', sub: 'Circles & walls', to: '/community' },
  { label: 'News', sub: 'Daily industry headlines', to: '/news' },
  { label: 'Messages', sub: 'Conversations', to: '/messages' },
  { label: 'Live', sub: 'Coming soon', to: '/live' },
  { label: 'Saved', sub: 'Your bookmarks', to: '/saved' },
  { label: 'Settings', sub: 'Privacy & preferences', to: '/settings' },
  { label: 'About Strings', sub: 'Mission & story', to: '/about' },
  { label: 'Help & Legal', sub: 'Support centre', to: '/support' },
];

/* ⌘K command-palette global search */
export default function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 40); }
  }, [open ]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const groups = [];
    const push = (label, icon, items) => { if (items.length) groups.push({ label, icon, items: items.slice(0, 5) }); };
    if (!query) {
      push('Pages', Compass, PAGES.slice(0, 6).map((p) => ({ ...p, kind: 'page' })));
      push('People', User, PEOPLE.slice(0, 4).map((p) => ({ label: p.name, sub: `${p.role} · ${p.city}`, to: `/profile/${p.id}`, kind: 'person', person: p })));
      return groups;
    }
    push('People', User, PEOPLE.filter((p) => (p.name + p.role + p.city + p.type).toLowerCase().includes(query))
      .map((p) => ({ label: p.name, sub: `${p.role} · ${p.city}`, to: `/profile/${p.id}`, kind: 'person', person: p })));
    push('Opportunities', Handshake, OPPORTUNITIES.filter((o) => (o.title + o.desc + o.city + o.type).toLowerCase().includes(query))
      .map((o) => ({ label: o.title, sub: `${o.type} · ${o.city}`, to: '/collab', kind: 'opp' })));
    push('News', Newspaper, NEWS_ARTICLES.filter((a) => (a.title + a.deck).toLowerCase().includes(query))
      .map((a) => ({ label: a.title, sub: `${a.cat} · ${a.time}`, to: `/news/${a.id}`, kind: 'article' })));
    push('Communities', Users, COMMUNITIES.filter((c) => (c.name + c.desc).toLowerCase().includes(query))
      .map((c) => ({ label: c.name, sub: `${c.members.toLocaleString()} members`, to: '/community', kind: 'community' })));
    push('Pages', Compass, PAGES.filter((p) => p.label.toLowerCase().includes(query)).map((p) => ({ ...p, kind: 'page' })));
    return groups;
  }, [q]);

  const flat = useMemo(() => results.flatMap((g) => g.items), [results]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && flat[sel]) { navigate(flat[sel].to); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, flat, sel, navigate, onClose]);

  if (!open) return null;
  return (
    <div className="cmdk-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cmdk" role="dialog" aria-label="Search Strings">
        <div className="cmdk-input-row">
          <Search size={17} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            placeholder="Search people, venues, opportunities, news…"
          />
          <kbd style={{ fontSize: 11, color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 7px' }}>esc</kbd>
        </div>
        <div className="cmdk-results">
          {flat.length === 0 && <div className="cmdk-empty">No matches — try “guitar”, “Mumbai” or “wedding”.</div>}
          {results.map((g) => (
            <div key={g.label}>
              <div className="cmdk-group-label">{g.label}</div>
              {g.items.map((it) => {
                const idx = flat.indexOf(it);
                return (
                  <button
                    key={it.to + it.label}
                    className={`cmdk-item${idx === sel ? ' selected' : ''}`}
                    onMouseEnter={() => setSel(idx)}
                    onClick={() => { navigate(it.to); onClose(); }}
                  >
                    {it.kind === 'person' ? <Avatar name={it.label} size={32} /> : <g.icon size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</b>
                      <span>{it.sub}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
