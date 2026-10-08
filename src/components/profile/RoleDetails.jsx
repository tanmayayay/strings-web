import { Link2, Play, ExternalLink } from 'lucide-react';
import { sectionsFor, fmtValue, isFilled } from '../../lib/profileSchema';
import { embedFor } from './Samples';

const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : null);
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

/** The role-specific part of a profile: sections change with the person's role. */
export default function RoleDetails({ person, onEdit }) {
  const role = person.stakeholderType;
  const data = person.detail?.data || {};
  const sections = sectionsFor(role);
  const legacyInterests = Array.isArray(data.interests) ? data.interests : [];

  const cards = sections.map((sec) => {
    const filled = sec.fields.filter((f) => isFilled(data[f.key]));
    if (!filled.length) return null;

    if (sec.links) {
      return (
        <div className="pf-card" key={sec.title}>
          <h3><Link2 size={16} /> {sec.title}</h3>
          <div className="pf-links">
            {filled.map((f) => {
              const url = safeUrl(data[f.key]);
              if (!url || /^sample\d+Url$/.test(f.key) || (f.key === 'featuredUrl' && embedFor(url))) return null; // playable links show inline in Listen
              const feat = f.key === 'featuredUrl';
              return (
                <a key={f.key} className={`pf-link${feat ? ' feat' : ''}`} href={url} target="_blank" rel="noopener noreferrer">
                  {feat ? <Play size={14} /> : <ExternalLink size={14} />}
                  {feat ? 'Listen to featured work' : f.label}
                  {!feat && <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>{hostOf(url)}</span>}
                </a>
              );
            })}
          </div>
        </div>
      );
    }

    const chips = filled.filter((f) => f.type === 'tags');
    const rows = filled.filter((f) => f.type !== 'tags');
    return (
      <div className="pf-card" key={sec.title}>
        <h3>{sec.title}</h3>
        <dl className="pf-rows" style={{ margin: 0 }}>
          {rows.map((f) => (
            <div key={f.key} className={`pf-row${f.type === 'longtext' ? ' wide' : ''}`}>
              <dt>{f.label}</dt>
              <dd>{fmtValue(f, data[f.key])}</dd>
            </div>
          ))}
          {chips.map((f) => (
            <div key={f.key} className="pf-row wide">
              <dt>{f.label}</dt>
              <dd><div className="pf-chips">{data[f.key].map((t) => <span key={t} className="pf-chip">{t}</span>)}</div></dd>
            </div>
          ))}
        </dl>
      </div>
    );
  });

  const shown = cards.filter(Boolean).length;
  if (!shown && legacyInterests.length) {
    return (
      <div className="pf-card">
        <h3>Interests</h3>
        <div className="pf-chips">{legacyInterests.map((t) => <span key={t} className="pf-chip">{t}</span>)}</div>
      </div>
    );
  }

  if (!shown) {
    return (
      <div className="pf-card pf-empty">
        <b>No details yet</b>
        {onEdit
          ? <>Add your {person.stakeholderType === 'BUYER' ? 'event' : 'role'} details so the right people can find you. <button className="btn btn-blue btn-sm" style={{ marginLeft: 8 }} onClick={onEdit}>Add details</button></>
          : 'This profile has not added more details yet.'}
      </div>
    );
  }
  return <>{cards}</>;
}
