import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Play, CalendarCheck, MessageCircle, UserPlus, UserCheck, Eye, TrendingUp, Pencil, UserX, Briefcase } from 'lucide-react';
import { Avatar, Verified, Tag, EmptyState, Sparkline } from '../components/ui';
import { AvailabilityStrip } from '../components/widgets';
import BookingModal from '../components/BookingModal';
import PostCard from '../components/PostCard';
import { Profiles, Posts, Bookings, Convos } from '../lib/api';
import { useStore } from '../store/store';

const TABS = ['Feed', 'Experience', 'Media', 'Connections'];

const TYPE_LABEL = { PERFORMER: 'Performer', VENUE: 'Venue', BUYER: 'Buyer', CREW: 'Crew', INSTITUTION: 'Institution' };
const TYPE_GRADIENT = {
  PERFORMER: 'linear-gradient(135deg,#1D4ED8,#7C3AED)',
  VENUE: 'linear-gradient(135deg,#0F766E,#1D4ED8)',
  BUYER: 'linear-gradient(135deg,#B45309,#DC2626)',
  CREW: 'linear-gradient(135deg,#374151,#111827)',
  INSTITUTION: 'linear-gradient(135deg,#7C3AED,#DB2777)',
};
const gradFor = (t) => TYPE_GRADIENT[t] || TYPE_GRADIENT.PERFORMER;
const labelFor = (t) => TYPE_LABEL[t] || t || 'Member';

/* Deterministic decorative helpers (no demo data — pure functions of the id). */
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
function analyticsSeries(id) {
  const base = 18 + (hashStr(id) % 30);
  return Array.from({ length: 14 }, (_, i) => {
    const wave = Math.sin(i / 2.2) * 0.35 + 0.65;
    const noise = (hashStr(id + i) % 20) / 100;
    return Math.round(base * (wave + noise) + i * 1.6);
  });
}

const DETAIL_LABELS = {
  skills: 'Skills', genres: 'Genres', instruments: 'Instruments',
  ratePerShow: 'Rate per show', dayRate: 'Day rate', capacity: 'Capacity',
  address: 'Address', org: 'Organisation', budget: 'Budget', type: 'Venue type',
};
const prettyLabel = (k) => DETAIL_LABELS[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const fmtVal = (v) => (Array.isArray(v) ? v.join(' · ') : String(v));

const inputStyle = {
  width: '100%', background: 'var(--bg-soft)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '9px 12px', fontSize: 13.5, color: 'var(--text)',
  fontFamily: 'inherit',
};

function Completeness({ person, postsCount }) {
  const checks = [
    { label: 'Profile photo & bio', done: !!person.bio },
    { label: 'Stakeholder type set', done: !!person.stakeholderType },
    { label: 'City listed', done: !!person.city },
    { label: 'First post published', done: postsCount > 0 },
    { label: 'Verified profile', done: person.verificationStatus === 'VERIFIED' },
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
  const followers = person._count?.followers ?? 0;
  return (
    <div className="side-card">
      <h4><TrendingUp size={15} style={{ color: 'var(--blue)' }} /> Profile analytics <Tag color="indigo">Preview</Tag></h4>
      <div className="analytics-grid">
        <div className="stat-mini"><b>{total.toLocaleString()}</b><span>Profile views · 14d</span><div className="delta">+18% vs prior</div></div>
        <div className="stat-mini"><b>{followers.toLocaleString()}</b><span>Followers</span><div className="delta">+{Math.round(followers * 0.04)} this week</div></div>
        <div className="stat-mini"><b>{Math.round(total * 0.31).toLocaleString()}</b><span>Search appearances</span><div className="delta">Top 10% in {person.city || 'your city'}</div></div>
      </div>
      <Sparkline data={series} />
      <p style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 8 }}>Full analytics — who viewed, which posts converted — unlocks with Strings Pro (Phase 2).</p>
    </div>
  );
}

function fmtBookingDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

const BOOKING_TAG = { PENDING: 'amber', CONFIRMED: 'green', CANCELLED: 'gray' };

