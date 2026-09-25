import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, ChevronRight, Flame, Activity } from 'lucide-react';
import { PageHead, Avatar, Verified } from '../components/ui';
import { CountdownCard, ReferralCard } from '../components/widgets';
import PostCard from '../components/PostCard';
import { STAR_STORIES, HOME_FEED, PEOPLE, HASHTAGS, UPCOMING_GIGS } from '../data/demo';
import { useStore } from '../store/store';

const TICKER_ITEMS = [
  'Anjali Kulkarni just applied to “Session guitarist for wedding season”',
  'New venue joined from Pune',
  'Sana Reddy’s clip crossed 2k plays',
  'Depot 48 posted 3 crew call-outs',
  'Rohan Verma’s festival post is trending in Delhi-NCR',
];

function ActivityTicker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % TICKER_ITEMS.length), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="ticker-card" aria-live="polite">
      <span className="ticker-dot" />
      <Activity size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          className="ticker-text"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          {TICKER_ITEMS[i]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div className="skel-card" key={i}>
          <div className="skel-line shimmer-strip" style={{ width: '42%' }} />
          <div className="skel-line shimmer-strip" style={{ width: '96%' }} />
          <div className="skel-line shimmer-strip" style={{ width: '78%' }} />
        </div>
      ))}
    </>
  );
}

export default function Home() {
  const { userPosts, user } = useStore();
  const { openPost } = useOutletContext();
  const navigate = useNavigate();
  const star = useMemo(() => STAR_STORIES[Math.floor(Math.random() * STAR_STORIES.length)], []);
  const rising = useMemo(() => [...PEOPLE].filter((p) => p.rising).sort((a, b) => b.rising - a.rising), []);
  const feed = [...userPosts, ...HOME_FEED];
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      {/* Star story hero */}
      <Link to={`/news/${star.articleId}`} style={{ display: 'block', marginBottom: 30 }}>
        <div className="star-banner" style={{ background: star.gradient }}>
          <span className="star-kicker">{star.kicker}</span>
          <h2 className="star-headline">{star.headline}</h2>
          <p className="star-deck">{star.deck}</p>
          <p className="star-meta">{star.time} · Read the full story in News</p>
        </div>
      </Link>

      {/* Rising this week */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={17} style={{ color: 'var(--amber)' }} /> Rising this week
        </h3>
        <button className="btn btn-ghost btn-xs" onClick={() => navigate('/search')}>View all <ChevronRight size={13} /></button>
      </div>
      <div className="trend-scroll" style={{ marginBottom: 26 }}>
        {rising.map((p, i) => (
          <div className="trend-card" key={p.id} onClick={() => navigate(`/profile/${p.id}`)}>
            <div className="trend-thumb" style={{ background: p.heroGradient }}>
              <span className="trend-rank">#{i + 1} trending</span>
              <Avatar name={p.name} size={46} style={{ border: '2px solid rgba(255,255,255,.6)' }} />
            </div>
            <div className="trend-body">
              <b>{p.name}{p.verified && <Verified />}</b>
              <span>{p.role} · {p.city}</span>
              <div style={{ marginTop: 8 }}><span className="trend-growth"><TrendingUp size={11} style={{ verticalAlign: -1 }} /> +{p.rising}%</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div>
          <PageHead title={`Good ${daypart()}, ${user?.name?.split(' ')[0] || 'there'}`} sub="Posts from people you follow, and opportunities matched to your profile." />
          <div className="composer">
            <Avatar name={user?.name || 'Guest'} size={36} />
            <input type="text" placeholder="Share an update, a clip, or a call-out…" readOnly onClick={openPost} onFocus={openPost} />
            <button className="btn btn-blue btn-sm" onClick={openPost}>Post</button>
          </div>
          <ActivityTicker />
          {loading ? <FeedSkeleton /> : feed.map((p) => <PostCard key={p.id} post={p} />)}
        </div>

        <div>
          <div className="side-card">
            <h4><TrendingUp size={15} style={{ color: 'var(--blue)' }} /> Trending topics</h4>
            <div className="hashtag-row">
              {HASHTAGS.slice(0, 6).map((h) => (
                <button key={h.tag} className="hashtag" onClick={() => navigate('/search')}>{h.tag}<small>{h.posts}</small></button>
              ))}
            </div>
          </div>
          <div className="side-card">
            <h4>Upcoming gigs</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {UPCOMING_GIGS.slice(0, 2).map((g) => <CountdownCard key={g.id} gig={g} />)}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 12 }} onClick={() => navigate('/live')}>See all gigs</button>
          </div>
          <ReferralCard />
        </div>
      </div>
    </div>
  );
}

function daypart() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}
