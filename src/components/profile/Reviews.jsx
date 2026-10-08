import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Avatar, Modal, EmptyState } from '../ui';
import { Reviews as ReviewsApi } from '../../lib/api';
import { useStore } from '../../store/store';
import { timeAgo } from '../../lib/format';
import '../growth.css';

export function Stars({ value, size = 15 }) {
  return (
    <span className="rv-stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} fill={n <= Math.round(value) ? 'currentColor' : 'none'} />)}
    </span>
  );
}

export function ReviewModal({ pending, onClose, onDone }) {
  const { pushToast } = useStore();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await ReviewsApi.create({ bookingId: pending.bookingId, rating, body: body.trim() || undefined });
      pushToast('Review posted. Thank you.');
      onDone?.();
    } catch (e) { pushToast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Review ${pending.person.name}`} onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px' }}>Gig on {String(pending.date).slice(0, 10)}. Reviews are public and tied to a real booking.</p>
      <div className="rv-pick" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={rating === n} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}><Star size={30} fill={n <= rating ? 'currentColor' : 'none'} /></button>
        ))}
      </div>
      <textarea className="sf-text" rows={4} maxLength={800} placeholder="How was it? Professionalism, communication, payment, the show…" value={body} onChange={(e) => setBody(e.target.value)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Not now</button>
        <button className="btn btn-blue btn-sm" onClick={submit} disabled={!rating || busy}>{busy ? 'Posting…' : 'Post review'}</button>
      </div>
    </Modal>
  );
}

/** Reviews tab + the owner's "how did it go?" prompts. */
export default function Reviews({ personId, isSelf, data, onChanged }) {
  const [pending, setPending] = useState([]);
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (!isSelf) return undefined;
    let alive = true;
    ReviewsApi.pending().then((r) => { if (alive) setPending(r.items || []); }).catch(() => {});
    return () => { alive = false; };
  }, [isSelf, personId]);

  const done = () => { setPending((p) => p.filter((x) => x.bookingId !== active.bookingId)); setActive(null); onChanged?.(); };

  return (
    <>
      {isSelf && pending.length > 0 && (
        <div className="pf-card rv-prompt">
          <h3>How did these gigs go?</h3>
          {pending.map((p) => (
            <div className="rv-pending" key={p.bookingId}>
              <Avatar name={p.person.name} src={p.person.avatarUrl} size={34} />
              <div><b>{p.person.name}</b><span>{String(p.date).slice(0, 10)}</span></div>
              <button className="btn btn-blue btn-sm" onClick={() => setActive(p)}>Leave a review</button>
            </div>
          ))}
        </div>
      )}
      {data?.count ? (
        <>
          <div className="pf-card rv-sum">
            <div className="rv-big">{data.average}</div>
            <div><Stars value={data.average} size={18} /><div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 3 }}>{data.count} review{data.count === 1 ? '' : 's'} from real bookings</div></div>
          </div>
          {data.items.map((r) => (
            <div className="pf-card rv-item" key={r.id}>
              <div className="rv-head">
                <Avatar name={r.reviewer.name} src={r.reviewer.avatarUrl} size={34} />
                <div><b>{r.reviewer.name}</b><span>{timeAgo(r.createdAt)}</span></div>
                <Stars value={r.rating} />
              </div>
              {r.body && <p>{r.body}</p>}
            </div>
          ))}
        </>
      ) : (
        <EmptyState icon={<Star size={22} />} title="No reviews yet" text="Reviews appear after a confirmed gig, from both sides." />
      )}
      {active && <ReviewModal pending={active} onClose={() => setActive(null)} onDone={done} />}
    </>
  );
}
