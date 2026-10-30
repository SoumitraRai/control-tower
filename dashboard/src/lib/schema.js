import { CONFIG, CITY_REGION } from './config.js';

const CLOSED_STATUS = /completed|cancelled/;
import { decodeGeohash, haversineMeters, isInside } from './geohash.js';
import { diffMinutes, toMinutes } from './time.js';

/**
 * Canonical site record used everywhere in the dashboard.
 * The extension and CSV/JSON import all go through normalizeSite().
 *
 * {
 *   id, name, city, date, status,
 *   geohash, zone, zoneCode,
 *   checkin: { lat, lng } | null,           // GPS at "Reached site" tap, if known
 *   menuStatus: 'configured' | 'outdated' | 'pending',
 *   photos: { uploaded, required, items?: [{ label, done }] },
 *   timestamps: { expectedArrival, actualArrival, checkpointClick, entryScan, exitScan },
 *   checkpoints: [{ name, time, done }],
 *   logStatus: 'updated' | 'pending' | 'missing',
 *   intervals: [{ name, actualMin, targetMin, causes: [{ text, author }] }],
 *   capture: { expectedH, actualH, pct } | null,
 *   cameras: { total, live },
 *   poc: { name, phone, email, status: 'unknown'|'reachable'|'delayed'|'unresponsive'|'escalated', notes: [{ time, author, text }] },
 *
 * Missing values stay missing (null / '' / 'unknown'); nothing is filled in with a guess.
 *   siteLead, source: 'extension'|'csv'|'json', syncedAt, sourceUrl
 * }
 */

const MENU = ['configured', 'outdated', 'pending', 'unknown'];
const LOG = ['updated', 'pending', 'missing', 'unknown'];
const POC = ['reachable', 'delayed', 'unresponsive', 'escalated', 'unknown'];

const pick = (v, allowed, fallback) => {
  const s = String(v ?? '').toLowerCase().trim().replace(/[\s_-]+/g, '');
  const hit = allowed.find((a) => a.replace(/[\s_-]+/g, '') === s || s.startsWith(a.slice(0, 5)));
  return hit ?? fallback;
};

const num = (v, fallback = null) => {
  if (v == null || v === '') return fallback;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};

export function regionFor(city) {
  if (!city) return 'Unassigned';
  const key = String(city).toLowerCase().trim();
  for (const [k, region] of Object.entries(CITY_REGION)) {
    if (key.includes(k)) return region;
  }
  return 'Unassigned';
}

