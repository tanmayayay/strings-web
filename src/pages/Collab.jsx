import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Plus, MapPin, Wallet, Users as UsersIcon, Check, Bookmark, Briefcase } from 'lucide-react';
import { PageHead, Avatar, Tag, EmptyState, Verified } from '../components/ui';
import { MatchScore, ReferralCard } from '../components/widgets';
import { OPPORTUNITIES, PEOPLE, CITIES, PEOPLE_BY_ID } from '../data/demo';
import { useStore } from '../store/store';

function OppSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div className="skel-card" key={i}>
          <div className="skel-line shimmer-strip" style={{ width: '55%' }} />
          <div className="skel-line shimmer-strip" style={{ width: '32%' }} />
          <div className="skel-line shimmer-strip" style={{ width: '88%' }} />
        </div>
      ))}
    </>
  );
}

export default function Collab() {
  const { applied, setApplied, userOpps, isBookmarked, toggleBookmark, pushToast, connected, setConnected, user } = useStore();
  const { openOpp } = useOutletContext();
  const navigate = useNavigate();
  const [typeF, setTypeF] = useState('all');
  const [cityF, setCityF] = useState('all');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const allOpps = useMemo(() => [...userOpps, ...OPPORTUNITIES], [userOpps]);
  const list = allOpps.filter((o) =>
    (typeF === 'all' || o.type === typeF) && (cityF === 'all' || o.city === cityF)
  );
  // sort by AI match score for the demo user
  const sorted = useMemo(() => {
    const scoreOf = (o) => {
      let s = 52;
      if (o.type === 'Performer') s += 17;
      if (o.city === 'Mumbai') s += 13;
      return s;
    };
    return [...list].sort((a, b) => scoreOf(b) - scoreOf(a));
  }, [list]);

  const apply = (opp) => {
    if (applied.includes(opp.id)) return;
    setApplied([...applied, opp.id]);
    pushToast(`Applied to “${opp.title}”. The poster usually responds within 2 days.`);
  };

  const recs = PEOPLE.filter((p) => p.id !== 'meera').slice(0, 4);

  return (
    <div>
      <PageHead
        title="Collab"
        sub="Find or post opportunities — gigs, session work, and crew requirements. Sorted by your AI match."
        action={<button className="btn btn-blue btn-sm" onClick={openOpp}><Plus size={14} /> Post an opportunity</button>}
      />
      <div className="two-col">
        <div>
          <div className="filter-row">
            <select className="filter-select" value={typeF} onChange={(e) => setTypeF(e.target.value)}>
              <option value="all">All types</option><option>Performer</option><option>Crew</option><option>Venue</option>
            </select>
            <select className="filter-select" value={cityF} onChange={(e) => setCityF(e.target.value)}>
              <option value="all">All cities</option>{CITIES.slice(0, 5).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {loading ? (
            <OppSkeleton />
          ) : sorted.length === 0 ? (
            <EmptyState icon={<Briefcase size={22} />} title="No opportunities match" text="Try widening your filters — new call-outs land here daily." />
          ) : sorted.map((o) => {
            const done = applied.includes(o.id);
            const saved = isBookmarked('opp', o.id);
            const poster = o.postedBy ? PEOPLE_BY_ID[o.postedBy] : null;
            return (
              <div className="opp-card" key={o.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 15.5 }}>{o.title}</b>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Tag color="blue">{o.type}</Tag>
                      <Tag color="sky"><MapPin size={11} /> {o.city}</Tag>
                      {o.budget && <Tag color="gray"><Wallet size={11} /> {o.budget}</Tag>}
                    </div>
                  </div>
                  <MatchScore opp={o} viewerId={user?.id || 'meera'} />
                </div>
                <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 12 }}>{o.desc}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  {poster ? (
                    <button onClick={() => navigate(`/profile/${poster.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0 }}>
                      <Avatar name={poster.name} size={26} />
                      <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Posted by <b style={{ color: 'var(--text)' }}>{poster.name}</b>{poster.verified && <Verified size={12} />}</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Posted by <b style={{ color: 'var(--text)' }}>{o.posted}</b></span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 4 }}><UsersIcon size={12} /> {o.applicants} applied</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button
                      className={`btn btn-xs ${saved ? 'btn-ghost' : 'btn-ghost'}`}
                      onClick={() => { const s = toggleBookmark('opp', o.id); pushToast(s ? 'Saved to your bookmarks.' : 'Removed from bookmarks.'); }}
                      style={saved ? { color: 'var(--amber)', borderColor: 'var(--amber)' } : undefined}
                    >
                      <Bookmark size={13} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
                    </button>
                    <button className={`btn btn-sm ${done ? 'btn-ghost' : 'btn-blue'}`} disabled={done} onClick={() => apply(o)}>
                      {done ? <><Check size={14} /> Applied</> : 'Apply'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <div className="side-card">
            <h4>Recommended connections</h4>
            {recs.map((p) => {
              const isC = connected.includes(p.id);
              return (
                <div className="mini-list-item" key={p.id}>
                  <span onClick={() => navigate(`/profile/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <Avatar name={p.name} size={30} />
                    <div style={{ minWidth: 0 }}><b>{p.name}{p.verified && <Verified size={12} />}</b><span>{p.role} · {p.city}</span></div>
                  </span>
                  <button
                    className={`btn btn-xs ${isC ? 'btn-ghost' : 'btn-blue'}`}
                    onClick={() => {
                      setConnected(isC ? connected.filter((x) => x !== p.id) : [...connected, p.id]);
                      if (!isC) pushToast(`Connected with ${p.name}.`);
                    }}
                  >
                    {isC ? 'Connected' : 'Connect'}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="side-card">
            <h4>Your applications</h4>
            {applied.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Apply to an opportunity to track it here.</p>
            ) : applied.map((id) => {
              const o = allOpps.find((x) => x.id === id);
              return o ? (
                <div className="mini-list-item" key={id} style={{ cursor: 'default' }}>
                  <Tag color="sky">Pending</Tag>
                  <div><b style={{ fontWeight: 500 }}>{o.title}</b><span>{o.city}</span></div>
                </div>
              ) : null;
            })}
          </div>
          <ReferralCard />
        </div>
      </div>
    </div>
  );
}
