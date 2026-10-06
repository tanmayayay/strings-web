import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Image as ImageIcon, Briefcase, Music2, Sparkles, Users, Hash, X } from 'lucide-react';
import { Avatar, EmptyState } from '../components/ui';
import PostCard from '../components/PostCard';
import { SpotlightRail } from '../components/home/Spotlight';
import {
  MeCard, NewsCard, OppsCard, PeopleCard, NearbyCard, TrendingCard, RailFooter, OppsStrip, PeopleStrip,
} from '../components/home/HomeRail';
import { Posts, Profiles, Opps, NewsLive, Directory } from '../lib/api';
import { useStore } from '../store/store';
import './home.css';

const HIDDEN_KEY = 'strings.hiddenPosts';
const TABS = [
  { id: 'foryou', label: 'For you', icon: Sparkles },
  { id: 'following', label: 'Following', icon: Users },
  { id: 'photos', label: 'Photos', icon: ImageIcon },
];

function FeedSkeleton() {
  return [0, 1].map((i) => (
    <div className="pc pc-skel" key={i}>
      <div className="pc-head">
        <div className="skel-dot shimmer-strip" />
        <div style={{ flex: 1 }}>
          <div className="skel-line shimmer-strip" style={{ width: '38%' }} />
          <div className="skel-line shimmer-strip" style={{ width: '24%' }} />
        </div>
      </div>
      <div className="skel-media shimmer-strip" />
    </div>
  ));
}

/* Settle quietly: a failing side-module must never break the feed. */
const soft = (p, fallback) => p.then((r) => r).catch(() => fallback);

