import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, Clock, Wallet, MessageSquare, Send, X } from 'lucide-react';
import { CONVERSATIONS } from '../data/demo';
import { useStore } from '../store/store';
import './booking.css';

const SLOTS = ['10 AM–12 PM', '2–4 PM', '6–8 PM', '8–10 PM'];
const BUDGETS = ['Under ₹15k', '₹15k–30k', '₹30k–60k', '₹60k+'];

export default function BookingModal({ person, day, onClose }) {
  const { addBooking, pushNotif, pushToast, sendMessage } = useStore();
  const [slot, setSlot] = useState(SLOTS[0]);
  const [budget, setBudget] = useState(BUDGETS[1]);
  const [message, setMessage] = useState('');

  const dateStr = day.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const confirm = () => {
    addBooking({
      personId: person.id,
      personName: person.name,
      dateISO: day.toISOString(),
      slot,
      budget,
      message,
      status: 'Requested',
    });
    pushNotif({
      text: `Booking requested with <b>${person.name}</b> for ${dateStr}`,
      kind: 'opportunity',
      link: '/profile/meera',
    });
    const c = CONVERSATIONS.find((c) => c.pid === person.id);
    if (c) sendMessage(c.id, `Hi ${person.name.split(' ')[0]}! I'd like to book you for ${dateStr} (${slot}). Budget: ${budget}.`);
    pushToast(`Booking request sent to ${person.name}.`);
    onClose();
  };

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="modal booking-modal"
        role="dialog"
        aria-modal="true"
        initial={{ scale: 0.9, opacity: 0, y: 28 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      >
        <div className="modal-head">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarCheck size={17} style={{ color: 'var(--blue)' }} /> Request booking
          </h3>
          <button className="close-x" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <p className="booking-who">
          <b>{person.name}</b> · {person.role} · {person.city}
          <br />
          <span>{dateStr}</span>
        </p>

        <div className="field">
          <label><Clock size={13} style={{ verticalAlign: -2, marginRight: 6 }} />Time slot</label>
          <div className="slot-chips">
            {SLOTS.map((s) => (
              <button
                key={s}
                type="button"
                className={`slot-chip${slot === s ? ' active' : ''}`}
                onClick={() => setSlot(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label><Wallet size={13} style={{ verticalAlign: -2, marginRight: 6 }} />Budget</label>
          <div className="select-wrap">
            <select value={budget} onChange={(e) => setBudget(e.target.value)}>
              {BUDGETS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label><MessageSquare size={13} style={{ verticalAlign: -2, marginRight: 6 }} />Message <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(optional)</span></label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Tell ${person.name.split(' ')[0]} about the gig — venue, set length, what you need…`}
          />
        </div>

        <div className="booking-summary" aria-live="polite">
          <span className="booking-summary-label">Summary</span>
          <div>{slot} · {budget} · {dateStr}</div>
        </div>

        <div className="booking-foot">
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-blue" style={{ flex: 2 }} onClick={confirm}>
            <Send size={14} /> Confirm request
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
