import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { Profiles } from '../../lib/api';
import { useStore } from '../../store/store';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "2026-10-14" → a Date at local noon (noon keeps the calendar day stable in any time zone).
const toDate = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const mondayIndex = (date) => (date.getDay() + 6) % 7;
const prettyDay = (key) => { const d = toDate(key); return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };

/** Live availability calendar. Owner: tap a day to mark it busy or free. Visitor: tap a free day to request a booking. */
export default function Availability({ person, isSelf, onPick, tint }) {
  const { pushToast } = useStore();
  const [days, setDays] = useState(null);
  const [today, setToday] = useState(null);
  const [error, setError] = useState(false);
  const [busyDay, setBusyDay] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await Profiles.availability(person.id, 35);
      setDays(r.days);
      setToday(r.today);
      setError(false);
    } catch {
      setError(true);
    }
  }, [person.id]);

  useEffect(() => { setDays(null); load(); }, [load]);

  const toggle = async (d) => {
    if (busyDay) return;
    if (d.status === 'booked') { pushToast('That day has a confirmed booking.'); return; }
    const next = d.status === 'busy' ? 'free' : 'busy';
    setBusyDay(d.date);
    setDays((cur) => cur.map((x) => (x.date === d.date ? { ...x, status: next } : x)));
    try {
      const r = await Profiles.setAvailability([d.date], next);
      if (r?.calendar) setDays((cur) => cur.map((x) => r.calendar.find((c) => c.date === x.date) || x));
    } catch (e) {
      setDays((cur) => cur.map((x) => (x.date === d.date ? { ...x, status: d.status } : x)));
      pushToast(e.message || 'Could not update your calendar.', 'error');
    } finally {
      setBusyDay(null);
    }
  };

  const cells = useMemo(() => {
    if (!days?.length) return [];
    const lead = mondayIndex(toDate(days[0].date));
    return [...Array.from({ length: lead }, () => null), ...days];
  }, [days]);

  const freeCount = days ? days.filter((d) => d.status === 'free').length : 0;
  const nextFree = days?.find((d) => d.status === 'free');

  return (
    <div className="pf-card" id="pf-availability" style={tint ? { '--pf-tint': tint } : undefined}>
      <div className="pf-cal-head">
        <div>
          <h3 style={{ marginBottom: 4 }}><CalendarCheck size={16} /> {isSelf ? 'Your availability' : 'Availability'}</h3>
          <p>
            {!days ? 'Loading calendar…'
              : isSelf ? 'Tap a day to mark it busy or free. Confirmed bookings block a day automatically.'
              : nextFree ? `${freeCount} free days in the next 5 weeks · next free ${prettyDay(nextFree.date)}`
              : 'No free days in the next 5 weeks.'}
          </p>
        </div>
      </div>

      {error ? (
        <div className="pf-empty">Could not load the calendar. <button className="btn btn-ghost btn-xs" onClick={load}>Retry</button></div>
      ) : (
        <>
          <div className="pf-cal">
            {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
            {!days && Array.from({ length: 35 }, (_, i) => <div key={i} className="pf-day shimmer-strip" style={{ border: 'none' }} />)}
            {cells.map((d, i) => {
              if (!d) return <div key={`b${i}`} className="pf-day blank" />;
              const date = toDate(d.date);
              const first = date.getDate() === 1 || i === (cells.findIndex(Boolean));
              const canAct = isSelf ? d.status !== 'booked' : d.status === 'free' && !!onPick;
              return (
                <button
                  key={d.date}
                  type="button"
                  className={`pf-day ${d.status}${canAct ? ' act' : ''}${d.date === today ? ' today' : ''}`}
                  disabled={!canAct && !(isSelf && d.status === 'booked')}
                  onClick={() => (isSelf ? toggle(d) : onPick?.(date))}
                  title={`${prettyDay(d.date)} — ${d.status === 'free' ? (isSelf ? 'Free' : 'Free · tap to request') : d.status === 'busy' ? 'Busy' : `Booked${d.slot ? ` · ${d.slot}` : ''}`}`}
                  aria-label={`${prettyDay(d.date)}, ${d.status}`}
                >
                  {first && <small>{MONTHS[date.getMonth()]}</small>}
                  {date.getDate()}
                  {isSelf && d.pending > 0 && <span className="pend">{d.pending}</span>}
                </button>
              );
            })}
          </div>
          <div className="pf-legend">
            <span><i style={{ background: 'color-mix(in srgb, var(--green) 40%, transparent)' }} />Free{!isSelf && ' — tap to request'}</span>
            <span><i style={{ background: 'var(--bg-softer)' }} />Busy</span>
            <span><i style={{ background: 'color-mix(in srgb, var(--red) 50%, transparent)' }} />Booked</span>
            {isSelf && <span><i style={{ background: '#EF6C3A' }} />Pending requests</span>}
          </div>
        </>
      )}
    </div>
  );
}
