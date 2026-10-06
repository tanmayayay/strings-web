import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2, Bookmark, Send } from 'lucide-react';
import { Avatar, Verified } from './ui';
import Lightbox from './Lightbox';
import { useStore } from '../store/store';
import { Posts } from '../lib/api';

const TAG_SPLIT_RE = /(#[\p{L}\p{N}_]+)/gu;
const TAG_TEST_RE = /#[\p{L}\p{N}_]+/u;

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function typeLabel(t) {
  if (!t || typeof t !== 'string') return 'Member';
  return t.charAt(0) + t.slice(1).toLowerCase();
}

/** Render #hashtags as styled blue spans (no navigation). */
function renderRich(text) {
  if (!text) return null;
  return String(text)
    .split(TAG_SPLIT_RE)
    .map((part, i) =>
      TAG_TEST_RE.test(part) ? (
        <span key={i} className="post-tag">{part}</span>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      )
    );
}

export default function PostCard({ post, onLike }) {
  const { user, isBookmarked, toggleBookmark, pushToast } = useStore();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeDelta, setLikeDelta] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [pop, setPop] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentCount, setCommentCount] = useState(post._count?.comments ?? 0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [burst, setBurst] = useState(null);
  const clickTimer = useRef(null);
  const burstTimer = useRef(null);
  const popTimer = useRef(null);

  useEffect(() => () => {
    clearTimeout(clickTimer.current);
    clearTimeout(burstTimer.current);
    clearTimeout(popTimer.current);
  }, []);

  const author = post.author || {};
  const likeCount = (post._count?.likes ?? 0) + likeDelta;
  const saved = isBookmarked('post', post.id);

  const openProfile = () => { if (author.id) navigate(`/profile/${author.id}`); };

  const triggerPop = () => {
    clearTimeout(popTimer.current);
    setPop(false);
    requestAnimationFrame(() => setPop(true));
    popTimer.current = setTimeout(() => setPop(false), 420);
  };

  const toggleLike = async () => {
    if (likeBusy) return;
    if (!user) { pushToast('Sign in to like posts.', 'error'); return; }
    const prevLiked = liked;
    const prevDelta = likeDelta;
    setLikeBusy(true);
    if (!liked) {
      setLiked(true);
      setLikeDelta(prevDelta + 1);
      triggerPop();
      try {
        await Posts.like(post.id);
        onLike?.(post.id, true);
      } catch (e) {
        if (e.status === 409) {
          // Already liked server-side: the liked state is correct, just drop the optimistic +1.
          setLikeDelta(prevDelta);
          onLike?.(post.id, true);
        } else {
          setLiked(prevLiked);
          setLikeDelta(prevDelta);
          pushToast(e.message || 'Could not like the post.', 'error');
        }
      }
    } else {
      setLiked(false);
      setLikeDelta(prevDelta - 1);
      try {
        await Posts.unlike(post.id);
        onLike?.(post.id, false);
      } catch (e) {
        setLiked(prevLiked);
        setLikeDelta(prevDelta);
        pushToast(e.message || 'Could not remove the like.', 'error');
      }
    }
    setLikeBusy(false);
  };

  /* Single click opens the lightbox (slightly delayed so a double-click
     can claim the gesture); double-click bursts a heart and likes. */
  const handleMediaClick = () => {
    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => setLightboxOpen(true), 260);
  };

  const handleMediaDoubleClick = (e) => {
    clearTimeout(clickTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setBurst({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: Date.now(),
    });
    clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(() => setBurst(null), 780);
    if (!liked && !likeBusy) toggleLike();
    else triggerPop();
  };

  const toggleComments = async () => {
    if (commentsOpen) { setCommentsOpen(false); return; }
    setCommentsOpen(true);
    if (comments) return;
    try {
      const res = await Posts.comments(post.id, { take: 20 });
      setComments(res.items || []);
    } catch (e) {
      pushToast(e.message || 'Could not load comments.', 'error');
      setCommentsOpen(false);
    }
  };

  const addComment = async () => {
    const body = commentDraft.trim();
    if (!body) return;
    if (!user) { pushToast('Sign in to comment.', 'error'); return; }
    try {
      const c = await Posts.comment(post.id, body);
      setComments((cs) => [...(cs || []), c]);
      setCommentCount((n) => n + 1);
      setCommentDraft('');
    } catch (e) {
      pushToast(e.message || 'Could not post the comment.', 'error');
    }
  };

  return (
    <div className="post-card">
      <div className="post-head">
        <span onClick={openProfile} style={{ cursor: author.id ? 'pointer' : 'default' }}>
          <Avatar name={author.name || 'Unknown'} size={38} />
        </span>
        <div className="who" onClick={openProfile}>
          <b>{author.name || 'Unknown'}{author.verificationStatus === 'VERIFIED' && <Verified />}</b>
          <span>{typeLabel(author.stakeholderType)}{author.city ? ` · ${author.city}` : ''} · {timeAgo(post.createdAt)}</span>
        </div>
      </div>
      <div className="post-body">{renderRich(post.body)}</div>
      {post.mediaUrl && (
        <div
          className="post-media"
          role="button"
          tabIndex={0}
          aria-label="View post media"
          onClick={handleMediaClick}
          onDoubleClick={handleMediaDoubleClick}
          onKeyDown={(e) => { if (e.key === 'Enter') setLightboxOpen(true); }}
        >
          <img src={post.mediaUrl} alt="" />
          {burst && (
            <span className="heart-burst" key={burst.id} style={{ left: burst.x, top: burst.y }}>
              <Heart size={64} fill="currentColor" strokeWidth={0} />
            </span>
          )}
        </div>
      )}
      <div className="post-actions">
        <button className={`post-action${liked ? ' liked' : ''}${pop ? ' pop' : ''}`} onClick={toggleLike} aria-label="Like">
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} /> {likeCount}
        </button>
        <button className="post-action" onClick={toggleComments} aria-label="Comments">
          <MessageCircle size={15} /> {commentCount}
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
      {commentsOpen && (
        <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: 10, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comments === null && (
            <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Loading comments…</span>
          )}
          {comments !== null && comments.length === 0 && (
            <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>No comments yet — start the conversation.</span>
          )}
          {(comments || []).map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Avatar name={c.author?.name || 'Unknown'} size={28} />
              <div style={{ fontSize: 13 }}>
                <b style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {c.author?.name || 'Unknown'}
                  {c.author?.verificationStatus === 'VERIFIED' && <Verified size={12} />}
                </b>
                <div style={{ lineHeight: 1.5 }}>{c.body}</div>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{timeAgo(c.createdAt)}</span>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addComment()}
              placeholder="Write a comment…"
              style={{ flex: 1, background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)' }}
            />
            <button className="btn btn-blue btn-sm" onClick={addComment} aria-label="Send comment">
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
      {lightboxOpen && post.mediaUrl && (
        <Lightbox
          items={[{ src: post.mediaUrl, alt: (post.body || '').slice(0, 120) || 'Post media' }]}
          index={0}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
