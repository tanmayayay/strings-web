// Validation for a profile's free-form role details (StakeholderDetail.data).
//
// The editor stores role-specific answers (genres, capacity, day rate, links…)
// as one flat JSON object. The server doesn't need to know every role's field
// list — it only guarantees the object is small, flat and safe to render:
//   - at most 60 keys, simple identifier-style key names
//   - values are short text, finite numbers, booleans, or lists of short text
//   - any key ending in "Url" must be an http(s) link (it becomes a clickable link)
const KEY = /^[A-Za-z][A-Za-z0-9]{0,39}$/;

export function cleanDetail(input) {
  if (input == null) return { value: {} };
  if (typeof input !== 'object' || Array.isArray(input)) return { error: 'Field "detail" must be an object.' };
  const entries = Object.entries(input);
  if (entries.length > 60) return { error: 'Field "detail" has too many fields.' };

  const out = {};
  for (const [key, raw] of entries) {
    if (!KEY.test(key)) return { error: `Invalid detail field name "${key.slice(0, 20)}".` };
    if (raw == null || raw === '') continue; // empty = remove
    if (typeof raw === 'boolean') { out[key] = raw; continue; }
    if (typeof raw === 'number') {
      if (!Number.isFinite(raw) || Math.abs(raw) > 1e12) return { error: `Detail "${key}" is not a valid number.` };
      out[key] = raw;
      continue;
    }
    if (typeof raw === 'string') {
      const v = raw.trim();
      if (!v) continue;
      if (v.length > 600) return { error: `Detail "${key}" is too long (max 600 characters).` };
      if (/Url$/.test(key) && !/^https?:\/\/[^\s]{3,300}$/i.test(v)) return { error: `Detail "${key}" must be a link starting with https://` };
      out[key] = v;
      continue;
    }
    if (Array.isArray(raw)) {
      if (raw.length > 30) return { error: `Detail "${key}" has too many items.` };
      const list = [];
      for (const item of raw) {
        if (typeof item !== 'string') return { error: `Detail "${key}" must be a list of text.` };
        const v = item.trim();
        if (!v) continue;
        if (v.length > 80) return { error: `An item in "${key}" is too long (max 80 characters).` };
        list.push(v);
      }
      if (list.length) out[key] = list;
      continue;
    }
    return { error: `Detail "${key}" has an unsupported value.` };
  }
  return { value: out };
}
