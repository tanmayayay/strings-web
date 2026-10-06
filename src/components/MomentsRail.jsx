import { useState } from 'react';
import { Avatar } from './ui';
import Lightbox from './Lightbox';

/**
 * "Moments" — story-style circles for recent posts that carry media.
 * Hidden entirely when there is nothing to show.
 */
export default function MomentsRail({ posts = [] }) {
  const [openAt, setOpenAt] = useState(null);

  const moments = posts.filter((p) => p && p.mediaUrl).slice(0, 12);
  if (moments.length === 0) return null;

  const items = moments.map((p) => ({
    src: p.mediaUrl,
    alt: (p.body || '').slice(0, 120) || 'Shared moment',
  }));

  return (
    <>
      <div className="moments-rail" aria-label="Moments">
        {moments.map((p, i) => {
          const name = p.author?.name || 'Unknown';
          const first = name.split(' ')[0];
          return (
            <button
              key={p.id || i}
              className="moment"
              onClick={() => setOpenAt(i)}
              title={name}
              aria-label={`View moment by ${name}`}
            >
              <span className="moment-ring">
                <Avatar name={name} size={56} />
              </span>
              <span className="moment-name">{first}</span>
            </button>
          );
        })}
      </div>
      {openAt !== null && (
        <Lightbox
          items={items}
          index={openAt}
          onIndex={setOpenAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}
