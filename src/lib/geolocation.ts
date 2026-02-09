// Shri Hanumant Library coordinates (from Google Maps embed on homepage)
const LIBRARY_LAT = 27.291;
const LIBRARY_LNG = 81.115;
const ALLOWED_RADIUS_METERS = 150; // 150m radius

/**
 * Calculate distance between two lat/lng points using Haversine formula.
 * Returns distance in meters.
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface LocationCheckResult {
  allowed: boolean;
  distance?: number; // meters from library
  error?: string;
}

/**
 * Get user's current position and check if they're within the allowed radius of the library.
 */
export function verifyLibraryLocation(): Promise<LocationCheckResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ allowed: false, error: 'Geolocation is not supported by your browser.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distance = haversineDistance(latitude, longitude, LIBRARY_LAT, LIBRARY_LNG);
        const allowed = distance <= ALLOWED_RADIUS_METERS;

        resolve({ allowed, distance: Math.round(distance) });
      },
      (err) => {
        let error = 'Unable to get your location.';
        if (err.code === err.PERMISSION_DENIED) {
          error = 'Location permission denied. Please enable location access in your browser settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          error = 'Location information is unavailable.';
        } else if (err.code === err.TIMEOUT) {
          error = 'Location request timed out. Please try again.';
        }
        resolve({ allowed: false, error });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}
