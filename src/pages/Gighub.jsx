import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Pause, Image as ImageIcon, Heart, Bookmark, MapPin, CalendarDays, ExternalLink,
  Music, Disc3, AudioWaveform, Star, Trash2, Upload,
} from 'lucide-react';
import { PageHead, Avatar, Verified, EmptyState, Tag } from '../components/ui';
import { liveEvents, fmtLiveDateTime, viaLabel } from '../data/liveData';
import { Posts, Tracks } from '../lib/api';
import { supabase } from '../lib/supabase';
import { timeAgo } from '../lib/format';
import { useStore } from '../store/store';

/* ============================================================
   Gighub — the music vault. GitHub-style file browser for
   tracks, beats and samples (audio), plus the clips & photos
   grid from post media below.
   ============================================================ */

const KIND_META = {
  TRACK: { label: 'Track', icon: Music, color: 'blue' },
  BEAT: { label: 'Beat', icon: Disc3, color: 'indigo' },
  SAMPLE: { label: 'Sample', icon: AudioWaveform, color: 'sky' },
};

const KIND_OPTIONS = ['TRACK', 'BEAT', 'SAMPLE'];

function fmtDuration(sec) {
  if (sec == null || !Number.isFinite(Number(sec))) return null;
  const s = Math.round(Number(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Read duration from the local file (no network) — nullable on failure.
function probeDuration(file) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    try {
      const url = URL.createObjectURL(file);
      const el = new Audio();
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        finish(el.duration && Number.isFinite(el.duration) ? Math.round(el.duration) : null);
      };
      el.onerror = () => { URL.revokeObjectURL(url); finish(null); };
      el.src = url;
      setTimeout(() => finish(null), 8000);
    } catch {
      finish(null);
    }
  });
}

