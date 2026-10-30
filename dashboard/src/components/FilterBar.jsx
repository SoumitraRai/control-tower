import { Search } from 'lucide-react';
import { TRACKER_STATUSES } from '../lib/config.js';
import { timeTab } from '../lib/schema.js';

// Same control style as the tracker's filter grid: white field, 8px radius, 41px tall.
const control =
  'h-[41px] w-full min-w-0 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none';

export const EMPTY_FILTERS = {
  tab: 'current', q: '', location: 'all', status: 'all', kitHolder: 'all', from: '', to: '',
  zone: 'all', geo: '', delay: 'all', photo: 'all', menu: 'all', log: 'all',
};

const TABS = [
  ['current', 'Current'],
  ['future', 'Future'],
  ['past', 'Past'],
  ['all', 'All'],
];

function Field({ label, children }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="label-caps">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, all, options, format = (v) => v }) {
  return (
    <select className={control} value={value} onChange={onChange}>
      <option value="all">{all}</option>
      {options.map((o) => (Array.isArray(o) ? o : [o, format(o)])).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

export default function FilterBar({ filters, setFilters, options, shown, total }) {
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const dirty = Object.entries(filters).some(([k, v]) => k !== 'tab' && v !== EMPTY_FILTERS[k]);
  // Known tracker statuses first, then anything else seen in the data.
  const statuses = [...TRACKER_STATUSES, ...options.statuses.filter((s) => !TRACKER_STATUSES.includes(s))];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label="Session timing">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={filters.tab === k}
            onClick={() => setFilters((f) => ({ ...f, tab: k }))}
            className={`-mb-px border-b-2 px-3.5 py-2 text-sm ${
              filters.tab === k ? 'border-ink font-medium text-ink' : 'border-transparent text-ink-soft hover:text-ink'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Location">
          <Select value={filters.location} onChange={set('location')} all="All locations" options={options.locations} />
        </Field>
        <Field label="Status">
          <Select value={filters.status} onChange={set('status')} all="Any status" options={statuses} />
        </Field>
        <Field label="Kit holder">
          <Select value={filters.kitHolder} onChange={set('kitHolder')} all="All kit holders" options={options.kitHolders} />
        </Field>
        <Field label="Zone">
          <Select value={filters.zone} onChange={set('zone')} all="All zones" options={options.zones} />
        </Field>
        <Field label="Delay">
          <Select value={filters.delay} onChange={set('delay')} all="Any delay"
            options={[['on-track', 'On track'], ['minor', 'Delayed'], ['critical', 'Critical'], ['unknown', 'No data']]} />
        </Field>
        <Field label="Photos">
          <Select value={filters.photo} onChange={set('photo')} all="Any photo status"
            options={[['deficit', 'Photo deficit'], ['complete', 'Complete']]} />
        </Field>
        <Field label="Date from">
          <input type="date" className={control} value={filters.from} onChange={set('from')} />
        </Field>
        <Field label="Date to">
          <input type="date" className={control} value={filters.to} onChange={set('to')} />
        </Field>
        <Field label="Menu">
          <Select value={filters.menu} onChange={set('menu')} all="Any menu status"
            options={[['configured', 'Configured'], ['outdated', 'Outdated'], ['pending', 'Pending sync'], ['unknown', 'Not tracked']]} />
        </Field>
        <Field label="Internal log">
          <Select value={filters.log} onChange={set('log')} all="Any log status"
            options={[['updated', 'Updated'], ['pending', 'Pending'], ['missing', 'Missing'], ['unknown', 'Unknown']]} />
        </Field>
        <Field label="Geohash prefix">
          <input value={filters.geo} onChange={set('geo')} placeholder="e.g. tdr1" className={`${control} font-mono placeholder:font-sans placeholder:text-faint`} />
        </Field>
        <Field label="Search">
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
            <input value={filters.q} onChange={set('q')} placeholder="UID, site, PoC…" className={`${control} pl-9 placeholder:text-faint`} />
          </span>
        </Field>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setFilters((f) => ({ ...EMPTY_FILTERS, tab: f.tab }))} disabled={!dirty}
          className="h-10 rounded-lg px-4 text-sm text-ink-soft hover:bg-sunken disabled:opacity-40">
          Clear filters
        </button>
        <span className="text-xs tabular-nums text-muted">{shown} of {total} sites</span>
      </div>
    </div>
  );
}

export function applyFilters(sites, f, quick) {
  const q = f.q.trim().toLowerCase();
  const geo = f.geo.trim().toLowerCase();
  return sites.filter((s) => {
    if (f.tab !== 'all' && timeTab(s) !== f.tab) return false;
    if (quick === 'critical' && s.derived.delayLevel !== 'critical') return false;
    if (quick === 'on-track' && s.derived.delayLevel !== 'on-track') return false;
    if (quick === 'photo-deficit' && s.derived.photoDeficit === 0) return false;
    if (f.location !== 'all' && s.city !== f.location) return false;
    if (f.status !== 'all' && s.status !== f.status) return false;
    if (f.kitHolder !== 'all' && s.kitHolder !== f.kitHolder) return false;
    if (f.from && s.date < f.from) return false;
    if (f.to && s.date > f.to) return false;
    if (f.zone !== 'all' && s.zone !== f.zone) return false;
    if (geo && !s.geohash.startsWith(geo)) return false;
    if (f.delay !== 'all' && s.derived.delayLevel !== f.delay) return false;
    if (f.photo === 'deficit' && s.derived.photoDeficit === 0) return false;
    if (f.photo === 'complete' && s.derived.photoDeficit > 0) return false;
    if (f.menu !== 'all' && s.menuStatus !== f.menu) return false;
    if (f.log !== 'all' && s.logStatus !== f.log) return false;
    if (q) {
      const hay = `${s.id} ${s.name} ${s.city} ${s.geohash} ${s.poc.name} ${s.siteLead} ${s.kitHolder}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
