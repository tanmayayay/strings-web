import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Play, CalendarCheck, MessageCircle, UserPlus, UserCheck, Eye, TrendingUp, Pencil } from 'lucide-react';
import { Avatar, Verified, Tag, EmptyState, Sparkline } from '../components/ui';
import { TrustRow, AvailabilityStrip } from '../components/widgets';
import BookingModal from '../components/BookingModal';
import PostCard from '../components/PostCard';
import { PEOPLE_BY_ID, HOME_FEED, MEDIA_ITEMS, analyticsSeries } from '../data/demo';
import { useStore } from '../store/store';

const TABS = ['Feed', 'Experience', 'Media', 'Connections'];

function Completeness({ person }) {
  const checks = [
    { label: 'Profile photo & bio', done: true },
    { label: 'Skills & stakeholder type', done: true },
    { label: 'Verified profile', done: person.verified },
    { label: 'ID verification', done: person.idVerified },
    { label: 'Availability calendar set', done: true },
    { label: 'Link Instagram / Spotify', done: false },
  ];
  const pct = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  const todo = checks.filter((c) => !c.done);
  return (
    <div className="side-card">
      <div className="completeness">
        <div className="completeness-top"><span>🎯 Gig-ready profile</span><span>{pct}% complete</span></div>
        <div className="completeness-bar"><div className="completeness-fill" style={{ width: `${pct}%` }} /></div>
        {todo.length > 0 && (
          <p className="completeness-tips">Next up: {todo.map((t) => t.label.toLowerCase()).join(' · ')} — complete profiles get 3× more Collab matches.</p>
        )}
      </div>
    </div>
  );
}

