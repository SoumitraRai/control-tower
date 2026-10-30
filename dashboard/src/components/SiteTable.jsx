import { useMemo, useState } from 'react';
import { ArrowDownUp, ChevronRight, MapPin } from 'lucide-react';
import { DelayBadge, LogToggle, MenuBadge, PhotoBar, PocBadge, SourceTag, StatusPill } from './Badges.jsx';
import { fmtTime } from '../lib/time.js';

const SEVERITY = { critical: 0, minor: 1, 'on-track': 2, unknown: 3 };

const SORTS = {
  risk: (a, b) =>
    SEVERITY[a.derived.delayLevel] - SEVERITY[b.derived.delayLevel] ||
    b.derived.flags.length - a.derived.flags.length,
  name: (a, b) => a.name.localeCompare(b.name),
  photos: (a, b) => b.derived.photoDeficit - a.derived.photoDeficit,
  zone: (a, b) => a.zone.localeCompare(b.zone) || a.geohash.localeCompare(b.geohash),
};

function Th({ children, sortKey, sort, setSort, className = '' }) {
  if (!sortKey) return <th className={`label-caps px-3.5 py-3.5 ${className}`}>{children}</th>;
  return (
    <th className={`label-caps px-3.5 py-3.5 ${className}`} aria-sort={sort === sortKey ? 'descending' : 'none'}>
      <button type="button" onClick={() => setSort(sortKey)} className="label-caps inline-flex items-center gap-1 hover:!text-ink">
        {children}
        <ArrowDownUp className={`h-3 w-3 ${sort === sortKey ? 'text-accent' : 'opacity-40'}`} aria-hidden />
      </button>
    </th>
  );
}

function TimeCell({ site }) {
  const t = site.timestamps;
  const { drift, driftFlag, lateBy } = site.derived;
  return (
    <div className="flex flex-col gap-0.5 whitespace-nowrap text-xs tabular-nums">
      <span className="text-muted">
        Exp <span className="text-ink-soft">{fmtTime(t.expectedArrival)}</span>
        {' → '}Arr{' '}
        <span className={lateBy >= 15 ? 'text-warn' : 'text-ink-soft'}>{fmtTime(t.actualArrival)}</span>
      </span>
      <span className="text-muted">
        Tap <span className={driftFlag ? 'font-semibold text-bad' : 'text-ink-soft'}>{fmtTime(t.checkpointClick)}</span>
        {drift != null && drift !== 0 && (
          <span className={driftFlag ? 'text-bad' : 'text-faint'}> ({drift > 0 ? '+' : ''}{drift}m)</span>
        )}
      </span>
    </div>
  );
}

export default function SiteTable({ sites, onOpen, onLogChange, logOverrides, selectedId }) {
  const [sort, setSort] = useState('risk');
  const rows = useMemo(() => [...sites].sort(SORTS[sort]), [sites, sort]);

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong p-10 text-center text-sm text-muted">
        No sites match these filters.
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[1240px] text-left text-sm">
        <thead className="border-b border-line">
          <tr>
            <Th sortKey="name" sort={sort} setSort={setSort}>Site</Th>
            <Th sortKey="zone" sort={sort} setSort={setSort}>Geohash / Zone</Th>
            <Th>Menu</Th>
            <Th sortKey="photos" sort={sort} setSort={setSort}>Photos</Th>
            <Th>Arrival vs. tap</Th>
            <Th>Internal log</Th>
            <Th sortKey="risk" sort={sort} setSort={setSort}>Delay</Th>
            <Th>PoC</Th>
            <Th className="w-8"><span className="sr-only">Open</span></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((s) => (
            <tr
              key={s.id}
              onClick={() => onOpen(s.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(s.id))}
              tabIndex={0}
              className={`cursor-pointer transition hover:bg-sunken focus:bg-sunken focus:outline-none ${
                selectedId === s.id ? 'bg-sunken' : ''
              }`}
            >
              <td className="px-3.5 py-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      s.derived.delayLevel === 'critical' ? 'bg-bad' : s.derived.flags.length ? 'bg-warn' : s.derived.delayLevel === 'unknown' ? 'bg-faint' : 'bg-good'
                    }`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">{s.name}</div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
                      <span className="font-mono text-ink-soft">{s.id}</span> · {s.city || '—'} <SourceTag source={s.source} />
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <StatusPill status={s.status} />
                      <span className="font-mono text-[11px] text-muted">{s.date || '—'}{s.planned ? ' (planned)' : ''}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-3.5 py-4">
                <div className="flex items-center gap-1 font-mono text-xs text-ink-soft">
                  <MapPin className="h-3 w-3 text-faint" aria-hidden />
                  {s.geohash || '—'}
                </div>
                <div className="whitespace-nowrap text-xs text-faint">
                  {s.zone} · <span className="font-mono">{s.zoneCode}</span>
                </div>
              </td>
              <td className="px-3.5 py-4"><MenuBadge status={s.menuStatus} /></td>
              <td className="px-3.5 py-4"><PhotoBar uploaded={s.photos.uploaded} required={s.photos.required} /></td>
              <td className="px-3.5 py-4"><TimeCell site={s} /></td>
              <td className="px-3.5 py-4">
                <LogToggle status={s.logStatus} overridden={logOverrides[s.id] != null} onChange={(v) => onLogChange(s.id, v)} />
              </td>
              <td className="px-3.5 py-4">
                <DelayBadge level={s.derived.delayLevel} minutes={Math.max(s.derived.worstOver, s.derived.lateBy ?? 0)} />
              </td>
              <td className="px-3.5 py-4">
                <div className="flex flex-col gap-1">
                  <PocBadge status={s.poc.status} />
                  <span className="max-w-[140px] truncate text-xs text-faint">{s.poc.name || 'Not captured'}</span>
                </div>
              </td>
              <td className="px-2 py-3 text-faint"><ChevronRight className="h-4 w-4" aria-hidden /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
