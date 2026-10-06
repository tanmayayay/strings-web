import { useEffect } from 'react';
import { X, ExternalLink, Bookmark } from 'lucide-react';
import NewsCover, { topicOf } from './NewsCover';
import { timeAgo } from '../../lib/format';
import './reader.css';

/* In-app reader: image, headline and the publisher's own short summary.
   "Read full story" (and the small corner icon) open the publisher's site. */
export default function NewsReader({ item, saved, onToggleSave, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  if (!item) return null;
  const paras = (item.body || '').split(/\n{2,}/).filter(Boolean);
  const open = () => window.open(item.url, '_blank', 'noopener,noreferrer');

  return (
    <div className="reader-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={item.title}>
      <article className="reader" onClick={(e) => e.stopPropagation()}>
        <div className="reader-cover">
          <NewsCover item={item} large />
          <button className="reader-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
          {item.isLive && (
            <button className="reader-ext" onClick={open} aria-label="Open on publisher's site" title="Open in browser"><ExternalLink size={15} /></button>
          )}
        </div>
        <div className="reader-body">
          <div className="reader-meta">
            <span className="reader-pill">{topicOf(item)}</span>
            <b>{item.source}</b>
            {item.publishedAt && <span>{timeAgo(item.publishedAt)}</span>}
          </div>
          <h2>{item.title}</h2>
          {paras.length
            ? paras.map((p, i) => <p key={i}>{p}</p>)
            : <p>{item.excerpt || 'Open the full story to keep reading.'}</p>}
        </div>
        <footer className="reader-foot">
          {onToggleSave && (
            <button className={`btn btn-ghost btn-sm${saved ? ' on' : ''}`} onClick={() => onToggleSave(item)}>
              <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
            </button>
          )}
          {item.isLive && (
            <button className="btn btn-blue btn-sm" onClick={open}>Read full story <ExternalLink size={14} /></button>
          )}
        </footer>
      </article>
    </div>
  );
}
