import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Phone, ArrowRight, KeyRound } from 'lucide-react';
import { useStore } from '../store/store';
import { Logo } from './ui';

/**
 * Modern sign-in entry point (mocked demo auth).
 * Props: { open: bool, onClose: fn }
 * Any submitted input proceeds to the demo login as the sample artist.
 */
export default function AuthModal({ open, onClose }) {
  const { login, pushToast } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const go = () => {
    login();
    onClose();
    pushToast('Welcome back — signed in to the demo as Meera Iyer.');
    navigate('/home');
  };

  const sendCode = () => {
    if (!phone.trim()) { pushToast('Enter your phone number first.', 'info'); return; }
    setCodeSent(true);
    pushToast('Demo build — any 6-digit code works. Try 123456.', 'info');
    setOtp('123456');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="auth-modal"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="Sign in to Strings"
          >
            <button className="close-x auth-close" onClick={onClose} aria-label="Close">×</button>
            <div className="auth-brand"><Logo size={30} /></div>
            <h3>Welcome back to Strings</h3>
            <p className="auth-sub">Sign in to your network, gigs and messages.</p>

            <div className="auth-tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'email'} className={tab === 'email' ? 'active' : ''} onClick={() => setTab('email')}>
                <Mail size={14} /> Email
              </button>
              <button role="tab" aria-selected={tab === 'phone'} className={tab === 'phone' ? 'active' : ''} onClick={() => setTab('phone')}>
                <Phone size={14} /> Phone OTP
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: tab === 'email' ? -14 : 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tab === 'email' ? 14 : -14 }}
                transition={{ duration: 0.18 }}
              >
                {tab === 'email' ? (
                  <form onSubmit={(e) => { e.preventDefault(); go(); }}>
                    <div className="field">
                      <label htmlFor="auth-email">Email address</label>
                      <input id="auth-email" type="email" placeholder="you@studio.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                    </div>
                    <div className="field">
                      <label htmlFor="auth-pass">Password</label>
                      <input id="auth-pass" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                    </div>
                    <button type="submit" className="btn btn-blue auth-submit">Sign in <ArrowRight size={15} /></button>
                  </form>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); go(); }}>
                    <div className="field">
                      <label htmlFor="auth-phone">Phone number</label>
                      <div className="field-row">
                        <input id="auth-phone" type="tel" placeholder="+91 98200 12345" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={sendCode}>Send code</button>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="auth-otp">One-time passcode</label>
                      <div className="otp-wrap">
                        <KeyRound size={15} className="otp-ico" />
                        <input id="auth-otp" type="text" inputMode="numeric" placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} disabled={!codeSent} />
                      </div>
                      {!codeSent && <p className="field-hint">We&apos;ll text a code to the number above.</p>}
                    </div>
                    <button type="submit" className="btn btn-blue auth-submit" disabled={!codeSent}>Verify &amp; sign in <ArrowRight size={15} /></button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>

            <p className="auth-fine">Demo build — any input signs you in as the sample artist, Meera Iyer. No real credentials are checked.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
