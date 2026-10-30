/** Parse "HH:MM" (or "H:MM", optionally with am/pm) to minutes since midnight. */
export function toMinutes(hhmm) {
  if (hhmm == null || hhmm === '') return null;
  if (typeof hhmm === 'number') return hhmm;
  const m = String(hhmm).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (!m) {
    // ISO timestamps → local HH:MM
    const d = new Date(hhmm);
    if (!Number.isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
    return null;
  }
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return h * 60 + min;
}

export function diffMinutes(later, earlier) {
  const a = toMinutes(later);
  const b = toMinutes(earlier);
  if (a == null || b == null) return null;
  return a - b;
}

export function fmtTime(v) {
  const m = toMinutes(v);
  if (m == null) return '—';
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  return `${String(h).padStart(2, '0')}:${mm}`;
}

export function fmtDuration(min) {
  if (min == null) return '—';
  const sign = min < 0 ? '−' : '';
  const a = Math.abs(min);
  if (a < 60) return `${sign}${a}m`;
  return `${sign}${Math.floor(a / 60)}h ${String(a % 60).padStart(2, '0')}m`;
}

export function fmtRelative(iso) {
  if (!iso) return 'never';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}
