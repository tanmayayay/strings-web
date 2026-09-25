import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, Pause, BadgeCheck, Share2, ArrowRight, CalendarCheck, Star, Zap } from 'lucide-react';
import { Logo } from '../components/ui';
import { PEOPLE_BY_ID, availability } from '../data/demo';
import { useStore } from '../store/store';
import './epk.css';

/**
 * Public electronic press kit ("one-sheet") for an artist.
 * Rendered OUTSIDE RequireAuth — no login needed.
 */
export default function Epk() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useStore();
  const [playing, setPlaying] = useState(false);

  const person = PEOPLE_BY_ID[id] || PEOPLE_BY_ID.meera;

  const bars = useMemo(
    () => Array.from({ length: 64 }, (_, i) => 10 + ((i * 53 + person.id.length * 17) % 30)),
    [person.id]
  );
  const upcoming = useMemo(
    () => availability(person.id).filter((d) => d.status === 'free').slice(0, 3),
    [person.id]
  );

  const toggleClip = () => {
    setPlaying((p) => !p);
    pushToast('Demo preview.');
  };

  const requestBooking = () => {
    pushToast('Sign in to the full app to request a booking.');
    navigate('/');
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard unavailable */
    }
    pushToast('Press-kit link copied.');
  };

  return (
    <div className="epk-page">
      <div className="epk-bar">
        <Logo />
        <Link className="btn btn-blue btn-sm" to={`/profile/${person.id}`}>
          Open in Strings <ArrowRight size={14} />
        </Link>
      </div>

      <article className="epk-sheet">
        <p className="epk-sheet-kicker">Electronic press kit · via Strings</p>
        <h1 className="epk-sheet-name">{person.name}</h1>
        <p className="epk-sheet-sub">
          {person.role} · {person.city}
          {person.verified && <BadgeCheck size={16} style={{ color: 'var(--blue)', verticalAlign: -3, marginLeft: 6 }} />}
        </p>
        <p className="epk-sheet-tagline">“{person.tagline}”</p>

        <div className="epk-stat-row">
          <div className="epk-stat"><b>{person.pastGigs}+</b><span>Gigs played</span></div>
          <div className="epk-stat"><b>{person.responseRate}%</b><span>Response rate</span></div>
          <div className="epk-stat"><b>{person.rating || '—'}<Star size={13} style={{ verticalAlign: -1, marginLeft: 3 }} /></b><span>Rating</span></div>
        </div>

        <p className="epk-bio">{person.bio}</p>

        <h3 className="epk-section-title"><Zap size={15} style={{ color: 'var(--amber)', verticalAlign: -2 }} /> Featured clip</h3>
        <div className="epk-clip" onClick={toggleClip} role="button" tabIndex={0}>
          <button className="epk-clip-btn" aria-label={playing ? 'Pause preview' : 'Play preview'}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <div className="epk-clip-bars">{bars.map((h, i) => <span key={i} style={{ height: h }} />)}</div>
          <span className="epk-clip-label">{playing ? 'Playing…' : 'Featured clip'}</span>
        </div>

        <h3 className="epk-section-title"><CalendarCheck size={15} style={{ color: 'var(--blue)', verticalAlign: -2 }} /> Upcoming dates</h3>
        {upcoming.length === 0 ? (
          <p className="epk-empty">No open dates in the next two weeks — check back soon.</p>
        ) : (
          <ul className="epk-dates">
            {upcoming.map((d, i) => (
              <li key={i}>
                <b>{d.date.toLocaleDateString('en-IN', { weekday: 'long' })}</b>
                <span>{d.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} · Available</span>
              </li>
            ))}
          </ul>
        )}

        <div className="epk-cta">
          <h3>Book {person.name.split(' ')[0]}</h3>
          <p>On Strings, booking takes under a minute — pick a free day, choose a slot, and send your request directly.</p>
          <div className="epk-cta-row">
            <button className="btn btn-blue" onClick={requestBooking}>Request booking</button>
            <button className="btn btn-ghost" onClick={share}><Share2 size={14} /> Share</button>
          </div>
        </div>
      </article>

      <footer className="epk-foot">
        <Logo size={20} />
        <span>Tying the music industry together.</span>
      </footer>
    </div>
  );
}
