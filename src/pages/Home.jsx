import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, LogIn, Images } from 'lucide-react';
import { PageHead, Avatar, EmptyState } from '../components/ui';
import PostCard from '../components/PostCard';
import MomentsRail from '../components/MomentsRail';
import RightRail from '../components/RightRail';
import Lightbox from '../components/Lightbox';
import { Posts, Profiles } from '../lib/api';
import { useStore } from '../store/store';
import '../home-phase3.css';

const PAGE = 20;
const TABS = [
  { id: 'foryou', label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'media', label: 'Media' },
];

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
  const { user, pushToast } = useStore();
  const { openPost } = useOutletContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('foryou');
  const [followedIds, setFollowedIds] = useState(null);
  const [followError, setFollowError] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(null);
  const sentinelRef = useRef(null);
  const takeRef = useRef(PAGE);

  const load = useCallback(async (reset, nextTake) => {
    if (reset) {
      setLoading(true);
      setError(false);
    }
    try {
      const res = await Posts.list({ take: nextTake });
      const items = res.items || [];
      if (reset) {
        setPosts(items);
      } else {
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...items.filter((p) => !seen.has(p.id))];
        });
      }
      takeRef.current = nextTake;
      setHasMore(items.length >= nextTake);
    } catch (e) {
      if (reset) {
        setError(true);
        pushToast(e.message || 'Could not load the feed.', 'error');
      } else {
        pushToast(e.message || 'Could not load more posts.', 'error');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pushToast]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    load(false, takeRef.current + PAGE);
  }, [loadingMore, hasMore, loading, load]);

  // Initial load + refresh when a new post is created.
  useEffect(() => {
    load(true, PAGE);
    const onCreated = () => load(true, takeRef.current);
    window.addEventListener('strings:post-created', onCreated);
    return () => window.removeEventListener('strings:post-created', onCreated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The caller's followed IDs, for the Following tab + Who-to-follow.
  useEffect(() => {
    let alive = true;
    if (!user) {
      setFollowedIds(null);
      setFollowError(false);
      return () => { alive = false; };
    }
    (async () => {
      try {
        const res = await Profiles.following();
        const items = res?.items || (Array.isArray(res) ? res : []);
        if (alive) {
          setFollowedIds(new Set(items.map((p) => p.id)));
          setFollowError(false);
        }
      } catch (e) {
        if (alive) {
          setFollowedIds(null);
          setFollowError(true);
        }
      }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  // Infinite scroll sentinel.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '420px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadMore, tab]);

  const mediaPosts = posts.filter((p) => p && p.mediaUrl);
  const followedPosts = followedIds
    ? posts.filter((p) => p.author && followedIds.has(p.author.id))
    : [];

  const renderFollowing = () => {
    if (!user) {
      return (
        <EmptyState
          icon={<LogIn size={22} />}
          title="See posts from your network"
          text="Sign in to follow people and see their posts here."
        />
      );
    }
    if (followError) {
      return (
        <EmptyState
          icon={<Activity size={22} />}
          title="Couldn't load your network"
          text="We couldn't fetch the people you follow. Check your connection and try again."
          action={<button className="btn btn-blue btn-sm" onClick={() => window.location.reload()}>Retry</button>}
        />
      );
    }
    if (followedPosts.length === 0) {
      return (
        <EmptyState
          icon={<Activity size={22} />}
          title="Quiet here for now"
          text="Posts from people you follow will appear here. Discover people in the rail on the right."
        />
      );
    }
    return followedPosts.map((p) => <PostCard key={p.id} post={p} />);
  };

  const renderMedia = () => {
    if (mediaPosts.length === 0) {
      return (
        <EmptyState
          icon={<Images size={22} />}
          title="No media yet"
          text="Photos and clips shared by the community will appear here."
        />
      );
    }
    const items = mediaPosts.map((p) => ({
      src: p.mediaUrl,
      alt: (p.body || '').slice(0, 120) || 'Shared media',
    }));
    return (
      <>
        <div className="media-grid">
          {mediaPosts.map((p, i) => (
            <button
              key={p.id}
              className="media-thumb"
              onClick={() => setMediaIndex(i)}
              aria-label={`Open media from post by ${p.author?.name || 'unknown'}`}
            >
              <img src={p.mediaUrl} alt="" loading="lazy" />
            </button>
          ))}
        </div>
        {mediaIndex !== null && (
          <Lightbox
            items={items}
            index={mediaIndex}
            onIndex={setMediaIndex}
            onClose={() => setMediaIndex(null)}
          />
        )}
      </>
    );
  };

  return (
    <div>
      <div className="two-col">
        <div>
          <PageHead title={`Good ${daypart()}, ${user?.name?.split(' ')[0] || 'there'}`} sub="Posts from people you follow, and opportunities matched to your profile." />
          <MomentsRail posts={posts} />
          <div className="composer">
            <Avatar name={user?.name || 'Guest'} size={36} />
            <input type="text" placeholder="Share an update, a clip, or a call-out…" readOnly onClick={openPost} onFocus={openPost} />
            <button className="btn btn-blue btn-sm" onClick={openPost}>Post</button>
          </div>
          <div className="feed-tabs" role="tablist" aria-label="Feed filters">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`feed-tab${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {loading ? (
            <FeedSkeleton />
          ) : error ? (
            <EmptyState
              icon={<Activity size={22} />}
              title="Feed unavailable"
              text="We couldn't load posts right now. Check your connection and try again."
              action={<button className="btn btn-blue btn-sm" onClick={() => load(true, takeRef.current)}>Retry</button>}
            />
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<Activity size={22} />}
              title="No posts yet"
              text="Be the first to share an update with the community."
              action={<button className="btn btn-blue btn-sm" onClick={openPost}>Create a post</button>}
            />
          ) : tab === 'following' ? (
            renderFollowing()
          ) : tab === 'media' ? (
            renderMedia()
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} />)
          )}
          {!loading && !error && posts.length > 0 && (
            <>
              <div ref={sentinelRef} className="sentinel" aria-hidden="true" />
              {loadingMore && (
                <div className="load-more-wrap">
                  <div className="load-spinner" role="status" aria-label="Loading more posts" />
                </div>
              )}
              {hasMore && !loadingMore && (
                <div className="load-more-wrap">
                  <button className="btn btn-ghost btn-sm" onClick={loadMore}>
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <RightRail posts={posts} followedIds={followedIds} />
      </div>
    </div>
  );
}

function daypart() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}