export function normalizeSite(raw, source = raw?.source ?? 'json') {
  const geohash = raw.geohash ? String(raw.geohash).trim().toLowerCase() : '';
  const required = num(raw.photos?.required ?? raw.photos_required, CONFIG.PHOTO_TARGET);
  // null = not captured yet (e.g. a list-page scrape) — shown as "—", never flagged as a deficit.
  const uploadedRaw = num(raw.photos?.uploaded ?? raw.photos_uploaded, null);
  const uploaded = uploadedRaw == null ? null : Math.max(0, uploadedRaw);
  const ts = raw.timestamps ?? {};

  const site = {
    id: String(raw.id ?? raw.site_id ?? raw.uid ?? cryptoId()),
    name: raw.name ?? raw.site_name ?? raw.business ?? 'Unnamed site',
    city: raw.city ?? raw.location ?? '',
    // List-page DATE / STATUS first; the session page's own date line and status only as a fallback.
    date: (String(raw.date ?? raw.pageDate ?? '').match(/\d{4}-\d{2}-\d{2}/) ?? [''])[0],
    status: String(raw.status ?? raw.pageStatus ?? '').toLowerCase().trim(),
    geohash,
    zone: raw.zone || regionFor(raw.city ?? raw.location),
    zoneCode: geohash ? geohash.slice(0, CONFIG.ZONE_PRECISION) : '—',
    checkin: raw.checkin && raw.checkin.lat != null ? { lat: +raw.checkin.lat, lng: +raw.checkin.lng } : null,
    menuStatus: pick(raw.menuStatus ?? raw.menu_status, MENU, 'unknown'),
    photos: {
      uploaded,
      required,
      items: Array.isArray(raw.photos?.items) ? raw.photos.items : null,
    },
    timestamps: {
      expectedArrival: ts.expectedArrival ?? raw.expected_arrival ?? null,
      actualArrival: ts.actualArrival ?? raw.actual_arrival ?? null,
      checkpointClick: ts.checkpointClick ?? raw.checkpoint_click ?? null,
      entryScan: ts.entryScan ?? raw.entry_scan ?? null,
      exitScan: ts.exitScan ?? raw.exit_scan ?? null,
    },
    checkpoints: Array.isArray(raw.checkpoints) ? raw.checkpoints : [],
    logStatus: pick(raw.logStatus ?? raw.log_status, LOG, 'unknown'),
    intervals: Array.isArray(raw.intervals)
      ? raw.intervals
      : raw.delay_minutes != null && raw.delay_minutes !== ''
        ? [{ name: raw.delay_reason || 'Reported delay', actualMin: num(raw.delay_minutes, 0), targetMin: 0, causes: [] }]
        : [],
    capture: raw.capture ?? null,
    cameras: raw.cameras ?? { total: num(raw.cameras_total), live: num(raw.cameras_live) },
    poc: {
      name: raw.poc?.name ?? raw.poc_name ?? '',
      phone: raw.poc?.phone ?? raw.poc_phone ?? '',
      email: raw.poc?.email ?? raw.poc_email ?? '',
      status: pick(raw.poc?.status ?? raw.poc_status, POC, 'unknown'),
      notes: raw.poc?.notes ?? (raw.poc_notes ? [{ time: '', author: '', text: raw.poc_notes }] : []),
    },
    siteLead: raw.siteLead ?? raw.site_lead ?? '',
    kitHolder: raw.kitHolder ?? raw.kit_holder ?? '',
    kitStatus: raw.kitStatus ?? raw.kit ?? '',
    planned: raw.planned === true || /planned/i.test(String(raw.date ?? '')),
    source,
    syncedAt: raw.syncedAt ?? raw.scrapedAt ?? null,
    sourceUrl: raw.sourceUrl ?? null,
  };
  return derive(site);
}

export function localIsoDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * The tracker's Current / Future / Past tabs (our reading of them):
 * Current = status "active", or an open session dated today. Future = open and dated after today. Past = the rest.
 */
export function timeTab(site, today = localIsoDate()) {
  const open = !CLOSED_STATUS.test(site.status);
  if (site.status === 'active' || (open && (!site.date || site.date === today))) return 'current';
  if (open && site.date > today) return 'future';
  return 'past';
}

let _n = 0;
function cryptoId() {
  _n += 1;
  return `SITE-${Date.now().toString(36)}-${_n}`;
}

/** Longest non-decreasing subsequence → items not in it are "out of sequence". */
function outOfSequence(checkpoints) {
  const pts = checkpoints
    .map((c, i) => ({ i, t: c.done ? toMinutes(c.time) : null }))
    .filter((p) => p.t != null);
  if (pts.length < 3) return new Set();
  const len = pts.map(() => 1);
  const prev = pts.map(() => -1);
  for (let a = 0; a < pts.length; a++) {
    for (let b = 0; b < a; b++) {
      if (pts[b].t <= pts[a].t && len[b] + 1 > len[a]) {
        len[a] = len[b] + 1;
        prev[a] = b;
      }
    }
  }
  let end = len.indexOf(Math.max(...len));
  const keep = new Set();
  while (end !== -1) {
    keep.add(pts[end].i);
    end = prev[end];
  }
  return new Set(pts.filter((p) => !keep.has(p.i)).map((p) => p.i));
}

