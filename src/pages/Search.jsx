import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, MapPin, ExternalLink } from 'lucide-react';
import { PageHead, Avatar, Tag, Verified, EmptyState } from '../components/ui';
import { MatchScore } from '../components/widgets';
import { PEOPLE, OPPORTUNITIES, CITIES } from '../data/demo';
import { liveVenues, viaLabel } from '../data/liveData';
import { useStore } from '../store/store';

export default function Search() {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [city, setCity] = useState('all');
  const [type, setType] = useState('all');
  const { user } = useStore();
  const navigate = useNavigate();

  const ql = q.toLowerCase();
  const people = PEOPLE.filter((p) =>
    (city === 'all' || p.city === city) && (type === 'all' || p.type === type) &&
    (!ql || (p.name + p.role + p.city + p.type + p.skills.join(' ')).toLowerCase().includes(ql))
  );
  const opps = OPPORTUNITIES.filter((o) =>
    (city === 'all' || o.city === city) && (type === 'all' || o.type === type) &&
    (!ql || (o.title + o.desc + o.city).toLowerCase().includes(ql))
  );
  const venues = liveVenues.filter((v) =>
    (city === 'all' || (v.city || '') === city) &&
    (!ql || ((v.name || '') + ' ' + (v.city || '') + ' ' + (v.type || '')).toLowerCase().includes(ql))
  );

  return (
    <div>
      <PageHead title="Search" sub="Unified search across people, venues and opportunities." />
      <div className="composer">
        <SearchIcon size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
        <input type="text" placeholder="Search by name, skill, or opportunity…" value={q} onChange={(e) => setQ(e.target.value)} style={{ background: 'none', border: 'none' }} autoFocus />
      </div>
      <div className="filter-row">
        {[['all', 'All results'], ['people', 'People & venues'], ['opportunities', 'Opportunities']].map(([v, l]) => (
          <button key={v} className={`filter-chip${tab === v ? ' active' : ''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>
      <div className="filter-row">
        <select className="filter-select" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="all">All cities</option>{CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">Any type</option><option>Performer</option><option>Crew</option><option>Venue</option><option>Institution</option><option>Buyer</option>
        </select>
      </div>

      {(tab === 'all' || tab === 'people') && (
        <>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '22px 0 12px' }}>People & venues ({people.length})</h4>
          {people.length === 0 ? <EmptyState icon={<SearchIcon size={22} />} title="No people found" text="Try a different name, skill or city." /> : people.map((p) => (
            <div className="mini-list-item card" key={p.id} style={{ padding: '12px 14px', marginBottom: 10 }} onClick={() => navigate(`/profile/${p.id}`)}>
              <Avatar name={p.name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'flex', alignItems: 'center' }}>{p.name}{p.verified && <Verified size={13} />}</b>
                <span>{p.role} · <MapPin size={10} style={{ verticalAlign: -1 }} /> {p.city}</span>
              </div>
              <Tag color="sky">{p.type}</Tag>
            </div>
          ))}
        </>
      )}

      {liveVenues.length > 0 && (tab === 'all' || tab === 'people') && (
        <>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '22px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            Real venues <Tag color="indigo">Live data</Tag>
            <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>({venues.length})</span>
          </h4>
          {venues.map((v, i) => (
            <div className="mini-list-item card" key={v.id || `${v.name || 'venue'}-${i}`} style={{ padding: '12px 14px', marginBottom: 10, cursor: 'default' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{v.name || 'Unnamed venue'}</b>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={10} style={{ verticalAlign: -1 }} /> {v.city || 'India'}
                </span>
              </div>
              {v.type && <Tag color="sky">{v.type}</Tag>}
              <Tag color="indigo">{viaLabel(v, 'OpenStreetMap')}</Tag>
              {v.source_url && (
                <a href={v.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs" style={{ flexShrink: 0 }}>
                  Source <ExternalLink size={12} />
                </a>
              )}
            </div>
          ))}
        </>
      )}

      {(tab === 'all' || tab === 'opportunities') && (
        <>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '22px 0 12px' }}>Open opportunities ({opps.length})</h4>
          {opps.length === 0 ? <EmptyState icon={<SearchIcon size={22} />} title="No opportunities found" text="Try widening your filters." /> : opps.map((o) => (
            <div className="opp-card" key={o.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <b style={{ fontSize: 14.5 }}>{o.title}</b>
                  <div style={{ margin: '6px 0' }}><Tag color="blue">{o.type}</Tag> <Tag color="sky">{o.city}</Tag></div>
                  <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{o.desc}</p>
                </div>
                <MatchScore opp={o} viewerId={user?.id || 'meera'} />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
