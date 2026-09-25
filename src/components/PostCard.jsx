import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2, Bookmark } from 'lucide-react';
import { Avatar, Verified, Tag } from './ui';
import { useStore } from '../store/store';
import { PEOPLE_BY_ID } from '../data/demo';

export default function PostCard({ post }) {
  const { likes, toggleLike, isBookmarked, toggleBookmark, pushToast } = useStore();
  const navigate = useNavigate();
  const liked = !!likes[post.id];
  const saved = isBookmarked('post', post.id);
  const likeCount = (post.likes || 0) + (liked ? 1 : 0);
  const person = post.pid ? PEOPLE_BY_ID[post.pid] : null;

  const openProfile = () => { if (post.pid) navigate(`/profile/${post.pid}`); };

  return (
    <div className="post-card">
      <div className="post-head">
        <span onClick={openProfile} style={{ cursor: post.pid ? 'pointer' : 'default' }}>
          <Avatar name={post.who} size={38} />
        </span>
        <div className="who" onClick={openProfile}>
          <b>{post.who}{person?.verified && <Verified />}</b>
          <span>{post.role} · {post.time}</span>
        </div>
      </div>
      <div className="post-body">{post.body}</div>
      {post.tags?.length > 0 && (
        <div className="post-tags">{post.tags.map((t, i) => <Tag key={i} color={t[1]}>{t[0]}</Tag>)}</div>
      )}
      <div className="post-actions">
        <button className={`post-action${liked ? ' liked' : ''}`} onClick={() => toggleLike(post.id)} aria-label="Like">
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} /> {likeCount}
        </button>
        <button className="post-action" onClick={() => pushToast('Comments open in the full app — coming in Phase 2.')} aria-label="Comments">
          <MessageCircle size={15} /> {post.comments ?? 0}
        </button>
        <button className="post-action" onClick={() => pushToast('Reposted to your network.')} aria-label="Repost">
          <Repeat2 size={15} /> Repost
        </button>
        <button
          className={`post-action${saved ? ' saved' : ''}`}
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            const nowSaved = toggleBookmark('post', post.id);
            pushToast(nowSaved ? 'Saved to your bookmarks.' : 'Removed from bookmarks.');
          }}
          aria-label="Save"
        >
          <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}
