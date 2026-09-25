import { useState } from 'react';
import { Modal } from './ui';
import { useStore } from '../store/store';
import { CITIES } from '../data/demo';

/* Post composer */
export function PostModal({ onClose }) {
  const { userPosts, setUserPosts, pushToast, user } = useStore();
  const [body, setBody] = useState('');
  const [cat, setCat] = useState('update');
  const catMap = { update: ['Update', 'sky'], callout: ['Call-out', 'blue'], workshop: ['Workshop', 'sky'], release: ['Release', 'indigo'] };

  const publish = () => {
    if (!body.trim()) { onClose(); return; }
    const post = {
      id: `user-${Date.now()}`, who: user?.name || 'Demo User', pid: user?.id || null,
      role: `${user?.role || 'Member'} · ${user?.city || ''}`, time: 'now',
      body: body.trim(), tags: [catMap[cat]], likes: 0, comments: 0,
    };
    setUserPosts([post, ...userPosts]);
    setBody('');
    onClose();
    pushToast('Your post is live on Home.');
  };

  return (
    <Modal title="Create a post" onClose={onClose}>
      <label>What&apos;s this post about?</label>
      <select value={cat} onChange={(e) => setCat(e.target.value)}>
        <option value="update">General update</option>
        <option value="callout">Call-out / job opening</option>
        <option value="workshop">Workshop or conference</option>
        <option value="release">New release</option>
      </select>
      <label>Post</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share news, a call-out, or what you're working on…" />
      <div className="modal-actions">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue btn-sm" onClick={publish}>Publish</button>
      </div>
    </Modal>
  );
}

/* Opportunity composer */
export function OppModal({ onClose }) {
  const { userOpps, setUserOpps, pushToast, user } = useStore();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Performer');
  const [city, setCity] = useState('Mumbai');
  const [desc, setDesc] = useState('');
  const [budget, setBudget] = useState('');

  const publish = () => {
    if (!title.trim()) { onClose(); return; }
    const opp = {
      id: `uopp-${Date.now()}`, title: title.trim(), type, city,
      desc: desc.trim() || 'No further details provided.',
      postedBy: user?.id || 'meera', posted: user?.name || 'Demo User',
      budget: budget.trim() || 'To be discussed', applicants: 0, keywords: [],
    };
    setUserOpps([opp, ...userOpps]);
    onClose();
    pushToast('Opportunity posted — applicants will appear under Collab.');
  };

  return (
    <Modal title="Post an opportunity" onClose={onClose}>
      <label>Title</label>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bassist needed for wedding season" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Performer</option><option>Crew</option><option>Venue</option>
          </select>
        </div>
        <div>
          <label>City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {CITIES.slice(0, 5).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <label>Budget</label>
      <input type="text" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. ₹25k / event" />
      <label>Requirements</label>
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe what you're looking for…" />
      <div className="modal-actions">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue btn-sm" onClick={publish}>Post opportunity</button>
      </div>
    </Modal>
  );
}
