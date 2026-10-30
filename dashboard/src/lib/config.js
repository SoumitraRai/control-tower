// Central, editable business rules for the Control Tower.
// Change these numbers instead of hunting through components.

export const CONFIG = {
  /** Photos required for a compliant site audit. (The current tracker uses 30 — set to match your SOP.) */
  PHOTO_TARGET: 20,

  /** Checkpoint tap vs. actual arrival: flag when they differ by more than this many minutes. */
  TIMESTAMP_DRIFT_TOLERANCE_MIN: 10,

  /** Arrival later than the planned time by this many minutes counts as a delay. */
  LATE_ARRIVAL_MINOR_MIN: 15,
  LATE_ARRIVAL_CRITICAL_MIN: 45,

  /** Any interval over its target by at least this many minutes is a critical delay. */
  INTERVAL_CRITICAL_OVER_MIN: 30,

  /** Capture percentage needed to pass. */
  CAPTURE_PASS_PCT: 80,

  /** Max distance (m) between check-in GPS and the site geohash centre. */
  GEOFENCE_RADIUS_M: 250,

  /** Geohash characters used as the "zone code" (4 ≈ 39 km × 20 km, 5 ≈ 4.9 km cells). */
  ZONE_PRECISION: 5,

  /** Origins the dashboard accepts bridge messages from (window.postMessage). */
  BRIDGE_SOURCE: 'ct-extension',
  DASHBOARD_SOURCE: 'ct-dashboard',
  BRIDGE_PING_INTERVAL_MS: 4000,
  BRIDGE_TIMEOUT_MS: 9000,
};

/** The tracker's session statuses, in its own order (the Status filter on its list page). */
export const TRACKER_STATUSES = [
  'planned', 'active', 'transferring in progress', 'transferred', 'approved', 'dispatched', 'completed', 'cancelled',
];

/** City → operating region. Unknown cities fall back to "Unassigned". */
export const CITY_REGION = {
  bangalore: 'South',
  bengaluru: 'South',
  gokarna: 'South',
  delhi: 'North',
  ncr: 'North',
  gurugram: 'North',
  sonipat: 'North',
  panipat: 'North',
  rohtak: 'North',
  jaipur: 'West',
  ahmedabad: 'West',
  mumbai: 'West',
  pune: 'West',
  kolkata: 'East',
  patna: 'East',
  bihar: 'East',
  samastipur: 'East',
  ichalkaranji: 'West',
  kolhapur: 'West',
  hyderabad: 'South',
  chennai: 'South',
  lucknow: 'North',
  banglore: 'South', // spelling used by the tracker's location filter
  ballari: 'South',
  faridabad: 'North',
  chandigarh: 'North',
  himachal: 'North',
  vrindavan: 'North',
  'yamuna nagar': 'North',
  meerut: 'North',
  amreli: 'West',
  gandhinagar: 'West',
  jodhpur: 'West',
  kishangarh: 'West',
  kotputli: 'West',
  kushkhera: 'West',
  nagpur: 'West',
  darbhanga: 'East',
  vaishali: 'East',
};
