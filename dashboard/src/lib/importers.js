// CSV / JSON import for the manual fallback path.

/** RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF). */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

// Accept common header spellings from different exports.
const HEADER_ALIASES = {
  site_id: ['site_id', 'id', 'uid', 'site id', 'session'],
  site_name: ['site_name', 'name', 'site', 'business', 'site name'],
  city: ['city', 'location'],
  date: ['date'],
  status: ['status'],
  geohash: ['geohash', 'geo_hash', 'geo hash'],
  zone: ['zone', 'region'],
  menu_status: ['menu_status', 'menu', 'menu status', 'menu configuration'],
  photos_uploaded: ['photos_uploaded', 'photos', 'photo_count', 'site photos'],
  photos_required: ['photos_required', 'photo_target'],
  expected_arrival: ['expected_arrival', 'planned_arrival', 'expected'],
  actual_arrival: ['actual_arrival', 'reached_site', 'reached site', 'arrival'],
  checkpoint_click: ['checkpoint_click', 'checkpoint_time', 'checkpoint tap'],
  entry_scan: ['entry_scan', 'first_camera_live', 'entry'],
  exit_scan: ['exit_scan', 'left_site', 'left site', 'exit'],
  log_status: ['log_status', 'internal_log', 'log'],
  delay_minutes: ['delay_minutes', 'delay', 'delay_min'],
  delay_reason: ['delay_reason', 'cause'],
  poc_name: ['poc_name', 'poc'],
  poc_phone: ['poc_phone', 'poc phone', 'phone'],
  poc_email: ['poc_email'],
  poc_status: ['poc_status', 'poc status'],
  poc_notes: ['poc_notes', 'notes', 'escalation'],
  site_lead: ['site_lead', 'site lead'],
  kit_holder: ['kit_holder', 'kit holder'],
  kit: ['kit', 'kit_status'],
  cameras_total: ['cameras_total', 'deployments', 'cameras'],
};

function canonicalHeader(h) {
  const k = h.trim().toLowerCase();
  for (const [canon, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(k)) return canon;
  }
  return k.replace(/\s+/g, '_');
}

export function csvToRecords(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error('CSV needs a header row and at least one data row.');
  const headers = rows[0].map(canonicalHeader);
  if (!headers.includes('site_id') && !headers.includes('site_name'))
    throw new Error('CSV must include a site_id or site_name column.');
  return rows.slice(1).map((r) => {
    const o = { source: 'csv' };
    headers.forEach((h, i) => {
      o[h] = (r[i] ?? '').trim();
    });
    return o;
  });
}

export function jsonToRecords(text) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data.records ?? data.sites ?? [];
  if (!Array.isArray(list) || list.length === 0) throw new Error('JSON must be an array of sites or { "records": [...] }.');
  return list.map((r) => ({ source: 'json', ...r }));
}

export async function readImportFile(file) {
  const text = await file.text();
  if (/\.json$/i.test(file.name) || text.trim().startsWith('[') || text.trim().startsWith('{')) {
    return jsonToRecords(text);
  }
  return csvToRecords(text);
}

export const CSV_TEMPLATE = [
  'site_id,site_name,city,geohash,menu_status,photos_uploaded,photos_required,expected_arrival,actual_arrival,checkpoint_click,entry_scan,exit_scan,log_status,delay_minutes,delay_reason,poc_name,poc_phone,poc_status,poc_notes',
].join('\n');

export function downloadText(filename, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
