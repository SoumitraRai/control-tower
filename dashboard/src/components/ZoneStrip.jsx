// Per-zone health at a glance; click a zone to filter the table.
export default function ZoneStrip({ sites, activeZone, onPick }) {
  const zones = {};
  for (const s of sites) {
    const z = (zones[s.zone] ??= { total: 0, critical: 0, minor: 0, ok: 0, unknown: 0 });
    z.total += 1;
    if (s.derived.delayLevel === 'critical') z.critical += 1;
    else if (s.derived.delayLevel === 'minor') z.minor += 1;
    else if (s.derived.delayLevel === 'unknown') z.unknown += 1;
    else z.ok += 1;
  }
  const entries = Object.entries(zones).sort((a, b) => b[1].critical - a[1].critical || b[1].total - a[1].total);
  if (!entries.length) return null;

  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Zones">
      {entries.map(([zone, z]) => (
        <button
          key={zone}
          type="button"
          onClick={() => onPick(zone)}
          className={`rounded-lg border px-3 py-2 text-left transition ${
            activeZone === zone ? 'border-accent/60 bg-accent/5' : 'border-line bg-surface hover:border-line-strong'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-soft">{zone}</span>
            <span className="tabular-nums text-faint">{z.total} sites</span>
          </div>
          <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-sunken" role="img"
            aria-label={`${z.ok} on track, ${z.minor} delayed, ${z.critical} critical, ${z.unknown} no data`}>
            <span className="bg-good" style={{ width: `${(z.ok / z.total) * 100}%` }} />
            <span className="bg-warn" style={{ width: `${(z.minor / z.total) * 100}%` }} />
            <span className="bg-bad" style={{ width: `${(z.critical / z.total) * 100}%` }} />
            <span className="bg-track" style={{ width: `${(z.unknown / z.total) * 100}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-faint">
            {z.critical ? <span className="text-bad">{z.critical} critical</span> : 'No critical'} · {z.minor} delayed
          </div>
        </button>
      ))}
    </section>
  );
}
