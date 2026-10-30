import { useEffect, useState } from 'react';
import {
  AlertTriangle, Camera, CheckCircle2, Circle, Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone,
  ShieldAlert, ShieldCheck, ShieldQuestion, Siren, UserRound, X,
} from 'lucide-react';
import { DelayBadge, LogToggle, MenuBadge, Pill, PocBadge, SourceTag } from './Badges.jsx';
import { CONFIG } from '../lib/config.js';
import { diffMinutes, fmtDuration, fmtTime } from '../lib/time.js';

function Section({ icon: Icon, title, right, children }) {
  return (
    <section className="border-t border-line px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <Icon className="h-4 w-4 text-muted" aria-hidden /> {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function GeofenceMap({ geofence, checkin }) {
  const cell = geofence.cell;
  if (!cell) return <p className="text-sm text-muted">No valid geohash captured for this site.</p>;
  const { minLat, maxLat, minLng, maxLng } = cell.bounds;
  const W = 220;
  const H = 150;
  const pad = 24;
  // Expand the view so a far-away check-in point still fits.
  let vMinLat = minLat, vMaxLat = maxLat, vMinLng = minLng, vMaxLng = maxLng;
  if (checkin) {
    vMinLat = Math.min(vMinLat, checkin.lat); vMaxLat = Math.max(vMaxLat, checkin.lat);
    vMinLng = Math.min(vMinLng, checkin.lng); vMaxLng = Math.max(vMaxLng, checkin.lng);
  }
  const x = (lng) => pad + ((lng - vMinLng) / (vMaxLng - vMinLng || 1)) * (W - pad * 2);
  const y = (lat) => H - pad - ((lat - vMinLat) / (vMaxLat - vMinLat || 1)) * (H - pad * 2);
  const inside = geofence.status === 'verified';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[150px] w-[220px] shrink-0 rounded-lg bg-canvas/60" role="img"
      aria-label={`Geohash cell with ${checkin ? (inside ? 'check-in inside' : 'check-in outside') : 'no check-in GPS'}`}>
      <rect x={x(minLng)} y={y(maxLat)} width={x(maxLng) - x(minLng)} height={y(minLat) - y(maxLat)}
        className="fill-accent/10 stroke-accent" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx={x(cell.lng)} cy={y(cell.lat)} r="3" className="fill-accent" />
      {checkin && (
        <>
          <line x1={x(cell.lng)} y1={y(cell.lat)} x2={x(checkin.lng)} y2={y(checkin.lat)}
            className={inside ? 'stroke-good/60' : 'stroke-bad/70'} strokeWidth="1" />
          <circle cx={x(checkin.lng)} cy={y(checkin.lat)} r="5" className={inside ? 'fill-good' : 'fill-bad'} />
        </>
      )}
      <text x="8" y="14" className="fill-faint text-[9px]">geohash cell</text>
    </svg>
  );
}

const CHECK_GEOFENCE = {
  verified: { tone: 'good', icon: ShieldCheck, label: 'Geofence verified' },
  outside: { tone: 'bad', icon: ShieldAlert, label: 'Outside geofence' },
  'no-gps': { tone: 'warn', icon: ShieldQuestion, label: 'No check-in GPS' },
  unknown: { tone: 'muted', icon: ShieldQuestion, label: 'Unknown' },
};

