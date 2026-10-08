import { useEffect, useState } from 'react';
import { MoreHorizontal, Flag, Ban, ShieldCheck } from 'lucide-react';
import { Modal } from './ui';
import { Safety } from '../lib/api';
import { useStore } from '../store/store';
import './growth.css';

const REASONS = [
  ['SPAM', 'Spam or advertising'],
  ['SCAM', 'Scam or payment problem'],
  ['FAKE', 'Fake or impersonating someone'],
  ['HARASSMENT', 'Harassment or abuse'],
  ['INAPPROPRIATE', 'Inappropriate content'],
  ['OTHER', 'Something else'],
];

export function ReportModal({ targetType, targetId, label, onClose }) {
  const { pushToast } = useStore();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      await Safety.report({ targetType, targetId, reason, details: details.trim() || undefined });
      pushToast('Thanks. Our team will review this report.');
      onClose();
    } catch (e) { pushToast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Report ${label || 'this'}`} onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 10px' }}>Reports are private. The other person is not told who reported them.</p>
      {REASONS.map(([v, l]) => (
        <label className="radio-row" key={v}><input type="radio" name="rr" checked={reason === v} onChange={() => setReason(v)} /> {l}</label>
      ))}
      <textarea className="sf-text" rows={3} maxLength={1000} placeholder="Anything else we should know? (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue btn-sm" onClick={submit} disabled={!reason || busy}>{busy ? 'Sending…' : 'Send report'}</button>
      </div>
    </Modal>
  );
}

/** "⋯" menu on a person: report them, or block / unblock them. */
export default function SafetyMenu({ person, onBlockChange, blocked = false }) {
  const { pushToast } = useStore();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(false);
  const [isBlocked, setIsBlocked] = useState(blocked);
  useEffect(() => setIsBlocked(blocked), [blocked]);

  const toggleBlock = async () => {
    setOpen(false);
    if (!isBlocked && !window.confirm(`Block ${person.name}? They won't be able to message, follow or send you booking requests, and you won't see their messages.`)) return;
    try {
      if (isBlocked) { await Safety.unblock(person.id); pushToast(`Unblocked ${person.name}.`); }
      else { await Safety.block(person.id); pushToast(`Blocked ${person.name}.`); }
      setIsBlocked(!isBlocked);
      onBlockChange?.(!isBlocked);
    } catch (e) { pushToast(e.message, 'error'); }
  };

  return (
    <div className="sf-wrap">
      <button className="btn btn-ghost btn-sm sf-more" onClick={() => setOpen((o) => !o)} aria-label="More options" aria-expanded={open}><MoreHorizontal size={16} /></button>
      {open && (
        <>
          <div className="sf-scrim" onClick={() => setOpen(false)} />
          <div className="sf-menu" role="menu">
            <button role="menuitem" onClick={() => { setOpen(false); setReport(true); }}><Flag size={15} /> Report</button>
            <button role="menuitem" onClick={toggleBlock}>{isBlocked ? <><ShieldCheck size={15} /> Unblock</> : <><Ban size={15} /> Block</>}</button>
          </div>
        </>
      )}
      {report && <ReportModal targetType="USER" targetId={person.id} label={person.name} onClose={() => setReport(false)} />}
    </div>
  );
}