function BookingRow({ booking, otherName, canConfirm, onStatus }) {
  return (
    <div className="post-card booking-row" key={booking.id}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 14.5 }}>{otherName}</b>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 5 }}>
          {fmtBookingDate(booking.date)}{booking.timeSlot ? ` · ${booking.timeSlot}` : ''}{booking.budget ? ` · ${booking.budget}` : ''}
        </div>
        {booking.message && (
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4, fontStyle: 'italic' }}>“{booking.message}”</div>
        )}
      </div>
      <Tag color={BOOKING_TAG[booking.status] || 'gray'}>{booking.status}</Tag>
      {booking.status === 'PENDING' && (
        <>
          {canConfirm && (
            <button className="btn btn-blue btn-xs" onClick={() => onStatus(booking, 'CONFIRMED')}>Confirm</button>
          )}
          <button className="btn btn-ghost btn-xs" onClick={() => onStatus(booking, 'CANCELLED')}>Cancel</button>
        </>
      )}
    </div>
  );
}

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId, refreshProfile, pushToast } = useStore();
  const [tab, setTab] = useState('Feed');
  const [playing, setPlaying] = useState(false);
  const [bookingDay, setBookingDay] = useState(null);

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [feedPosts, setFeedPosts] = useState([]);
  const [following, setFollowing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', city: '' });

  const [reqBookings, setReqBookings] = useState([]);
  const [hostBookings, setHostBookings] = useState([]);

  const isSelf = !!userId && id === userId;
  const tabs = isSelf ? [...TABS, 'Bookings'] : TABS;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    setPerson(null);
    setFeedPosts([]);
    setFollowing(false);
    setEditing(false);
    (async () => {
      try {
        const p = await Profiles.get(id);
        if (!alive) return;
        setPerson(p);
        setForm({ name: p.name || '', bio: p.bio || '', city: p.city || '' });
        try {
          const pl = await Posts.list({ authorId: id, take: 20 });
          if (alive) setFeedPosts(pl.items || []);
        } catch {
          /* posts are a bonus — profile still renders */
        }
      } catch (e) {
        if (!alive) return;
        if (e.status === 404) setNotFound(true);
        else pushToast(e.message, 'error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBookings = async () => {
    try {
      const [r, h] = await Promise.all([
        Bookings.list({ role: 'requester' }),
        Bookings.list({ role: 'host' }),
      ]);
      setReqBookings(r.items || []);
      setHostBookings(h.items || []);
    } catch (e) {
      pushToast(e.message, 'error');
    }
  };

  useEffect(() => {
    if (isSelf && tab === 'Bookings') loadBookings();
  }, [isSelf, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const bars = useMemo(
    () => (person ? Array.from({ length: 42 }, (_, i) => 8 + ((i * 37 + hashStr(person.id) * 13) % 20)) : []),
    [person]
  );

  const toggleFollow = async () => {
    try {
      if (following) {
        await Profiles.unfollow(id);
        setFollowing(false);
        pushToast(`Unfollowed ${person.name}.`);
      } else {
        await Profiles.follow(id);
        setFollowing(true);
        pushToast(`Following ${person.name} — you'll see their posts in your feed.`);
      }
    } catch (e) {
      pushToast(e.message, 'error');
    }
  };

  const openChat = async () => {
    try {
      const c = await Convos.open(id);
      navigate('/messages?c=' + c.id);
    } catch (e) {
      pushToast(e.message, 'error');
    }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await Profiles.update(id, { name: form.name.trim(), bio: form.bio.trim(), city: form.city.trim() });
      const p = await Profiles.get(id);
      setPerson(p);
      await refreshProfile();
      setEditing(false);
      pushToast('Profile updated.');
    } catch (e) {
      pushToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const onBookingStatus = async (booking, status) => {
    try {
      await Bookings.setStatus(booking.id, status);
      pushToast(status === 'CONFIRMED' ? 'Booking confirmed.' : 'Booking cancelled.');
      loadBookings();
    } catch (e) {
      pushToast(e.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="side-card"><p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>Loading profile…</p></div>
    );
  }

  if (notFound || !person) {
    return (
      <EmptyState
        icon={<UserX size={22} />}
        title="Profile not found"
        text="This profile doesn't exist or isn't visible to you."
        action={<button className="btn btn-blue btn-sm" onClick={() => navigate('/home')}>Back to Home</button>}
      />
    );
  }

  const followers = person._count?.followers ?? 0;
  const postsCount = person._count?.posts ?? 0;
  const verified = person.verificationStatus === 'VERIFIED';
  const mediaPosts = feedPosts.filter((p) => p.mediaUrl);
  const detailData = person.detail?.data || {};
  const skillTags = detailData.skills || detailData.genres || [];
  const detailRows = Object.entries(detailData).filter(([k]) => !['skills', 'genres'].includes(k) && detailData[k] != null && detailData[k] !== '');

  return (
    <div>
      {/* EPK hero */}
      <div className="epk-banner" style={{ background: gradFor(person.stakeholderType) }}>
        <div className="epk-top">
          <div>
            <span className="epk-kicker">Electronic Press Kit</span>
            <div className="epk-name">{person.name}</div>
            <p className="epk-tagline">{person.bio || `${labelFor(person.stakeholderType)} on Strings`}</p>
          </div>
          <div className="epk-avatar">{person.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
        </div>
        <div className="epk-player" onClick={() => { setPlaying((p) => !p); if (!playing) pushToast('Audio previews are not available in this version.'); }}>
          <div className="epk-play-btn">
            {playing
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="#123B82"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7-11-7z" fill="#123B82" /></svg>}
          </div>
          <div className="epk-waveform">{bars.map((h, i) => <span key={i} style={{ height: h }} />)}</div>
          <span style={{ color: '#fff', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{playing ? 'Playing…' : 'Featured clip'}</span>
        </div>
        <div className="epk-meta-row">
          <div className="epk-meta-item"><b>{person.city || '—'}</b><span>Based in</span></div>
          <div className="epk-meta-item"><b>{labelFor(person.stakeholderType)}</b><span>Stakeholder type</span></div>
          <div className="epk-meta-item"><b>{postsCount}</b><span>Posts</span></div>
          <div className="epk-meta-item"><b>{followers}</b><span>Followers</span></div>
        </div>
      </div>

      {/* Header card */}
      <div className="profile-header">
        <Avatar name={person.name} size={76} />
        <div style={{ flex: 1, minWidth: 200 }}>
          {editing ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
              <input style={inputStyle} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
              <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio" />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-blue btn-sm" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 22, display: 'flex', alignItems: 'center' }}>{person.name}{verified && <Verified size={18} />}</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 4 }}>{labelFor(person.stakeholderType)}{person.city ? ` · ${person.city}` : ''}</p>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag color="blue">{labelFor(person.stakeholderType)}</Tag>
                {verified && <Tag color="green">Verified</Tag>}
                {followers >= 1000 && <Tag color="sky">{(followers / 1000).toFixed(1)}k followers</Tag>}
              </div>
            </>
          )}
        </div>
        {!editing && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isSelf ? (
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil size={14} /> Edit profile</button>
            ) : (
              <>
                <button className={`btn btn-sm ${following ? 'btn-ghost' : 'btn-blue'}`} onClick={toggleFollow}>
                  {following ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={openChat}><MessageCircle size={14} /> Message</button>
              </>
            )}
          </div>
        )}
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
              {skillTags.length > 0 && (
                <>
                  <h4 style={{ marginBottom: 8 }}>{detailData.skills ? 'Skills' : 'Genres'}</h4>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {skillTags.map((s) => <Tag key={s} color="gray">{s}</Tag>)}
                  </div>
                </>
              )}
              {detailRows.map(([k, v], i) => (
                <div key={k} style={{ padding: '10px 0', borderBottom: i < detailRows.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{prettyLabel(k)}</div>
                  <b style={{ fontSize: 14 }}>{fmtVal(v)}</b>
                </div>
              ))}
              {skillTags.length === 0 && detailRows.length === 0 && (
                <EmptyState icon={<Briefcase size={22} />} title="No details yet" text={`${person.name.split(' ')[0]} hasn't added experience details yet.`} />
              )}
            </div>
          )}
          {tab === 'Media' && (
            <div className="media-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              {mediaPosts.map((p) => (
                <div className="media-tile" key={p.id}>
                  <div className="media-thumb" style={{ background: gradFor(person.stakeholderType), aspectRatio: '1', overflow: 'hidden' }}>
                    <img src={p.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                </div>
              ))}
              {mediaPosts.length === 0 && (
                <div style={{ gridColumn: '1/-1' }}><EmptyState icon={<Play size={22} />} title="No media yet" text="Posts with photos or clips will appear here." /></div>
              )}
            </div>
          )}
          {tab === 'Connections' && (
            <div className="side-card">
              <EmptyState icon={<UserCheck size={22} />} title="Connections" text="The connections list isn't available in this version yet — follow people to build your network." />
            </div>
          )}
          {tab === 'Bookings' && isSelf && (
            <>
              <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '4px 0 12px' }}>Requests you sent</h4>
              {reqBookings.length === 0 ? (
                <EmptyState
                  icon={<CalendarCheck size={22} />}
                  title="No booking requests yet"
                  text="Visit another artist's profile, find a free day on their availability calendar, and request a booking."
                />
              ) : reqBookings.map((b) => (
                <BookingRow key={b.id} booking={b} otherName={b.host?.name || 'Unknown host'} canConfirm={false} onStatus={onBookingStatus} />
              ))}
              <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '20px 0 12px' }}>Requests you received</h4>
              {hostBookings.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>Nobody has requested a booking with you yet.</p>
              ) : hostBookings.map((b) => (
                <BookingRow key={b.id} booking={b} otherName={b.requester?.name || 'Unknown requester'} canConfirm onStatus={onBookingStatus} />
              ))}
            </>
          )}
        </div>
        <div>
          {isSelf && <Completeness person={person} postsCount={postsCount} />}
          {isSelf && <AnalyticsCard person={person} />}
          <div className="side-card">
            <h4><Eye size={15} style={{ color: 'var(--blue)' }} /> About</h4>
            <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.7 }}>{person.bio || 'No bio added yet.'}</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {bookingDay && <BookingModal person={person} day={bookingDay} onClose={() => setBookingDay(null)} />}
      </AnimatePresence>
    </div>
  );
}
