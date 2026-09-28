import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { PageHead, Avatar, EmptyState } from '../components/ui';
import { ReferralCard } from '../components/widgets';
import PostCard from '../components/PostCard';
import { Posts } from '../lib/api';
import { useStore } from '../store/store';

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
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await Posts.list({ take: 20 });
      setPosts(res.items || []);
    } catch (e) {
      setError(true);
      pushToast(e.message || 'Could not load the feed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener('strings:post-created', load);
    return () => window.removeEventListener('strings:post-created', load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="two-col">
        <div>
          <PageHead title={`Good ${daypart()}, ${user?.name?.split(' ')[0] || 'there'}`} sub="Posts from people you follow, and opportunities matched to your profile." />
          <div className="composer">
            <Avatar name={user?.name || 'Guest'} size={36} />
            <input type="text" placeholder="Share an update, a clip, or a call-out…" readOnly onClick={openPost} onFocus={openPost} />
            <button className="btn btn-blue btn-sm" onClick={openPost}>Post</button>
          </div>
          {loading ? (
            <FeedSkeleton />
          ) : error ? (
            <EmptyState
              icon={<Activity size={22} />}
              title="Feed unavailable"
              text="We couldn't load posts right now. Check your connection and try again."
              action={<button className="btn btn-blue btn-sm" onClick={load}>Retry</button>}
            />
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<Activity size={22} />}
              title="No posts yet"
              text="Be the first to share an update with the community."
              action={<button className="btn btn-blue btn-sm" onClick={openPost}>Create a post</button>}
            />
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>

        <div>
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
