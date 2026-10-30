import { AlertTriangle, CheckCircle2, Clock, FileCheck2, FileClock, FileX2, RefreshCw, Siren } from 'lucide-react';

// The tracker's pill: 999px radius, 11px/500, tinted background with a same-colour hairline.
const pill = 'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap';

const TONES = {
  good: 'bg-good/10 text-good ring-good/30',
  warn: 'bg-warn/10 text-warn ring-warn/30',
  bad: 'bg-bad/10 text-bad ring-bad/30',
  info: 'bg-accent/10 text-accent ring-accent/30',
  muted: 'bg-faint/10 text-muted ring-faint/40',
};

export function Pill({ tone = 'muted', icon: Icon, children, title }) {
  return (
    <span className={`${pill} ${TONES[tone]}`} title={title}>
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {children}
    </span>
  );
}

// Tracker status colours: active is amber in the tracker; others follow the same tinted-pill style.
const STATUS_TONE = {
  planned: 'info', active: 'warn', 'transferring in progress': 'info', transferred: 'info',
  approved: 'good', dispatched: 'info', completed: 'good', cancelled: 'muted',
};

export function StatusPill({ status }) {
  if (!status) return null;
  return <Pill tone={STATUS_TONE[status] ?? 'muted'}>{status}</Pill>;
}

export function DelayBadge({ level, minutes }) {
  if (level === 'critical')
    return <Pill tone="bad" icon={Siren}>Critical{minutes ? ` +${minutes}m` : ''}</Pill>;
  if (level === 'minor')
    return <Pill tone="warn" icon={Clock}>Delayed{minutes ? ` +${minutes}m` : ''}</Pill>;
  if (level === 'unknown')
    return <Pill tone="muted" title="No interval or arrival-vs-plan data for this site yet">No data</Pill>;
  return <Pill tone="good" icon={CheckCircle2}>On track</Pill>;
}

export function MenuBadge({ status }) {
  if (status === 'configured') return <Pill tone="good" icon={CheckCircle2}>Configured</Pill>;
  if (status === 'outdated') return <Pill tone="warn" icon={AlertTriangle}>Outdated</Pill>;
  if (status === 'pending') return <Pill tone="info" icon={RefreshCw}>Pending sync</Pill>;
  return <Pill tone="muted" title="The tracker has no menu field; import menu_status to fill this in">Not tracked</Pill>;
}

const POC_TONE = { reachable: 'good', delayed: 'warn', unresponsive: 'bad', escalated: 'bad', unknown: 'muted' };
const POC_LABEL = { reachable: 'Reachable', delayed: 'Delayed', unresponsive: 'Unresponsive', escalated: 'Escalated', unknown: 'No signal' };

export function PocBadge({ status }) {
  return <Pill tone={POC_TONE[status] ?? 'muted'}>{POC_LABEL[status] ?? status}</Pill>;
}

const LOG_NEXT = { updated: 'pending', pending: 'missing', missing: 'updated', unknown: 'updated' };
const LOG_META = {
  updated: { tone: 'good', icon: FileCheck2, label: 'Updated' },
  pending: { tone: 'warn', icon: FileClock, label: 'Pending' },
  missing: { tone: 'bad', icon: FileX2, label: 'Missing' },
  unknown: { tone: 'muted', icon: FileClock, label: 'Unknown' },
};

/** Click cycles Updated → Pending → Missing. Stops row click from opening the drawer. */
export function LogToggle({ status, onChange, overridden }) {
  const m = LOG_META[status] ?? LOG_META.missing;
  const Icon = m.icon;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(LOG_NEXT[status] ?? 'updated');
      }}
      className={`${pill} ${TONES[m.tone]} cursor-pointer hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
      title="Click to change internal log status"
      aria-label={`Internal log: ${m.label}. Click to change.`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {m.label}
      {overridden && <span className="text-[10px] opacity-70">•</span>}
    </button>
  );
}

export function PhotoBar({ uploaded, required }) {
  if (uploaded == null) {
    return <span className="text-xs text-faint" title="Open this session in the tracker to capture photo counts">— / {required}</span>;
  }
  const pct = required ? Math.min(100, Math.round((uploaded / required) * 100)) : 0;
  const tone = uploaded >= required ? 'bg-good' : required - uploaded > 5 ? 'bg-bad' : 'bg-warn';
  return (
    <div className="flex min-w-[110px] items-center gap-2" title={`${uploaded} of ${required} photos`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track/70">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`tabular-nums text-xs ${uploaded >= required ? 'text-ink-soft' : 'text-warn'}`}>
        {uploaded}/{required}
      </span>
    </div>
  );
}

const SOURCE = {
  extension: ['Live', 'info'],
  csv: ['CSV', 'muted'],
  json: ['JSON', 'muted'],
};

export function SourceTag({ source }) {
  const [label, tone] = SOURCE[source] ?? [source, 'muted'];
  return <Pill tone={tone}>{label}</Pill>;
}