function AnalyticsCard({ person }) {
  const series = useMemo(() => analyticsSeries(person.id), [person.id]);
  const total = series.reduce((a, b) => a + b, 0);
  const prev = Math.round(total / 1.18);
  return (
    <div className="side-card">
      <h4><TrendingUp size={15} style={{ color: 'var(--blue)' }} /> Profile analytics <Tag color="indigo">Preview</Tag></h4>
      <div className="analytics-grid">
        <div className="stat-mini"><b>{total.toLocaleString()}</b><span>Profile views · 14d</span><div className="delta">+18% vs prior</div></div>
        <div className="stat-mini"><b>{person.followers.toLocaleString()}</b><span>Followers</span><div className="delta">+{Math.round(person.followers * 0.04)} this week</div></div>
        <div className="stat-mini"><b>{Math.round(total * 0.31).toLocaleString()}</b><span>Search appearances</span><div className="delta">Top 10% in {person.city}</div></div>
      </div>
      <Sparkline data={series} />
      <p style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 8 }}>Full analytics — who viewed, which posts converted — unlocks with Strings Pro (Phase 2).</p>
    </div>
  );
}

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, connected, setConnected, pushToast, bookings, cancelBooking } = useStore();
  const [tab, setTab] = useState('Feed');
  const [playing, setPlaying] = useState(false);
  const [bookingDay, setBookingDay] = useState(null);

  const person = PEOPLE_BY_ID[id] || PEOPLE_BY_ID.meera;
  const isSelf = user?.id === person.id;
  const isConnected = connected.includes(person.id);
  const tabs = isSelf ? [...TABS, 'Bookings'] : TABS;

  const bars = useMemo(() => Array.from({ length: 42 }, (_, i) => 8 + ((i * 37 + person.id.length * 13) % 20)), [person.id]);

  const toggleConnect = () => {
    setConnected(isConnected ? connected.filter((x) => x !== person.id) : [...connected, person.id]);
    pushToast(isConnected ? `Disconnected from ${person.name}.` : `Connected with ${person.name} — say hello!`);
  };

  const feedPosts = HOME_FEED.filter((p) => p.pid === person.id);

  return (
    <div>
      {/* EPK hero */}
      <div className="epk-banner" style={{ background: person.heroGradient }}>
        <div className="epk-top">
          <div>
            <span className="epk-kicker">Electronic Press Kit</span>
            <div className="epk-name">{person.name}</div>
            <p className="epk-tagline">{person.tagline}</p>
          </div>
          <div className="epk-avatar">{person.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
        </div>
        <div className="epk-player" onClick={() => { setPlaying((p) => !p); if (!playing) pushToast('Demo: audio preview would play here.'); }}>
          <div className="epk-play-btn">
            {playing
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="#123B82"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7-11-7z" fill="#123B82" /></svg>}
          </div>
          <div className="epk-waveform">{bars.map((h, i) => <span key={i} style={{ height: h }} />)}</div>
          <span style={{ color: '#fff', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{playing ? 'Playing…' : 'Featured clip'}</span>
        </div>
        <div className="epk-meta-row">
          <div className="epk-meta-item"><b>{person.city}</b><span>Based in</span></div>
          <div className="epk-meta-item"><b>{person.type}</b><span>Stakeholder type</span></div>
          <div className="epk-meta-item"><b>{person.pastGigs}+</b><span>Gigs done</span></div>
          <div className="epk-meta-item"><b>{person.responseRate}%</b><span>Response rate</span></div>
        </div>
      </div>

      {/* Header card */}
      <div className="profile-header">
        <Avatar name={person.name} size={76} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 22, display: 'flex', alignItems: 'center' }}>{person.name}{person.verified && <Verified size={18} />}</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 4 }}>{person.role} · {person.city}</p>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tag color="blue">{person.type}</Tag>
            {person.verified && <Tag color="green">Verified</Tag>}
            {person.followers >= 1000 && <Tag color="sky">{(person.followers / 1000).toFixed(1)}k followers</Tag>}
          </div>
          <TrustRow person={person} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isSelf ? (
            <button className="btn btn-ghost btn-sm" onClick={() => pushToast('Profile editing opens in the full app — Phase 2.')}><Pencil size={14} /> Edit profile</button>
          ) : (
            <>
              <button className={`btn btn-sm ${isConnected ? 'btn-ghost' : 'btn-blue'}`} onClick={toggleConnect}>
                {isConnected ? <><UserCheck size={14} /> Connected</> : <><UserPlus size={14} /> Connect</>}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/messages')}><MessageCircle size={14} /> Message</button>
            </>
          )}
        </div>
      </div>

      {/* Availability */}
      <div className="side-card" style={{ marginBottom: 20 }}>
        <h4><CalendarCheck size={15} style={{ color: 'var(--blue)' }} /> Availability — next 14 days</h4>
        <AvailabilityStrip personId={person.id} onSelectDay={isSelf ? undefined : (day) => setBookingDay(day)} />
      </div>

      <div className="two-col">
        <div>
          <div className="profile-tabs">
            {tabs.map((t) => (
              <button key={t} className={`ptab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          {tab === 'Feed' && (
            feedPosts.length ? feedPosts.map((p) => <PostCard key={p.id} post={p} />)
              : <EmptyState icon={<MessageCircle size={22} />} title="No posts yet" text={`${person.name.split(' ')[0]} hasn't posted anything visible here yet.`} />
          )}
          {tab === 'Experience' && (
            <div className="side-card">
              {person.experience.map((e, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < person.experience.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                  <b style={{ fontSize: 14 }}>{e.title}</b>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{e.org}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{e.period}</div>
                </div>
              ))}
              <div className="divider" />
              <h4 style={{ marginBottom: 8 }}>Skills</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{person.skills.map((s) => <Tag key={s} color="gray">{s}</Tag>)}</div>
            </div>
          )}
          {tab === 'Media' && (
            <div className="media-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              {MEDIA_ITEMS.filter((m) => m.pid === person.id).map((m) => (
                <div className="media-tile" key={m.id}>
                  <div className="media-thumb" style={{ background: m.gradient, aspectRatio: '1' }}>
                    <div className="media-badges-row"><span className="media-kind-badge">{m.kind}</span></div>
                    <div className="media-overlay"><p>{m.caption}</p><div className="media-likes">♥ {m.likes}</div></div>
                  </div>
                </div>
              ))}
              {MEDIA_ITEMS.filter((m) => m.pid === person.id).length === 0 && (
                <div style={{ gridColumn: '1/-1' }}><EmptyState icon={<Play size={22} />} title="No media yet" text="Performance clips and showcases will appear here." /></div>
              )}
            </div>
          )}
          {tab === 'Connections' && (
            <div className="side-card">
              {Object.values(PEOPLE_BY_ID).filter((p) => p.id !== person.id).slice(0, 6).map((p) => (
                <div className="mini-list-item" key={p.id} onClick={() => navigate(`/profile/${p.id}`)}>
                  <Avatar name={p.name} size={34} />
                  <div><b>{p.name}{p.verified && <Verified size={12} />}</b><span>{p.role} · {p.city}</span></div>
                </div>
              ))}
            </div>
          )}
          {tab === 'Bookings' && isSelf && (
            bookings.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck size={22} />}
                title="No booking requests yet"
                text="Visit another artist's profile, find a free day on their availability calendar, and request a booking."
              />
            ) : bookings.map((b) => (
              <div className="post-card booking-row" key={b.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14.5 }}>{b.personName}</b>
                  <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 5 }}>
                    {new Date(b.dateISO).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {b.slot} · {b.budget}
                  </div>
                </div>
                <Tag color="amber">{b.status}</Tag>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => { cancelBooking(b.id); pushToast(`Booking request with ${b.personName} cancelled.`); }}
                >
                  Cancel
                </button>
              </div>
            ))
          )}
        </div>
        <div>
          {isSelf && <Completeness person={person} />}
          {isSelf && <AnalyticsCard person={person} />}
          <div className="side-card">
            <h4><Eye size={15} style={{ color: 'var(--blue)' }} /> About</h4>
            <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.7 }}>{person.bio}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {person.achievements.map((a) => <Tag key={a} color="blue">{a}</Tag>)}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {bookingDay && <BookingModal person={person} day={bookingDay} onClose={() => setBookingDay(null)} />}
      </AnimatePresence>
    </div>
  );
}
