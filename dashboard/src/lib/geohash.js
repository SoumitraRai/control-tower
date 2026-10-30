// Minimal geohash encode/decode — no dependency needed.
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(lat, lng, precision = 6) {
  let latR = [-90, 90];
  let lngR = [-180, 180];
  let hash = '';
  let bit = 0;
  let ch = 0;
  let even = true;
  while (hash.length < precision) {
    const r = even ? lngR : latR;
    const v = even ? lng : lat;
    const mid = (r[0] + r[1]) / 2;
    if (v >= mid) {
      ch = (ch << 1) | 1;
      r[0] = mid;
    } else {
      ch <<= 1;
      r[1] = mid;
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

/** Returns { lat, lng, bounds: {minLat,maxLat,minLng,maxLng}, widthM, heightM } or null. */
export function decodeGeohash(hash) {
  if (!hash || typeof hash !== 'string') return null;
  const h = hash.trim().toLowerCase();
  if (!/^[0-9bcdefghjkmnpqrstuvwxyz]+$/.test(h)) return null;
  let latR = [-90, 90];
  let lngR = [-180, 180];
  let even = true;
  for (const c of h) {
    const idx = BASE32.indexOf(c);
    for (let b = 4; b >= 0; b--) {
      const bitOn = (idx >> b) & 1;
      const r = even ? lngR : latR;
      const mid = (r[0] + r[1]) / 2;
      if (bitOn) r[0] = mid;
      else r[1] = mid;
      even = !even;
    }
  }
  const lat = (latR[0] + latR[1]) / 2;
  const lng = (lngR[0] + lngR[1]) / 2;
  const heightM = (latR[1] - latR[0]) * 111_320;
  const widthM = (lngR[1] - lngR[0]) * 111_320 * Math.cos((lat * Math.PI) / 180);
  return {
    lat,
    lng,
    bounds: { minLat: latR[0], maxLat: latR[1], minLng: lngR[0], maxLng: lngR[1] },
    widthM,
    heightM,
  };
}

export function haversineMeters(a, b) {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function isInside(point, bounds) {
  return (
    point.lat >= bounds.minLat &&
    point.lat <= bounds.maxLat &&
    point.lng >= bounds.minLng &&
    point.lng <= bounds.maxLng
  );
}
