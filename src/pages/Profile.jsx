import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, MessageCircle, UserPlus, UserCheck, Pencil, UserX, MapPin, Camera, Inbox, Image as ImageIcon, Check,
} from 'lucide-react';
import { Avatar, Verified, EmptyState } from '../components/ui';
import BookingModal from '../components/BookingModal';
import PostCard from '../components/PostCard';
import Availability from '../components/profile/Availability';
import RoleDetails from '../components/profile/RoleDetails';
import EditProfile from '../components/profile/EditProfile';
import Insights from '../components/profile/Insights';
import Requests from '../components/profile/Requests';
import { Profiles, Posts, Bookings, Convos } from '../lib/api';
import { useStore } from '../store/store';
import { uploadAvatar } from '../lib/uploadImage';
import { metaFor, glanceFacts, headlineOf, completeness } from '../lib/profileSchema';
import '../components/profile/profile.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const compact = (n) => (n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function Strength({ person, postsCount }) {
  const { checks, pct } = completeness(person, { postsCount });
  const todo = checks.filter((c) => !c.done);
  return (
    <div className="pf-card">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div className="pf-ring" style={{ '--p': pct }}><i>{pct}%</i></div>
        <div>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Profile strength</b>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2 }}>{todo.length ? `${todo.length} step${todo.length === 1 ? '' : 's'} to a complete profile` : 'Your profile is complete'}</div>
        </div>
      </div>
      <ul className="pf-todo">
        {checks.map((c) => (
          <li key={c.label} className={c.done ? 'done' : ''}><span className="tick">{c.done && <Check size={11} strokeWidth={3} />}</span>{c.label}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { userId, user, refreshProfile, pushToast } = useStore();

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [feedPosts, setFeedPosts] = useState([]);
  const [following, setFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bookingDay, setBookingDay] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const photoInput = useRef(null);

  const isSelf = !!userId && id === userId;
  const tab = params.get('tab') || 'overview';
  const setTab = (t) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  const load = async () => {
    const p = await Profiles.get(id);
    setPerson(p);
    return p;
  };

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
        Posts.list({ authorId: id, take: 20 }).then((pl) => { if (alive) setFeedPosts(pl.items || []); }).catch(() => {});
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

  // Whether the signed-in person already follows this profile.
  useEffect(() => {
    if (!userId || isSelf) return;
    let alive = true;
    Profiles.following().then((r) => { if (alive) setFollowing((r.items || []).some((p) => p.id === id)); }).catch(() => {});
    return () => { alive = false; };
  }, [id, userId, isSelf]);

  const loadRequests = async () => {
    setReqLoading(true);
    try {
      const [h, r] = await Promise.all([Bookings.list({ role: 'host', take: 50 }), Bookings.list({ role: 'requester', take: 50 })]);
      setReceived(h.items || []);
      setSent(r.items || []);
    } catch (e) {
      pushToast(e.message, 'error');
    } finally {
      setReqLoading(false);
    }
  };
  useEffect(() => { if (isSelf) loadRequests(); }, [isSelf]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = useMemo(() => received.filter((b) => b.status === 'PENDING').length, [received]);

  const toggleFollow = async () => {
    try {
      if (following) { await Profiles.unfollow(id); setFollowing(false); pushToast(`Unfollowed ${person.name}.`); }
      else { await Profiles.follow(id); setFollowing(true); pushToast(`Following ${person.name} — you'll see their posts in your feed.`); }
    } catch (e) { pushToast(e.message, 'error'); }
  };

  const openChat = async () => {
    try { const c = await Convos.open(id); navigate('/messages?c=' + c.id); }
    catch (e) { pushToast(e.message, 'error'); }
  };

  const onStatus = async (booking, status) => {
    try {
      await Bookings.setStatus(booking.id, status);
      pushToast(status === 'CONFIRMED' ? 'Booking confirmed — the day is now blocked on your calendar.' : 'Request updated.');
      loadRequests();
    } catch (e) { pushToast(e.message, 'error'); }
  };

  const quickPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(file, user?.authId || userId);
      await Profiles.update(id, { avatarUrl: url });
      await load();
      await refreshProfile();
      pushToast('Profile photo updated.');
    } catch (e) { pushToast(e.message || 'Could not update your photo.', 'error'); }
    finally { setUploading(false); }
  };

  const gotoAvailability = () => document.getElementById('pf-availability')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (loading) {
    return <div className="pf"><div className="pf-head"><div className="shimmer-strip" style={{ height: 170, borderRadius: 14 }} /></div></div>;
  }
  if (notFound || !person) {
    return (
      <EmptyState icon={<UserX size={22} />} title="Profile not found" text="This profile doesn't exist or isn't visible to you."
        action={<button className="btn btn-blue btn-sm" onClick={() => navigate('/home')}>Back to Home</button>} />
    );
  }

  const meta = metaFor(person.stakeholderType);
  const RoleIcon = meta.icon;
  const verified = person.verificationStatus === 'VERIFIED';
  const followers = person._count?.followers ?? 0;
  const postsCount = person._count?.posts ?? 0;
  const facts = glanceFacts(person.stakeholderType, person.detail?.data);
  const headline = headlineOf(person);
  const mediaPosts = feedPosts.filter((p) => p.mediaUrl);
  const since = person.createdAt ? new Date(person.createdAt) : null;
  const first = person.name.split(' ')[0];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'posts', label: 'Posts' },
    { id: 'media', label: 'Media' },
    ...(isSelf ? [{ id: 'insights', label: 'Insights' }, { id: 'requests', label: 'Requests', badge: pending }] : []),
  ];

  return (
    <div className="pf" style={{ '--pf-tint': meta.tint }}>
      <header className="pf-head">
        <div className="pf-top">
          <div className="pf-photo">
            <Avatar name={person.name} src={person.avatarUrl} size={104} />
            {isSelf && (
              <>
                <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { quickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
                <button className="pf-photo-btn" onClick={() => photoInput.current?.click()} disabled={uploading} aria-label="Change profile photo"><Camera size={15} /></button>
              </>
            )}
          </div>

          <div className="pf-id">
            <h1 className="pf-name">{person.name}{verified && <Verified size={20} />}</h1>
            <div className="pf-meta">
              <span className="pf-role"><RoleIcon size={13} /> {meta.label}</span>
              {person.city && <span className="pf-loc"><MapPin size={14} /> {person.city}</span>}
              {person.visibility !== 'PUBLIC' && isSelf && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>· {person.visibility === 'PRIVATE' ? 'Only you can see this' : 'Connections only'}</span>}
            </div>
            {headline && <p className="pf-headline">{headline}</p>}
            <div className="pf-stats">
              <div><b>{compact(followers)}</b><span>Followers</span></div>
              <div><b>{compact(person._count?.following ?? 0)}</b><span>Following</span></div>
              <div><b>{compact(postsCount)}</b><span>Posts</span></div>
            </div>
          </div>
        </div>

        <div className="pf-actions">
          {isSelf ? (
            <>
              <button className={`btn pf-req btn-sm${pending > 0 ? ' has' : ''}`} style={{ padding: '9px 16px' }} onClick={() => setTab('requests')} aria-label={`Requests, ${pending} waiting`}>
                <Inbox size={15} /> Requests
                {pending > 0 && <span className="pf-req-n">{pending}</span>}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil size={14} /> Edit profile</button>
            </>
          ) : (
            <>
              {meta.bookable && <button className="btn btn-blue btn-sm" onClick={gotoAvailability}><CalendarCheck size={14} /> Check availability</button>}
              <button className={`btn btn-sm ${following ? 'btn-ghost' : meta.bookable ? 'btn-ghost' : 'btn-blue'}`} onClick={toggleFollow}>
                {following ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={openChat}><MessageCircle size={14} /> Message</button>
            </>
          )}
        </div>

        {facts.length > 0 && (
          <div className="pf-facts">
            {facts.map((f) => <div className="pf-fact" key={f.key}><span>{f.label}</span><b>{f.value}</b></div>)}
          </div>
        )}
      </header>

      <nav className="pf-tabs" aria-label="Profile sections">
        {tabs.map((t) => (
          <button key={t.id} className={`pf-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}{t.badge > 0 && <span className="dot">{t.badge}</span>}
          </button>
        ))}
      </nav>

      <div className="pf-grid">
        <div style={{ minWidth: 0 }}>
          {tab === 'overview' && (
            <>
              <div className="pf-card">
                <h3>About</h3>
                {person.bio ? <p className="pf-about" style={{ margin: 0 }}>{person.bio}</p>
                  : <p style={{ margin: 0, color: 'var(--text-faint)', fontSize: 14 }}>
                    {isSelf ? <>Tell people who you are. <button className="btn btn-ghost btn-xs" onClick={() => setEditing(true)}>Write your bio</button></> : `${first} hasn't written a bio yet.`}
                  </p>}
              </div>
              {meta.bookable && (
                <Availability person={person} isSelf={isSelf} tint={meta.tint} onPick={userId ? (d) => setBookingDay(d) : () => pushToast('Sign in to request a booking.', 'error')} />
              )}
              <RoleDetails person={person} onEdit={isSelf ? () => setEditing(true) : undefined} />
            </>
          )}

          {tab === 'posts' && (
            feedPosts.length ? feedPosts.map((p) => <PostCard key={p.id} post={p} />)
              : <EmptyState icon={<MessageCircle size={22} />} title="No posts yet" text={`${first} hasn't posted anything yet.`} />
          )}

          {tab === 'media' && (
            mediaPosts.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
                {mediaPosts.map((p) => (
                  <div key={p.id} style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: 'var(--bg-softer)', border: '1px solid var(--border)' }}>
                    <img src={p.mediaUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={<ImageIcon size={22} />} title="No media yet" text="Posts with photos will appear here." />
          )}

          {tab === 'insights' && isSelf && <Insights />}
          {tab === 'requests' && isSelf && <Requests received={received} sent={sent} loading={reqLoading} onStatus={onStatus} />}
        </div>

        <aside style={{ minWidth: 0 }}>
          {isSelf && <Strength person={person} postsCount={postsCount} />}
          <div className="pf-card">
            <h3>At a glance</h3>
            <dl className="pf-rows" style={{ margin: 0, gridTemplateColumns: '1fr', gap: 12 }}>
              <div className="pf-row"><dt>Role</dt><dd>{meta.label}</dd></div>
              {person.city && <div className="pf-row"><dt>Based in</dt><dd>{person.city}</dd></div>}
              <div className="pf-row"><dt>Verification</dt><dd>{verified ? 'Verified profile' : person.verificationStatus === 'PENDING' ? 'Verification pending' : 'Not verified yet'}</dd></div>
              {since && <div className="pf-row"><dt>On Strings since</dt><dd>{MONTHS[since.getMonth()]} {since.getFullYear()}</dd></div>}
            </dl>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {editing && <EditProfile person={person} onClose={() => setEditing(false)} onSaved={async () => { await load(); await refreshProfile(); setEditing(false); }} />}
        {bookingDay && <BookingModal person={person} day={bookingDay} onClose={() => { setBookingDay(null); }} />}
      </AnimatePresence>
    </div>
  );
}