export default function SiteDrawer({ site, onClose, onLogChange, logOverridden, onPocUpdate }) {
  const [note, setNote] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => setNote(''), [site?.id]);

  if (!site) return null;
  const d = site.derived;
  const t = site.timestamps;
  const gf = CHECK_GEOFENCE[d.geofence.status];
  // The tracker only reports a count, so no per-photo list is shown unless an import supplies real items.
  const items = site.photos.items;
  const photoPct = site.photos.required ? Math.min(100, Math.round(((site.photos.uploaded ?? 0) / site.photos.required) * 100)) : 0;

  const audit = [
    { label: 'Planned arrival', value: t.expectedArrival },
    { label: 'Actual arrival (REACHED SITE)', value: t.actualArrival, delta: d.lateBy, deltaLabel: 'vs plan', warnAt: CONFIG.LATE_ARRIVAL_MINOR_MIN },
    { label: '"Reached site" checkpoint tap', value: t.checkpointClick, delta: d.drift, deltaLabel: 'vs arrival', warnAt: CONFIG.TIMESTAMP_DRIFT_TOLERANCE_MIN, abs: true },
    { label: 'Entry scan (first camera live)', value: t.entryScan, delta: diffMinutes(t.entryScan, t.actualArrival), deltaLabel: 'after arrival' },
    { label: 'Exit scan (left site)', value: t.exitScan, delta: diffMinutes(t.exitScan, t.entryScan), deltaLabel: 'on site', neutral: true },
  ];

  const phoneDigits = site.poc.phone.replace(/[^\d]/g, '');
  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink-soft hover:bg-sunken aria-disabled:pointer-events-none aria-disabled:opacity-40';

  const addNote = () => {
    if (!note.trim()) return;
    const now = new Date();
    onPocUpdate(site.id, {
      notes: [...site.poc.notes, { time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, author: 'You', text: note.trim() }],
    });
    setNote('');
  };

  return (
    <>
      <div className="fixed inset-0 z-30 bg-scrim/40" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" aria-label={`Site details: ${site.name}`}
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-line bg-surface shadow-2xl animate-[slidein_.18s_ease-out]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-mono">{site.id}</span> · {site.city || '—'} · {site.date || 'no date'} <SourceTag source={site.source} />
            </div>
            <h2 className="mt-1 truncate text-lg font-semibold text-ink">{site.name}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <DelayBadge level={d.delayLevel} minutes={Math.max(d.worstOver, d.lateBy ?? 0)} />
              <MenuBadge status={site.menuStatus} />
              <LogToggle status={site.logStatus} overridden={logOverridden} onChange={(v) => onLogChange(site.id, v)} />
              {site.capture?.pct != null && (
                <Pill tone={site.capture.pct >= CONFIG.CAPTURE_PASS_PCT ? 'good' : 'bad'}>Capture {site.capture.pct}%</Pill>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {site.sourceUrl && (
              <a href={site.sourceUrl} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-muted hover:bg-sunken hover:text-ink" title="Open in tracker">
                <ExternalLink className="h-5 w-5" />
              </a>
            )}
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-sunken hover:text-ink" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {d.flags.length > 0 && (
            <div className="mx-5 mb-4 rounded-xl border border-bad/20 bg-bad/5 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 label-caps !text-bad">
                <AlertTriangle className="h-3.5 w-3.5" /> {d.flags.length} red flag{d.flags.length === 1 ? '' : 's'}
              </div>
              <ul className="space-y-1 text-sm">
                {d.flags.map((f) => (
                  <li key={f.text} className={f.level === 'critical' ? 'text-bad' : 'text-warn'}>• {f.text}</li>
                ))}
              </ul>
            </div>
          )}

          <Section icon={MapPin} title="Geofence verification" right={<Pill tone={gf.tone} icon={gf.icon}>{gf.label}</Pill>}>
            <div className="flex flex-col gap-4 sm:flex-row">
              <GeofenceMap geofence={d.geofence} checkin={site.checkin} />
              <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted">Geohash</dt><dd className="font-mono text-ink">{site.geohash || '—'}</dd>
                <dt className="text-muted">Zone</dt><dd className="text-ink">{site.zone} · <span className="font-mono">{site.zoneCode}</span></dd>
                {d.geofence.cell && (
                  <>
                    <dt className="text-muted">Cell centre</dt>
                    <dd className="font-mono text-xs text-ink">{d.geofence.cell.lat.toFixed(5)}, {d.geofence.cell.lng.toFixed(5)}</dd>
                    <dt className="text-muted">Cell size</dt>
                    <dd className="text-ink">{Math.round(d.geofence.cell.widthM)} × {Math.round(d.geofence.cell.heightM)} m</dd>
                  </>
                )}
                <dt className="text-muted">Check-in GPS</dt>
                <dd className="font-mono text-xs text-ink">{site.checkin ? `${site.checkin.lat.toFixed(5)}, ${site.checkin.lng.toFixed(5)}` : 'Not captured'}</dd>
                <dt className="text-muted">Distance</dt>
                <dd className={d.geofence.status === 'outside' ? 'text-bad' : 'text-ink'}>
                  {d.geofence.distanceM != null ? `${d.geofence.distanceM} m (limit ${CONFIG.GEOFENCE_RADIUS_M} m)` : '—'}
                </dd>
              </dl>
            </div>
          </Section>

          <Section icon={Camera} title="Site photo audit"
            right={<span className={`text-sm tabular-nums ${d.photoDeficit ? 'text-warn' : 'text-good'}`}>{site.photos.uploaded ?? '—'}/{site.photos.required}</span>}>
            {site.photos.uploaded == null ? (
              <p className="text-sm text-muted">Photo count not captured yet. Open this session's page in the tracker with the extension running.</p>
            ) : (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-track">
                  <div className={`h-full ${d.photoDeficit ? (d.photoDeficit > 5 ? 'bg-bad' : 'bg-warn') : 'bg-good'}`} style={{ width: `${photoPct}%` }} />
                </div>
                <p className={`mt-2 text-sm ${d.photoDeficit ? 'text-bad' : 'text-good'}`}>
                  {d.photoDeficit
                    ? `${d.photoDeficit} more photo${d.photoDeficit === 1 ? '' : 's'} needed to reach the SOP minimum of ${site.photos.required}.`
                    : `Meets the SOP minimum of ${site.photos.required} photos.`}
                </p>
                {items ? (
                  <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                    {items.map((p, i) => (
                      <li key={`${p.label}-${i}`} className="flex items-center gap-2 text-sm">
                        {p.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-good" /> : <Circle className="h-4 w-4 shrink-0 text-bad" />}
                        <span className={p.done ? 'text-ink-soft' : 'text-bad'}>{p.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-faint">The tracker reports a photo count only, not which photos were taken.</p>
                )}
              </>
            )}
          </Section>

          <Section icon={Clock} title="Timestamp audit log">
            <ol className="space-y-2">
              {audit.map((a) => {
                const bad = !a.neutral && a.delta != null && a.warnAt != null && (a.abs ? Math.abs(a.delta) : a.delta) > a.warnAt;
                return (
                  <li key={a.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">{a.label}</span>
                    <span className="flex items-center gap-2 tabular-nums">
                      <span className="text-ink">{fmtTime(a.value)}</span>
                      {a.delta != null && (
                        <span className={`text-xs ${bad ? 'font-semibold text-bad' : 'text-faint'}`}>
                          {a.delta > 0 ? '+' : ''}{fmtDuration(a.delta)} {a.deltaLabel}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>

            {site.checkpoints.length > 0 && (
              <details className="mt-4 rounded-lg border border-line bg-canvas/40 p-3" open={site.checkpoints.some((c) => c.outOfSequence)}>
                <summary className="cursor-pointer label-caps">
                  Checkpoint sequence ({site.checkpoints.filter((c) => c.done).length}/{site.checkpoints.length})
                </summary>
                <ol className="mt-2 space-y-1">
                  {site.checkpoints.map((c, i) => (
                    <li key={`${c.name}-${i}`} className="flex items-center justify-between text-sm">
                      <span className={`flex items-center gap-2 ${c.done ? 'text-ink-soft' : 'text-faint'}`}>
                        {c.done ? <CheckCircle2 className="h-3.5 w-3.5 text-good" /> : <Circle className="h-3.5 w-3.5" />}
                        {c.name}
                      </span>
                      <span className={`tabular-nums ${c.outOfSequence ? 'font-semibold text-bad' : 'text-muted'}`}>
                        {c.done ? fmtTime(c.time) : 'not tapped'}
                        {c.outOfSequence && ' · out of sequence'}
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </Section>

          {site.intervals.length > 0 && (
            <Section icon={Siren} title="Delays vs. target">
              <ul className="space-y-3">
                {site.intervals.map((iv) => (
                  <li key={iv.name} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-soft">{iv.name}</span>
                      <span className={`tabular-nums ${iv.overMin ? 'text-bad' : 'text-muted'}`}>
                        {iv.actualMin} / {iv.targetMin} min{iv.overMin ? ` · +${iv.overMin}` : ''}
                      </span>
                    </div>
                    {iv.causes?.map((c, i) => (
                      <p key={i} className={`mt-1 border-l-2 pl-2 text-xs ${/no delay/i.test(`${c.category ?? ''} ${c.text}`) && iv.overMin ? 'border-warn text-warn' : 'border-line-strong text-muted'}`}>
                        {c.category && <span className="font-medium text-ink-soft">{c.category}: </span>}
                        {c.text}{c.author ? ` — ${c.author}` : ''}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section icon={UserRound} title="PoC & escalation" right={<PocBadge status={site.poc.status} />}>
            <div className="mb-3 text-sm">
              <div className="text-ink">{site.poc.name || 'PoC not captured in tracker'}</div>
              <div className="text-xs text-muted">
                {site.poc.phone || 'No phone'}{site.poc.email ? ` · ${site.poc.email}` : ''}{site.siteLead ? ` · Site lead: ${site.siteLead}` : ''}
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <a className={btn} href={phoneDigits ? `tel:+${phoneDigits}` : undefined} aria-disabled={!phoneDigits}><Phone className="h-4 w-4" /> Call</a>
              <a className={btn} href={phoneDigits ? `https://wa.me/${phoneDigits}` : undefined} target="_blank" rel="noreferrer" aria-disabled={!phoneDigits}>
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              <a className={btn} href={site.poc.email ? `mailto:${site.poc.email}?subject=${encodeURIComponent(`Site ${site.id} – ${site.name}`)}` : undefined} aria-disabled={!site.poc.email}>
                <Mail className="h-4 w-4" /> Email
              </a>
              {site.poc.status !== 'escalated' ? (
                <button type="button" className={`${btn} border-bad/40 text-bad hover:bg-bad/10`} onClick={() => onPocUpdate(site.id, { status: 'escalated' })}>
                  <Siren className="h-4 w-4" /> Mark escalated
                </button>
              ) : (
                <button type="button" className={btn} onClick={() => onPocUpdate(site.id, { status: null })}>
                  <CheckCircle2 className="h-4 w-4" /> Resolve
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {site.poc.notes.length === 0 && <li className="text-sm text-faint">No escalation notes.</li>}
              {site.poc.notes.map((n, i) => (
                <li key={i} className="rounded-lg bg-scrim/40 p-2.5 text-sm">
                  <div className="text-xs text-faint">{[n.time, n.author].filter(Boolean).join(' · ')}</div>
                  <div className="text-ink-soft">{n.text}</div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()}
                placeholder="Add an escalation note…"
                className="h-9 flex-1 rounded-lg border border-line-strong bg-canvas px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none" />
              <button type="button" onClick={addNote} className="rounded-lg bg-track px-3 text-sm text-ink hover:bg-track">Add</button>
            </div>
          </Section>
        </div>
      </aside>
    </>
  );
}