function UploadCard({ userId, onUploaded }) {
  const { pushToast } = useStore();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('TRACK');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const upload = async () => {
    if (!title.trim()) { pushToast('Give your track a title.', 'error'); return; }
    if (!file) { pushToast('Choose an audio file first.', 'error'); return; }
    setUploading(true);
    let publicUrl;
    try {
      const path = `${userId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('gighub-audio').upload(path, file);
      if (error) throw error;
      publicUrl = supabase.storage.from('gighub-audio').getPublicUrl(path).data.publicUrl;
    } catch (e) {
      pushToast('Upload failed — the gighub-audio storage bucket may not exist yet.', 'error');
      setUploading(false);
      return;
    }
    try {
      const durationSec = await probeDuration(file);
      await Tracks.create({ title: title.trim(), kind, audioUrl: publicUrl, durationSec });
      setTitle('');
      setKind('TRACK');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      pushToast('Track uploaded.');
      onUploaded();
    } catch (e) {
      pushToast(e.message || 'Could not save the track.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="side-card" style={{ marginBottom: 22 }}>
      <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Upload size={15} style={{ color: 'var(--blue)' }} /> Upload to the vault
      </h4>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <input
          className="filter-select"
          placeholder="Track title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: '2 1 180px' }}
          disabled={uploading}
        />
        <select
          className="filter-select"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          disabled={uploading}
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>{KIND_META[k].label}</option>
          ))}
        </select>
        <label className="btn btn-ghost btn-sm" style={{ cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
          {file ? file.name.slice(0, 24) : 'Choose audio…'}
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <button className="btn btn-blue btn-sm" onClick={upload} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '10px 0 0' }}>
        MP3, WAV, OGG and friends — your file streams straight from the vault.
      </p>
    </div>
  );
}

function TrackRow({ t, userId, playingId, onTogglePlay, onChanged, onRemoved }) {
  const { pushToast, isBookmarked, toggleBookmark } = useStore();
  const navigate = useNavigate();
  const meta = KIND_META[t.kind] || KIND_META.TRACK;
  const Icon = meta.icon;
  const liked = !!t.likedByMe;
  const likeCount = t._count?.likes ?? 0;
  const isOwner = t.uploader?.id === userId;
  const saved = isBookmarked('track', t.id);
  const dur = fmtDuration(t.durationSec);
  const uploader = t.uploader;

  const toggleLike = async () => {
    try {
      const r = await Tracks.toggleLike(t.id);
      onChanged(t.id, { likedByMe: r.liked, likes: likeCount + (r.liked ? 1 : -1) });
    } catch (e) {
      pushToast(e.message, 'error');
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${t.title}"? This can't be undone.`)) return;
    try {
      await Tracks.remove(t.id);
      pushToast('Track deleted.');
      onRemoved(t.id);
    } catch (e) {
      pushToast(e.message, 'error');
    }
  };

  const toggleSave = () => {
    const s = toggleBookmark('track', t.id);
    pushToast(s ? 'Saved to your bookmarks.' : 'Removed from bookmarks.');
  };

  return (
    <div className="mini-list-item" style={{ alignItems: 'flex-start', padding: '14px 12px' }}>
      <span
        style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'var(--blue-dim)', color: 'var(--blue-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon size={19} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 14.5 }}>{t.title}</b>
          <Tag color={meta.color}>{meta.label}</Tag>
          {dur && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{dur}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          {uploader && (
            <button
              onClick={() => navigate(`/profile/${uploader.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <Avatar name={uploader.name} size={22} />
              <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                {uploader.name}
                {uploader.verificationStatus === 'VERIFIED' && <Verified size={11} />}
              </span>
            </button>
          )}
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{timeAgo(t.createdAt)}</span>
        </div>
        {playingId === t.id && (
          <audio controls src={t.audioUrl} autoPlay style={{ width: '100%', marginTop: 10, height: 36 }} />
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        <button
          className="icon-btn"
          onClick={() => onTogglePlay(t.id)}
          aria-label={playingId === t.id ? 'Pause' : 'Play'}
          title={playingId === t.id ? 'Pause' : 'Play'}
        >
          {playingId === t.id ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          className="btn btn-ghost btn-xs"
          onClick={toggleLike}
          style={liked ? { color: 'var(--amber)', borderColor: 'var(--amber)' } : undefined}
          aria-label="Star"
        >
          <Star size={13} fill={liked ? 'currentColor' : 'none'} /> {likeCount}
        </button>
        <button className="btn btn-ghost btn-xs" onClick={toggleSave} aria-label="Save">
          <Bookmark size={13} fill={saved ? 'var(--amber)' : 'none'} color={saved ? 'var(--amber)' : undefined} />
        </button>
        {isOwner && (
          <button className="icon-btn" onClick={remove} aria-label="Delete track" title="Delete track">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- clips & photos grid (existing, untouched logic) ---------- */

const FILTERS = ['all', 'video', 'photo'];

function isVideoUrl(url) {
  return /\.(mp4|mov|webm|m4v|ogv)(\?|#|$)/i.test(url || '');
}

// Deterministic tile gradient derived from the post id (presentation only).
function gradientFor(id) {
  const h = String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [222, 200, 245, 210, 232, 190];
  const hue = hues[h % hues.length];
  return `linear-gradient(135deg, hsl(${hue}, 60%, 20%), hsl(${(hue + 40) % 360}, 70%, 45%))`;
}

function postToTile(p) {
  const video = isVideoUrl(p.mediaUrl);
  return {
    id: p.id,
    kind: video ? 'video' : 'photo',
    who: p.author?.name || 'Unknown',
    pid: p.author?.id || null,
    role: [p.author?.stakeholderType, p.author?.city].filter(Boolean).join(' · '),
    verified: p.author?.verificationStatus === 'VERIFIED',
    caption: p.body || '',
    likes: p._count?.likes ?? 0,
    mediaUrl: p.mediaUrl,
    gradient: gradientFor(p.id),
  };
}

export default function Gighub() {
  const { userId, isBookmarked, toggleBookmark, pushToast } = useStore();
  const navigate = useNavigate();

  /* ---- tracks (audio vault) ---- */
  const [tracks, setTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);

  const loadTracks = useCallback(async () => {
    setTracksLoading(true);
    try {
      const d = await Tracks.list({ take: 50 });
      setTracks(d.items || []);
    } catch (e) {
      pushToast(e.message, 'error');
      setTracks([]);
    } finally {
      setTracksLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { loadTracks(); }, [loadTracks]);

  const patchTrack = useCallback((id, patch) => {
    setTracks((prev) => prev.map((t) => (t.id === id
      ? { ...t, likedByMe: patch.likedByMe, _count: { likes: patch.likes } }
      : t)));
  }, []);

  const dropTrack = useCallback((id) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setPlayingId((pid) => (pid === id ? null : pid));
  }, []);

  /* ---- clips & photos grid (existing) ---- */
  const [filter, setFilter] = useState('all');
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Posts.list({ take: 60 })
      .then((d) => {
        if (!cancelled) setTiles((d.items || []).filter((p) => p.mediaUrl).map(postToTile));
      })
      .catch((e) => { if (!cancelled) pushToast(e.message, 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pushToast]);

  const list = tiles.filter((m) => filter === 'all' || m.kind === filter);

  return (
    <div>
      <PageHead title="Gighub" sub="The music vault — upload tracks, beats and samples; star the ones you love." />

      {userId ? (
        <UploadCard userId={userId} onUploaded={loadTracks} />
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: '0 0 18px' }}>
          Sign in to upload your own tracks, beats and samples.
        </p>
      )}

      <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        Tracks, beats &amp; samples
        {tracks.length > 0 && <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>{tracks.length} uploads</span>}
      </h4>
      {tracksLoading ? (
        <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>Loading tracks…</p>
      ) : tracks.length === 0 ? (
        <EmptyState icon={<Music size={22} />} title="No tracks yet" text="Upload the first track, beat or sample." />
      ) : (
        <div style={{ marginBottom: 26 }}>
          {tracks.map((t) => (
            <TrackRow
              key={t.id}
              t={t}
              userId={userId}
              playingId={playingId}
              onTogglePlay={(id) => setPlayingId((pid) => (pid === id ? null : id))}
              onChanged={patchTrack}
              onRemoved={dropTrack}
            />
          ))}
        </div>
      )}

      <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px' }}>Clips &amp; photos</h4>
      {liveEvents.length > 0 && (
        <section style={{ margin: '0 0 8px' }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            Live events in India
            <Tag color="indigo">Real listings</Tag>
            <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>{liveEvents.length} upcoming</span>
          </h4>
          {liveEvents.slice(0, 12).map((e, i) => {
            const dt = fmtLiveDateTime(e.date);
            const where = [e.venue, e.city].filter(Boolean).join(' · ');
            return (
              <div className="opp-card" key={e.id || `${e.title || 'event'}-${i}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 15 }}>{e.title || 'Untitled event'}</b>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {e.genre && <Tag color="blue">{e.genre}</Tag>}
                      {where && <Tag color="sky"><MapPin size={11} /> {where}</Tag>}
                      {dt && <Tag color="gray"><CalendarDays size={11} /> {dt}</Tag>}
                      <Tag color="indigo">{viaLabel(e)}</Tag>
                    </div>
                  </div>
                  {e.url && (
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="btn btn-blue btn-sm" style={{ flexShrink: 0 }}>
                      Tickets <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
      <div className="filter-row">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'video' ? 'Videos' : 'Photos'}
          </button>
        ))}
      </div>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>Loading media…</p>
      ) : list.length === 0 ? (
        <EmptyState icon={<ImageIcon size={22} />} title="Nothing here yet" text="No photos or videos have been shared yet — be the first from Home." />
      ) : (
        <div className="media-grid">
          {list.map((m) => {
            const saved = isBookmarked('media', m.id);
            return (
              <div className="media-tile" key={m.id}>
                <div className="media-thumb" style={{ background: m.gradient }} onClick={() => pushToast('Media viewer opens in the full app — Phase 2.')}>
                  {m.kind === 'photo' && (
                    <img src={m.mediaUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <div className="media-badges-row" style={{ position: 'relative' }}>
                    <span className="media-kind-badge">{m.kind === 'video' ? 'Video' : 'Photo'}</span>
                    {m.kind === 'video'
                      ? <Play size={20} color="#fff" fill="rgba(0,0,0,.35)" />
                      : <ImageIcon size={18} color="#fff" />}
                  </div>
                  <div className="media-overlay" style={{ position: 'relative' }}>
                    <div className="who" onClick={(e) => { e.stopPropagation(); if (m.pid) navigate(`/profile/${m.pid}`); }}>
                      <Avatar name={m.who} size={26} />
                      <div><b>{m.who}{m.verified && <Verified size={12} />}</b><span>{m.role}</span></div>
                    </div>
                    <p>{m.caption}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="media-likes"><Heart size={12} style={{ verticalAlign: -1 }} /> {m.likes}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nowSaved = toggleBookmark('media', m.id);
                          pushToast(nowSaved ? 'Saved to your bookmarks.' : 'Removed from bookmarks.');
                        }}
                        style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.35)', borderRadius: 8, color: '#fff', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}
                      >
                        <Bookmark size={12} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