/** Adds computed fields: delay level, drift, geofence, flags. Pure function. */
export function derive(site) {
  const t = site.timestamps;
  const lateBy = diffMinutes(t.actualArrival, t.expectedArrival);
  const drift = diffMinutes(t.checkpointClick, t.actualArrival);
  const driftFlag = drift != null && Math.abs(drift) > CONFIG.TIMESTAMP_DRIFT_TOLERANCE_MIN;

  const intervals = site.intervals.map((iv) => {
    const over = iv.targetMin ? Math.max(0, (iv.actualMin ?? 0) - iv.targetMin) : Math.max(0, iv.actualMin ?? 0);
    return { ...iv, overMin: over };
  });
  const worstOver = intervals.reduce((m, iv) => Math.max(m, iv.overMin), 0);

  // "On track" needs evidence: at least one interval vs. target, or arrival vs. plan. Otherwise "unknown".
  const hasTiming = intervals.length > 0 || lateBy != null;
  let delayLevel = hasTiming ? 'on-track' : 'unknown';
  if (worstOver > 0 || (lateBy ?? 0) >= CONFIG.LATE_ARRIVAL_MINOR_MIN) delayLevel = 'minor';
  if (worstOver >= CONFIG.INTERVAL_CRITICAL_OVER_MIN || (lateBy ?? 0) >= CONFIG.LATE_ARRIVAL_CRITICAL_MIN)
    delayLevel = 'critical';

  const cell = decodeGeohash(site.geohash);
  let geofence = { status: 'unknown', distanceM: null, cell };
  if (cell && site.checkin) {
    const distanceM = Math.round(haversineMeters(cell, site.checkin));
    const inside = isInside(site.checkin, cell.bounds) || distanceM <= CONFIG.GEOFENCE_RADIUS_M;
    geofence = { status: inside ? 'verified' : 'outside', distanceM, cell };
  } else if (cell) {
    geofence = { status: 'no-gps', distanceM: null, cell };
  }

  const oos = outOfSequence(site.checkpoints);
  const checkpoints = site.checkpoints.map((c, i) => ({ ...c, outOfSequence: oos.has(i) }));

  const photoDeficit = site.photos.uploaded == null ? 0 : Math.max(0, site.photos.required - site.photos.uploaded);
  const capturePct = site.capture?.pct ?? null;

  const flags = [];
  if (delayLevel === 'critical') flags.push({ level: 'critical', text: `Critical delay (${Math.max(worstOver, lateBy ?? 0)} min)` });
  if (photoDeficit > 0) flags.push({ level: photoDeficit > 5 ? 'critical' : 'warn', text: `${photoDeficit} site photos missing` });
  if (driftFlag) flags.push({ level: 'warn', text: `Checkpoint tapped ${Math.abs(drift)} min ${drift > 0 ? 'after' : 'before'} arrival` });
  if (oos.size) flags.push({ level: 'warn', text: `${oos.size} checkpoint(s) out of sequence` });
  if (site.logStatus === 'missing' || site.logStatus === 'pending')
    flags.push({ level: site.logStatus === 'missing' ? 'critical' : 'warn', text: `Internal log ${site.logStatus}` });
  if (site.menuStatus === 'outdated') flags.push({ level: 'warn', text: 'Menu configuration outdated' });
  if (site.poc.status === 'unresponsive' || site.poc.status === 'escalated')
    flags.push({ level: 'critical', text: `PoC ${site.poc.status}` });
  if (geofence.status === 'outside') flags.push({ level: 'critical', text: `Check-in ${geofence.distanceM} m outside geofence` });
  if (capturePct != null && capturePct < CONFIG.CAPTURE_PASS_PCT)
    flags.push({ level: 'critical', text: `Capture ${capturePct}% (< ${CONFIG.CAPTURE_PASS_PCT}%)` });
  const contradictory = intervals.some(
    // The tracker puts "No delay" in the cause's category ("No delay — text"); CSV/manual causes may only have text.
    (iv) => iv.overMin > 0 && iv.causes?.some((c) => /no delay/i.test(`${c.category ?? ''} ${c.text}`)),
  );
  if (contradictory) flags.push({ level: 'warn', text: '"No delay" cause logged on an over-target interval' });

  return {
    ...site,
    intervals,
    checkpoints,
    derived: { lateBy, drift, driftFlag, worstOver, delayLevel, geofence, photoDeficit, flags },
  };
}

const rawId = (r) => String(r.id ?? r.site_id ?? r.uid ?? '');

/**
 * Merge RAW record lists by id (later lists win field-by-field, empty values never
 * overwrite real ones), then normalize. Merging before normalizing matters: a list-page
 * scrape has no photo count, and its default of 0 must not wipe a detail-page count.
 */
export function mergeSites(...lists) {
  const map = new Map();
  let anon = 0;
  for (const list of lists) {
    for (const r of list ?? []) {
      const id = rawId(r) || `anon-${anon++}`;
      const prev = map.get(id);
      map.set(id, prev ? deepMerge(prev, r) : { ...r });
    }
  }
  return [...map.values()].map((r) => normalizeSite(r, r.source));
}

export function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if (typeof v === 'object' && !Array.isArray(v) && typeof a[k] === 'object' && a[k] && k !== 'derived') {
      out[k] = deepMerge(a[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
