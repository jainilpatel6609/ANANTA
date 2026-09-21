const PincodeService = require('./pincodeService');
const logger = require('../utils/logger');

// In-memory cache so repeated lookups between the same two rounded coordinate
// pairs (very common — many customers booking from the same sourcing Location)
// don't re-hit an external routing API on every request.
const runtimeCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const roundCoord = (n) => Math.round(Number(n) * 10000) / 10000; // ~11m precision

/**
 * Resolves the real road-network driving distance (in KM) between two points,
 * for Material+Location transport pricing. Straight-line (Haversine) distance
 * is intentionally NOT used as the primary source — road distance is always
 * longer and more representative of actual transport cost.
 *
 * Cascade (each tier only runs if the previous one is unavailable or fails):
 *   1. Google Routes API (most accurate; requires GOOGLE_MAPS_API_KEY with the
 *      "Routes API" enabled in Google Cloud Console — silently skipped otherwise)
 *   2. OSRM public routing server (free, no API key, real road-network distance)
 *   3. Haversine straight-line distance x 1.3 road-detour correction factor,
 *      as an absolute last resort so pricing/checkout never breaks outright
 *      if both external services are unreachable.
 */
class RoadDistanceService {
  static async calculateRoadDistanceKm(lat1, lon1, lat2, lon2) {
    const originLat = Number(lat1);
    const originLng = Number(lon1);
    const destLat = Number(lat2);
    const destLng = Number(lon2);

    if ([originLat, originLng, destLat, destLng].some((n) => Number.isNaN(n))) {
      return null;
    }

    const cacheKey = `${roundCoord(originLat)},${roundCoord(originLng)}:${roundCoord(destLat)},${roundCoord(destLng)}`;
    const cached = runtimeCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return { distanceKm: cached.distanceKm, source: cached.source };
    }

    const google = await this.tryGoogleRoutesApi(originLat, originLng, destLat, destLng);
    if (google !== null) {
      runtimeCache.set(cacheKey, { distanceKm: google, source: 'google_routes', cachedAt: Date.now() });
      return { distanceKm: google, source: 'google_routes' };
    }

    const osrm = await this.tryOsrm(originLat, originLng, destLat, destLng);
    if (osrm !== null) {
      runtimeCache.set(cacheKey, { distanceKm: osrm, source: 'osrm', cachedAt: Date.now() });
      return { distanceKm: osrm, source: 'osrm' };
    }

    const straightLine = PincodeService.calculateHaversineDistanceKm(originLat, originLng, destLat, destLng);
    if (straightLine === null) return null;
    const approx = Math.round(straightLine * 1.3 * 100) / 100;
    logger.warn(`Road distance APIs unavailable; using Haversine x1.3 approximation for (${originLat},${originLng}) -> (${destLat},${destLng})`);
    runtimeCache.set(cacheKey, { distanceKm: approx, source: 'haversine_fallback', cachedAt: Date.now() });
    return { distanceKm: approx, source: 'haversine_fallback' };
  }

  static async tryGoogleRoutesApi(originLat, originLng, destLat, destLng) {
    if (!process.env.GOOGLE_MAPS_API_KEY) return null;
    try {
      const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.distanceMeters'
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
          destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_UNAWARE'
        }),
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) return null;
      const data = await res.json();
      const meters = data?.routes?.[0]?.distanceMeters;
      if (typeof meters !== 'number' || meters <= 0) return null;
      return Math.round((meters / 1000) * 100) / 100;
    } catch (err) {
      logger.warn(`Google Routes API road-distance lookup failed: ${err.message}`);
      return null;
    }
  }

  static async tryOsrm(originLat, originLng, destLat, destLng) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data = await res.json();
      const meters = data?.routes?.[0]?.distance;
      if (typeof meters !== 'number' || meters <= 0) return null;
      return Math.round((meters / 1000) * 100) / 100;
    } catch (err) {
      logger.warn(`OSRM road-distance lookup failed: ${err.message}`);
      return null;
    }
  }
}

module.exports = RoadDistanceService;
