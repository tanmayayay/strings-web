import { useState } from 'react';
import { Modal } from './ui';
import { useStore } from '../store/store';
import { CITIES } from '../data/demo';
import { Posts, Opps } from '../lib/api';

/* Post composer */
export function PostModal({ onClose }) {
  const { user, pushToast } = useStore();
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const publish = async () => {
    if (!body.trim()) { onClose(); return; }
    if (!user) { pushToast('Sign in to post.', 'error'); onClose(); return; }
    setSaving(true);
    try {
      await Posts.create({ body: body.trim(), mediaUrl: null });
      window.dispatchEvent(new Event('strings:post-created'));
      onClose();
      pushToast('Posted.');
    } catch (e) {
      pushToast(e.message || 'Could not publish the post.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create a post" onClose={onClose}>
      <label>Post</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share news, a call-out, or what you're working on…" />
      <div className="modal-actions">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue btn-sm" onClick={publish} disabled={saving}>{saving ? 'Publishing…' : 'Publish'}</button>
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