export default function Home() {
  const { user, pushToast } = useStore();
  const { openPost, openOpp } = useOutletContext();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('foryou');
  const [tag, setTag] = useState(null);
  const [hidden, setHidden] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]'); } catch { return []; }
  });

  const [people, setPeople] = useState([]);
  const [following, setFollowing] = useState(() => new Set());
  const [opps, setOpps] = useState([]);
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [myCounts, setMyCounts] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await Posts.list({ take: 40 });
      setPosts(res.items || []);
    } catch (e) {
      setError(true);
      pushToast(e.message || 'Could not load the feed.', 'error');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
    window.addEventListener('strings:post-created', load);
    return () => window.removeEventListener('strings:post-created', load);
  }, [load]);

  // Side modules load in parallel and fail soft.
  useEffect(() => {
    let off = false;
    (async () => {
      const [pp, fl, op, nw, me] = await Promise.all([
        soft(Profiles.list({ take: 24 }), { items: [] }),
        soft(Profiles.following(), { items: [] }),
        soft(Opps.list({ status: 'OPEN', take: 12 }), { items: [] }),
        soft(NewsLive.get(), { items: [] }),
        user?.id ? soft(Profiles.get(user.id), null) : null,
      ]);
      if (off) return;
      setPeople((pp.items || []).filter((p) => p.id !== user?.id));
      setFollowing(new Set((fl.items || []).map((p) => p.id)));
      setOpps(op.items || []);
      setNews(nw.items || []);
      setMyCounts(me?._count || null);

      const now = Date.now();
      const upcoming = (list) => (list || []).filter((e) => !e.date || new Date(e.date).getTime() >= now);
      let ev = upcoming((await soft(Directory.events({ city: user?.city, take: 6 }), { items: [] })).items);
      if (!ev.length) ev = upcoming((await soft(Directory.events({ take: 6 }), { items: [] })).items);
      if (off) return;
      setEvents(ev);
      if (!ev.length) {
        const vs = await soft(Directory.venues({ city: user?.city, take: 4 }), { items: [] });
        if (!off) setVenues(vs.items || []);
      }
    })();
    return () => { off = true; };
  }, [user?.id, user?.city]);

  const onFollow = useCallback(async (p) => {
    const was = following.has(p.id);
    setFollowing((s) => { const n = new Set(s); if (was) n.delete(p.id); else n.add(p.id); return n; });
    try {
      if (was) await Profiles.unfollow(p.id); else await Profiles.follow(p.id);
      pushToast(was ? `Unfollowed ${p.name}.` : `You're now following ${p.name}.`);
    } catch (e) {
      if (e.status !== 409) {
        setFollowing((s) => { const n = new Set(s); if (was) n.add(p.id); else n.delete(p.id); return n; });
        pushToast(e.message || 'Could not update follow.', 'error');
      }
    }
  }, [following, pushToast]);

  const onFollowChange = useCallback((id, on) => {
    setFollowing((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  }, []);

  const hidePost = useCallback((id) => {
    setHidden((h) => {
      const next = [...h, id].slice(-300);
      try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    pushToast('Got it — you’ll see fewer posts like this.');
  }, [pushToast]);

  /* "For you" ranking: transparent, recency-first with gentle boosts for
     photos, people you follow, and your city. No black box. */
  const visible = useMemo(() => {
    let list = posts.filter((p) => !hidden.includes(p.id));
    if (tag) list = list.filter((p) => new RegExp(`#${tag}\\b`, 'i').test(p.body || ''));
    if (tab === 'following') return list.filter((p) => following.has(p.author?.id));
    if (tab === 'photos') return list.filter((p) => p.mediaUrl);
    const now = Date.now();
    const score = (p) => {
      const ageH = (now - new Date(p.createdAt).getTime()) / 36e5;
      let s = -ageH;
      if (p.mediaUrl) s += 10;
      if (following.has(p.author?.id)) s += 18;
      if (user?.city && p.author?.city === user.city) s += 6;
      s += Math.min(8, (p._count?.likes || 0) * 0.5 + (p._count?.comments || 0));
      return s;
    };
    return [...list].sort((a, b) => score(b) - score(a));
  }, [posts, hidden, tab, tag, following, user?.city]);

  const first = user?.name?.split(' ')[0] || 'there';

  const feed = [];
  visible.forEach((p, i) => {
    feed.push(
      <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(i, 4) * 0.04 }}>
        <PostCard
          post={p}
          onHide={hidePost}
          following={following.has(p.author?.id)}
          onFollowChange={onFollowChange}
        />
      </motion.div>,
    );
    if (tab === 'foryou' && !tag) {
      if (i === 1) feed.push(<OppsStrip key="strip-opps" opps={opps} user={user} />);
      if (i === 4) feed.push(<PeopleStrip key="strip-people" people={people} following={following} onFollow={onFollow} />);
    }
  });

  return (
    <div className="home">
      <div className="home-main">
        <div className="home-hello">
          <div>
            <h1>Good {daypart()}, {first}</h1>
            <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>

        {people.length > 0 && (
          <SpotlightRail people={people.slice(0, 16)} me={user} onCreate={openPost} following={following} onFollow={onFollow} />
        )}

        <div className="home-composer">
          <div className="home-composer-top">
            <Avatar name={user?.name || 'Guest'} size={42} />
            <button className="home-composer-input" onClick={() => openPost()}>
              What’s on your stage today, {first}?
            </button>
          </div>
          <div className="home-composer-actions">
            <button onClick={() => openPost({ photo: true })}><ImageIcon size={17} className="c-photo" /> Photo</button>
            <button onClick={() => openOpp()}><Briefcase size={17} className="c-gig" /> Gig call-out</button>
            <button onClick={() => navigate('/gighub')}><Music2 size={17} className="c-track" /> Track</button>
            <button onClick={() => openPost({ prefill: '#NowPlaying ' })}><Hash size={17} className="c-tag" /> Now playing</button>
          </div>
        </div>

        <div className="home-tabs" role="tablist" aria-label="Feed">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <t.icon size={15} /> {t.label}
              {tab === t.id && <motion.span layoutId="tab-ink" className="home-tab-ink" />}
            </button>
          ))}
        </div>
        {tag && (
          <div className="home-tagbar">
            Showing posts tagged <b>#{tag}</b>
            <button onClick={() => setTag(null)} aria-label="Clear tag filter"><X size={14} /></button>
          </div>
        )}

        {loading ? (
          <FeedSkeleton />
        ) : error ? (
          <EmptyState
            icon={<Activity size={22} />}
            title="Feed unavailable"
            text="We couldn't load posts right now. Check your connection and try again."
            action={<button className="btn btn-blue btn-sm" onClick={load}>Retry</button>}
          />
        ) : visible.length === 0 ? (
          tab === 'following' ? (
            <>
              <EmptyState icon={<Users size={22} />} title="Your following feed is quiet" text="Follow artists, venues and crew to see their posts here." />
              <PeopleStrip people={people} following={following} onFollow={onFollow} />
            </>
          ) : tab === 'photos' ? (
            <EmptyState
              icon={<ImageIcon size={22} />}
              title="No photos yet"
              text="Share a shot from your last gig, rehearsal or studio session."
              action={<button className="btn btn-blue btn-sm" onClick={() => openPost({ photo: true })}>Post a photo</button>}
            />
          ) : (
            <EmptyState
              icon={<Activity size={22} />}
              title="No posts yet"
              text="Be the first to share an update with the community."
              action={<button className="btn btn-blue btn-sm" onClick={() => openPost()}>Create a post</button>}
            />
          )
        ) : (
          <>
            {feed}
            <div className="feed-end">You’re all caught up ✦</div>
          </>
        )}
      </div>

      <aside className="home-rail" aria-label="Highlights">
        <MeCard user={user} postCount={myCounts?.posts} followingCount={myCounts?.following ?? following.size} />
        <OppsCard opps={opps} user={user} />
        <NewsCard items={news} />
        <PeopleCard people={people} following={following} onFollow={onFollow} />
        <TrendingCard posts={posts} onPick={(t) => { setTag(t); setTab('foryou'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        <NearbyCard events={events} venues={venues} city={user?.city} />
        <RailFooter />
      </aside>
    </div>
  );
}

function daypart() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}
