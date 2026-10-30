import { Activity, Camera, Gauge, Siren } from 'lucide-react';

function Metric({ icon: Icon, label, value, sub, tone, onClick, active }) {
  const ring = {
    good: 'text-good',
    warn: 'text-warn',
    bad: 'text-bad',
    info: 'text-accent',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col gap-2 rounded-xl border p-4 text-left transition ${
        active ? 'border-accent/60 bg-accent/5' : 'border-line bg-surface hover:border-line-strong'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="label-caps">{label}</span>
        <Icon className={`h-4 w-4 ${ring}`} aria-hidden />
      </div>
      <div className={`text-3xl font-semibold tabular-nums ${ring}`}>{value}</div>
      <div className="text-xs text-muted">{sub}</div>
    </button>
  );
}

export default function MetricsHeader({ sites, quickFilter, onQuickFilter }) {
  const active = sites.filter((s) => !['completed', 'cancelled'].includes(String(s.status).toLowerCase()));
  const total = active.length;
  const onTrack = active.filter((s) => s.derived.delayLevel === 'on-track').length;
  const critical = active.filter((s) => s.derived.delayLevel === 'critical').length;
  const deficit = active.filter((s) => s.derived.photoDeficit > 0).length;
  // Rate over sites with timing data only; sites with no data are neither on track nor delayed.
  const measured = active.filter((s) => s.derived.delayLevel !== 'unknown').length;
  const rate = measured ? Math.round((onTrack / measured) * 100) : null;

  const toggle = (k) => onQuickFilter(quickFilter === k ? null : k);

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Summary metrics">
      <Metric icon={Activity} label="Total active sites" value={total} sub={`${sites.length} records loaded`} tone="info"
        onClick={() => onQuickFilter(null)} active={quickFilter == null} />
      <Metric icon={Gauge} label="On-track rate" value={rate == null ? '—' : `${rate}%`}
        sub={`${onTrack} of ${measured} with timing data${total > measured ? ` · ${total - measured} no data` : ''}`}
        tone={rate == null ? 'info' : rate >= 80 ? 'good' : rate >= 50 ? 'warn' : 'bad'} onClick={() => toggle('on-track')} active={quickFilter === 'on-track'} />
      <Metric icon={Siren} label="Critical delays" value={critical} sub="Over target by 30+ min or 45+ min late"
        tone={critical ? 'bad' : 'good'} onClick={() => toggle('critical')} active={quickFilter === 'critical'} />
      <Metric icon={Camera} label="Photo audit deficit" value={deficit} sub="Sites below the photo target"
        tone={deficit ? 'warn' : 'good'} onClick={() => toggle('photo-deficit')} active={quickFilter === 'photo-deficit'} />
    </section>
  );
}
