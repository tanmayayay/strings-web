import { Bookmark, ExternalLink, Newspaper } from 'lucide-react';
import NewsCover, { topicOf } from '../news/NewsCover';
import { timeAgo } from '../../lib/format';
import './newspost.css';

/* A news story shown like a post: image, caption, short excerpt. */
export default function NewsPost({ item, saved, onRead, onSave }) {
  const ext = (e) => { e.stopPropagation(); window.open(item.url, '_blank', 'noopener,noreferrer'); };
  return (
    <article className="pc np">
      <header className="np-head">
        <span className="np-badge"><Newspaper size={14} /> From the news</span>
        <span className="np-src"><b>{item.source}</b>{item.publishedAt ? ` · ${timeAgo(item.publishedAt)}` : ''}</span>
        <button className="np-ext" onClick={ext} aria-label="Open on publisher's site" title="Open in browser"><ExternalLink size={14} /></button>
      </header>
      <div className="np-media" onClick={() => onRead(item)}>
        <NewsCover item={item} large />
        <span className="np-topic">{topicOf(item)}</span>
      </div>
      <div className="np-body">
        <h3 onClick={() => onRead(item)}>{item.title}</h3>
        {item.excerpt && <p>{item.excerpt}</p>}
        <div className="np-actions">
          <button className="np-more" onClick={() => onRead(item)}>Read more</button>
          <button className={`np-save${saved ? ' on' : ''}`} onClick={() => onSave(item)} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save'}>
            <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </article>
  );
}
