// Shared helpers for the Safe Convoy feature — plate validation, distance/ETA
// math, and relative-time formatting.

// Nigerian plate formats seen in the wild: "ABJ 234 EF", "KJA 234 AK",
// "KN 100 XY" — 2-3 letters, 1-4 digits, 2 letters, with optional space/dash.
const PLATE_REGEX = /^[A-Z]{2,3}[\s-]?\d{1,4}[\s-]?[A-Z]{2}$/i;

export function validateNigerianPlate(plate) {
  if (!plate) return false;
  return PLATE_REGEX.test(plate.trim());
}

// Great-circle distance between two points, in km.
export function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v == null)) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// "10s ago", "2 min ago", "3 hr ago", "2 days ago" — or "—" if unknown.
export function formatRelativeTime(timestamp) {
  if (!timestamp) return "—";
  const diffMs = Date.now() - new Date(timestamp).getTime();
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 10) return "Live";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// % of route completed, based on average distance traveled from the convoy's
// start point vs. the (optional) total route distance. Returns null when
// route_distance_km wasn't set, so the UI can hide the progress bar.
export function computeProgressPct(convoy, members) {
  if (!convoy?.route_distance_km || convoy.start_lat == null || convoy.start_lng == null) return null;
  const withFix = (members || []).filter(m => m.lat != null && m.lng != null);
  if (withFix.length === 0) return 0;
  const traveled = withFix.reduce((sum, m) => sum + (haversineKm(convoy.start_lat, convoy.start_lng, m.lat, m.lng) || 0), 0) / withFix.length;
  return Math.max(0, Math.min(100, (traveled / convoy.route_distance_km) * 100));
}

// Estimated time remaining for a member, given the convoy's remaining
// distance and the member's current speed. Returns null when it can't be
// computed (no route distance, or member effectively stationary).
export function computeETA(convoy, progressPct, speedKmh) {
  if (!convoy?.route_distance_km || progressPct == null || !speedKmh || speedKmh < 1) return null;
  const remainingKm = convoy.route_distance_km * (1 - progressPct / 100);
  if (remainingKm <= 0) return "Arrived";
  const minutes = (remainingKm / speedKmh) * 60;
  if (minutes < 60) return `~${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `~${hours}h ${mins}m`;
}

// A member's last GPS sample is considered stale (signal lost) after 30s.
export function isGpsLost(lastUpdated) {
  if (!lastUpdated) return true;
  return Date.now() - new Date(lastUpdated).getTime() > 30000;
}
