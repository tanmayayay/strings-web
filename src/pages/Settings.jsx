import { Moon, Sun, Trash2, ShieldCheck, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHead, Avatar } from '../components/ui';
import { Profiles } from '../lib/api';
import { useStore } from '../store/store';

const VISIBILITY = [
  ['public', 'Public — anyone can view and message you', 'PUBLIC'],
  ['message-only', 'Public profile, connections-only messaging', 'PUBLIC'],
  ['connections', 'Only accepted connections can view and contact you', 'CONNECTIONS'],
  ['private', 'Fully private — invisible in search', 'PRIVATE'],
];

export default function Settings() {
  const { settings, setSettings, theme, toggleTheme, pushToast, user, userId, logout } = useStore();
  const navigate = useNavigate();
  const set = (k, v) => setSettings({ ...settings, [k]: v });

  const setVisibility = async (v, backendValue) => {
    set('visibility', v);
    if (userId && backendValue) {
      try {
        await Profiles.update(userId, { visibility: backendValue });
      } catch (e) {
        pushToast(e.message, 'error');
        return;
      }
    }
    pushToast('Visibility updated.');
  };

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  const resetLocal = () => {
    if (!window.confirm('Clear locally stored bookmarks and preferences on this device?')) return;
    Object.keys(localStorage).filter((k) => k.startsWith('strings.')).forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div>
      <PageHead title="Settings" sub="Control who can see and contact you." />

      <div className="settings-block">
        <h4>Profile visibility</h4>
        {VISIBILITY.map(([v, label, backendValue]) => (
          <label className="radio-row" key={v}>
            <input type="radio" name="vis" checked={settings.visibility === v} onChange={() => setVisibility(v, backendValue)} />
            {label}
          </label>
        ))}
      </div>

      <div className="settings-block">
        <h4>Appearance</h4>
        <div className="toggle-row">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{theme === 'light' ? <Sun size={15} /> : <Moon size={15} />} Dark mode</span>
          <button className={`switch${theme === 'dark' ? ' on' : ''}`} onClick={toggleTheme} aria-label="Toggle dark mode" />
        </div>
      </div>

      <div className="settings-block">
        <h4>Notifications</h4>
        {[['notifFollowers', 'New followers'], ['notifMessages', 'Messages'], ['notifMatches', 'Opportunity matches'], ['notifDigest', 'Daily news digest']].map(([k, label]) => (
          <div className="toggle-row" key={k}>
            {label}
            <button className={`switch${settings[k] ? ' on' : ''}`} onClick={() => set(k, !settings[k])} aria-label={label} />
          </div>
        ))}
      </div>

      <div className="settings-block">
        <h4>Linked accounts</h4>
        {[['Instagram', 'IG'], ['Spotify', 'SP'], ['YouTube', 'YT']].map(([name, abbr]) => (
          <div className="mini-list-item" key={name} style={{ cursor: 'default' }}>
            <Avatar name={name} size={30} />
            <div><b>{name}</b><span>Not connected</span></div>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => pushToast(`${name} linking opens in the full app — Phase 2.`)}>Connect</button>
          </div>
        ))}
      </div>

      <div className="settings-block">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={15} style={{ color: 'var(--green)' }} /> Trust & safety</h4>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>Verification is manual in this phase — complete your profile and connect at least one linked account, and our team reviews it within a few days. Signed in as <b>{user?.name}</b>.</p>
      </div>

      <div className="settings-block">
        <h4>Account</h4>
        <button className="btn btn-ghost btn-sm" onClick={signOut}>
          <LogOut size={14} /> Sign out
        </button>
      </div>

      <div className="settings-block">
        <h4>Local data</h4>
        <button className="btn btn-ghost btn-sm" onClick={resetLocal} style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
          <Trash2 size={14} /> Clear bookmarks & preferences
        </button>
      </div>
    </div>
  );
}
