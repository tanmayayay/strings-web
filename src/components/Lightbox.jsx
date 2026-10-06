import { useCallback, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Full-screen media viewer.
 * Props: { items: [{ src, alt }], index, onClose, onIndex }
 * - arrows, Esc, and backdrop click close/navigate
 * - basic touch swipe
 * - locks body scroll while open
 */
export default function Lightbox({ items = [], index = 0, onClose, onIndex }) {
  const count = items.length;
  const safeIndex = count ? ((index % count) + count) % count : 0;
  const item = items[safeIndex];
  const touchRef = useRef(null);

  const go = useCallback(
    (dir) => {
      if (!count || typeof onIndex !== 'function') return;
      onIndex((safeIndex + dir + count) % count);
    },
    [count, onIndex, safeIndex]
  );

  // Lock page scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [go, onClose]);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      go(dx < 0 ? 1 : -1);
    }
  };

  if (!count || !item) return null;

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      onClick={() => onClose?.()}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button className="lightbox-close" onClick={() => onClose?.()} aria-label="Close">
        <X size={20} />
      </button>
      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <img src={item.src} alt={item.alt || ''} draggable={false} />
        {count > 1 && (
          <>
            <button
              className="lightbox-arrow lightbox-prev"
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              aria-label="Previous"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              className="lightbox-arrow lightbox-next"
              onClick={(e) => { e.stopPropagation(); go(1); }}
              aria-label="Next"
            >
              <ChevronRight size={22} />
            </button>
            <span className="lightbox-counter">
              {safeIndex + 1} / {count}
            </span>
          </>
        )}
        {item.alt && <span className="lightbox-caption">{item.alt}</span>}
      </div>
    </div>
  );
}
