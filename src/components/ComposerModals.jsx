import { useEffect, useRef, useState } from 'react';
import { Modal } from './ui';
import { useStore } from '../store/store';
import { supabase } from '../lib/supabase';
import { CITIES } from '../data/demo';
import { Posts, Opps } from '../lib/api';
import { Image as ImageIcon, X, Loader2 } from 'lucide-react';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

/* Post composer */
export function PostModal({ onClose }) {
  const { user, pushToast } = useStore();
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileRef = useRef(null);

  // Revoke the preview object URL whenever it is replaced or the modal
  // unmounts, so repeated photo picks don't leak memory.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const pickPhoto = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      pushToast('Please choose an image file.', 'error');
      return;
    }
    if (f.size > MAX_PHOTO_BYTES) {
      pushToast('Photos must be 5 MB or smaller.', 'error');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const clearPhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const isMissingBucket = (e) =>
    e && (e.statusCode === '404' || /bucket not found/i.test(e.message || ''));

  const publish = async () => {
    if (!body.trim() && !file) { onClose(); return; }
    if (!user) { pushToast('Sign in to post.', 'error'); onClose(); return; }
    setSaving(true);
    try {
      let mediaUrl = null;
      if (file) {
        const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const ext = rawExt.replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('post-media').upload(path, file);
        if (error) throw error;
        mediaUrl = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
      }
      await Posts.create({ body: body.trim(), mediaUrl });
      window.dispatchEvent(new Event('strings:post-created'));
      onClose();
      pushToast('Posted.');
    } catch (e) {
      // An upload failure never publishes the post — a broken-image post
      // is worse than a rejected one.
      pushToast(
        file && isMissingBucket(e)
          ? 'Photo upload failed — the post-media bucket may not exist yet. Run supabase/post-media-storage.sql in the Supabase SQL editor.'
          : (e.message || 'Could not publish the post.'),
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create a post" onClose={onClose}>
      <style>{`@keyframes post-spinner-spin{to{transform:rotate(360deg);}}`}</style>
      <label>Post</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share news, a call-out, or what you're working on…" />
      {previewUrl && (
        <div style={{ position: 'relative', marginTop: 12, maxWidth: 220 }}>
          <img src={previewUrl} alt="Photo attached to your post" style={{ display: 'block', width: '100%', borderRadius: 10 }} />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={clearPhoto}
            aria-label="Remove photo"
            disabled={saving}
            style={{ position: 'absolute', top: 6, right: 6, padding: 4, lineHeight: 0, background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: '50%', minWidth: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 14 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current && fileRef.current.click()} disabled={saving}>
          <ImageIcon size={15} style={{ marginRight: 6, verticalAlign: '-2px' }} />
          {file ? 'Change photo' : 'Add photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} style={{ display: 'none' }} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue btn-sm" onClick={publish} disabled={saving}>
          {saving ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={15} style={{ animation: 'post-spinner-spin 1s linear infinite' }} />
              {file ? 'Uploading photo…' : 'Publishing…'}
            </span>
          ) : 'Publish'}
        </button>
      </div>
    </Modal>
  );
}

/* Opportunity composer */
export function OppModal({ onClose }) {
  const { user, pushToast } = useStore();
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const publish = async () => {
    if (!title.trim()) { onClose(); return; }
    if (!user) { pushToast('Sign in to post an opportunity.', 'error'); onClose(); return; }
    const text = details.trim();
    if (!text) { pushToast('Please add a short description of the opportunity.', 'error'); return; }
    setSaving(true);
    try {
      // The single details field feeds both backend text fields; the old
      // "type" select and free-text "budget" have no backend equivalent.
      await Opps.create({
        title: title.trim(),
        description: text,
        requirements: text,
        city,
      });
      window.dispatchEvent(new Event('strings:opp-created'));
      onClose();
      pushToast('Opportunity posted.');
    } catch (e) {
      pushToast(e.message || 'Could not post the opportunity.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Post an opportunity" onClose={onClose}>
      <label>Title</label>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bassist needed for wedding season" />
      <label>City</label>
      <select value={city} onChange={(e) => setCity(e.target.value)}>
        {CITIES.slice(0, 5).map((c) => <option key={c}>{c}</option>)}
      </select>
      <label>Requirements</label>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Describe what you're looking for…" />
      <div className="modal-actions">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue btn-sm" onClick={publish} disabled={saving}>{saving ? 'Posting…' : 'Post opportunity'}</button>
      </div>
    </Modal>
  );
}
