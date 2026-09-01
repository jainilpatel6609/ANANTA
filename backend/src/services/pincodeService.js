const PINCODE_DATA = require('../utils/pincodeData');
const logger = require('../utils/logger');

// In-memory cache for dynamic lookups
const runtimeCache = new Map();

class PincodeService {
  /**
   * Validates if a string is a strictly formatted 6-digit Indian PIN code.
   * Format: Exactly 6 numeric digits, first digit between 1 and 9.
   * Rejects alphabets, symbols, whitespace, and non-6 digit inputs.
   */
  static isValidIndianPincode(pincode) {
    if (!pincode) return false;
    const str = String(pincode).trim();
    return /^[1-9][0-9]{5}$/.test(str);
  }

  /**
   * Geocode a 6-digit Indian PIN code to Latitude, Longitude, City, District, State.
   * Priority:
   * 1. High-speed embedded local dataset (0ms latency, offline)
   * 2. Runtime in-memory cache
   * 3. External fallback geocoding (OpenStreetMap Nominatim / Zippopotam)
   */
  static async lookup(pincode) {
    if (!this.isValidIndianPincode(pincode)) {
      return null;
    }

    const cleanPin = String(pincode).trim();

    // 1. Check embedded dataset
    if (PINCODE_DATA[cleanPin]) {
      const data = PINCODE_DATA[cleanPin];
      return {
        pincode: cleanPin,
        city: data.city,
        district: data.district,
        state: data.state,
        latitude: data.lat,
        longitude: data.lng,
        source: 'EMBEDDED_DATABASE'
      };
    }

    // 2. Check runtime memory cache
    if (runtimeCache.has(cleanPin)) {
      return runtimeCache.get(cleanPin);
    }

    // 3. Fallback: External geocoding via public API (with 3s timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Try OpenStreetMap Nominatim for postalcode in India
      const osmUrl = `https://nominatim.openstreetmap.org/search?postalcode=${cleanPin}&country=India&format=json&addressdetails=1&limit=1`;
      const response = await fetch(osmUrl, {
        headers: {
          'User-Agent': 'AnantaTradersPincodeResolver/1.0',
          'Accept-Language': 'en'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const results = await response.json();
        if (Array.isArray(results) && results.length > 0) {
          const item = results[0];
          const address = item.address || {};
          const city = address.city || address.town || address.village || address.county || address.state_district || 'India';
          const district = address.state_district || address.county || city;
          const state = address.state || 'India';
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);

          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            const resolved = {
              pincode: cleanPin,
              city,
              district,
              state,
              latitude: lat,
              longitude: lng,
              source: 'GEOCODING_API'
            };
            runtimeCache.set(cleanPin, resolved);
            return resolved;
          }
        }
      }
    } catch (err) {
      logger.warn(`External geocoding lookup timed out or failed for PIN ${cleanPin}: ${err.message}`);
    }

    // If external geocode failed, check prefix for state/district fallback coordinates
    const prefix2 = cleanPin.substring(0, 2);
    const prefixFallback = this.getPrefixFallback(cleanPin, prefix2);
    if (prefixFallback) {
      runtimeCache.set(cleanPin, prefixFallback);
      return prefixFallback;
    }

    return null;
  }

  /**
   * Regional prefix fallback if a remote query is unavailable
   */
  static getPrefixFallback(cleanPin, prefix2) {
    const REGIONAL_COORDS = {
      '38': { city: 'North Gujarat / Ahmedabad Region', district: 'Ahmedabad/Mehsana', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
      '39': { city: 'South Gujarat / Vadodara Region', district: 'Surat/Vadodara', state: 'Gujarat', lat: 21.7051, lng: 72.9959 },
      '36': { city: 'Saurashtra Region', district: 'Rajkot', state: 'Gujarat', lat: 22.3039, lng: 70.8022 },
      '37': { city: 'Kutch Region', district: 'Kutch', state: 'Gujarat', lat: 23.2420, lng: 69.6669 },
      '11': { city: 'Delhi NCR', district: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090 },
      '40': { city: 'Mumbai Region', district: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
      '41': { city: 'Pune Region', district: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
      '56': { city: 'Bengaluru Region', district: 'Bengaluru Urban', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
      '50': { city: 'Hyderabad Region', district: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
      '60': { city: 'Chennai Region', district: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
      '70': { city: 'Kolkata Region', district: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
      '30': { city: 'Jaipur / Rajasthan Region', district: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 }
    };

    if (REGIONAL_COORDS[prefix2]) {
      const reg = REGIONAL_COORDS[prefix2];
      return {
        pincode: cleanPin,
        city: reg.city,
        district: reg.district,
        state: reg.state,
        latitude: reg.lat,
        longitude: reg.lng,
        source: 'REGIONAL_PREFIX_FALLBACK'
      };
    }
    return null;
  }

  /**
   * Calculates the great-circle distance between two geographical points
   * using the standard Haversine formula on a spherical Earth (WGS84 radius = 6,371 km).
   *
   * @param {number} lat1 Latitude of point 1 in decimal degrees
   * @param {number} lon1 Longitude of point 1 in decimal degrees
   * @param {number} lat2 Latitude of point 2 in decimal degrees
   * @param {number} lon2 Longitude of point 2 in decimal degrees
   * @returns {number} Distance in kilometers rounded to 2 decimal places
   */
  static calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
    const lat1Num = Number(lat1);
    const lon1Num = Number(lon1);
    const lat2Num = Number(lat2);
    const lon2Num = Number(lon2);

    if (
      Number.isNaN(lat1Num) ||
      Number.isNaN(lon1Num) ||
      Number.isNaN(lat2Num) ||
      Number.isNaN(lon2Num)
    ) {
      return null;
    }

    const R = 6371.0; // Earth mean radius in km
    const dLat = ((lat2Num - lat1Num) * Math.PI) / 180;
    const dLon = ((lon2Num - lon1Num) * Math.PI) / 180;

    const rLat1 = (lat1Num * Math.PI) / 180;
    const rLat2 = (lat2Num * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100;
  }

  /**
   * Identifies the geographically nearest dealer for a given customer location.
   * Compares the customer's coordinates with all active dealers registered in the system.
   *
   * @param {Object} customerCoords { lat, lng } or { latitude, longitude }
   * @param {Array} activeDealers Array of User documents with role DEALER and isActive true
   * @returns {Promise<Object>} { nearestDealer, distanceKm, dealersEvaluated }
   */
  static async findNearestDealer(customerCoords, activeDealers = []) {
    const custLat = customerCoords.latitude !== undefined ? customerCoords.latitude : customerCoords.lat;
    const custLng = customerCoords.longitude !== undefined ? customerCoords.longitude : customerCoords.lng;

    if (custLat === undefined || custLng === undefined || activeDealers.length === 0) {
      return {
        nearestDealer: null,
        distanceKm: null,
        dealersEvaluated: []
      };
    }

    const evaluated = [];

    for (const dealer of activeDealers) {
      let dLat = dealer.latitude;
      let dLng = dealer.longitude;

      // If dealer has registered pincode but lat/lng not cached on document, resolve it dynamically
      if ((dLat === undefined || dLat === null || dLng === undefined || dLng === null) && dealer.pincode) {
        const geo = await this.lookup(dealer.pincode);
        if (geo) {
          dLat = geo.latitude;
          dLng = geo.longitude;
          // Asynchronously update dealer model in background for fast future lookups
          if (dealer.save && typeof dealer.save === 'function') {
            dealer.latitude = dLat;
            dealer.longitude = dLng;
            dealer.save().catch((err) => logger.warn(`Failed to cache dealer coords: ${err.message}`));
          }
        }
      }

      if (dLat !== undefined && dLat !== null && dLng !== undefined && dLng !== null) {
        const distance = this.calculateHaversineDistanceKm(custLat, custLng, dLat, dLng);
        if (distance !== null) {
          evaluated.push({
            dealer,
            distanceKm: distance,
            dealerPincode: dealer.pincode || '',
            dealerName: dealer.companyName || dealer.name,
            dealerCoords: { lat: dLat, lng: dLng }
          });
        }
      }
    }

    // Sort ascending by geographic distance
    evaluated.sort((a, b) => a.distanceKm - b.distanceKm);

    const nearest = evaluated.length > 0 ? evaluated[0] : null;

    return {
      nearestDealer: nearest ? nearest.dealer : null,
      distanceKm: nearest ? nearest.distanceKm : null,
      dealersEvaluated: evaluated
    };
  }

  /**
   * High-accuracy multi-tier forward geocoder for addresses, landmarks, roads, areas, and PIN codes.
   */
  static async geocode(queryText) {
    if (!queryText || !String(queryText).trim()) return [];
    const query = String(queryText).trim();

    // Check if query is directly a 6-digit PIN code
    if (/^[1-9][0-9]{5}$/.test(query)) {
      const pinResult = await this.lookup(query);
      if (pinResult) {
        return [
          {
            title: `${pinResult.city}, ${pinResult.district}`,
            subtitle: `${pinResult.state} - ${pinResult.pincode}`,
            latitude: pinResult.latitude,
            longitude: pinResult.longitude,
            pincode: pinResult.pincode,
            area: pinResult.district,
            city: pinResult.city,
            state: pinResult.state,
            formattedAddress: `${pinResult.city}, ${pinResult.district}, ${pinResult.state} - ${pinResult.pincode}`,
            source: 'PINCODE_DATABASE'
          }
        ];
      }
    }

    const suggestions = [];

    // Tier 1: Photon Geocoder (Fast, tuned for fuzzy search in India with Gujarat center bias)
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=23.0225&lon=72.5714&limit=6`;
      const pRes = await fetch(photonUrl, {
        headers: { 'User-Agent': 'AnantaTradersApp/1.0' },
        signal: AbortSignal.timeout(3500)
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        const features = pData?.features || [];
        for (const f of features) {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates || [];
          if (coords.length >= 2) {
            const lat = coords[1];
            const lon = coords[0];
            const title = props.name || props.street || props.city || 'Location';
            const subtitle = [props.street, props.city, props.county, props.state, props.postcode]
              .filter(Boolean)
              .join(', ');
            suggestions.push({
              title,
              subtitle: subtitle || 'India',
              latitude: lat,
              longitude: lon,
              pincode: props.postcode || '',
              area: props.district || props.county || '',
              city: props.city || props.county || '',
              state: props.state || 'Gujarat',
              formattedAddress: [title, subtitle].filter(Boolean).join(', '),
              source: 'PHOTON'
            });
          }
        }
      }
    } catch (e) {
      logger.warn(`Photon forward geocode error: ${e.message}`);
    }

    // Tier 2: If Photon had no results, fallback to Nominatim
    if (suggestions.length === 0) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&addressdetails=1&limit=5`;
        const nRes = await fetch(nomUrl, {
          headers: {
            'User-Agent': 'AnantaTradersApp/1.0 (contact@anantatraders.com)',
            'Accept-Language': 'en'
          },
          signal: AbortSignal.timeout(3500)
        });
        if (nRes.ok) {
          const nData = await nRes.json();
          if (Array.isArray(nData)) {
            for (const item of nData) {
              const addr = item.address || {};
              const lat = parseFloat(item.lat);
              const lon = parseFloat(item.lon);
              if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
                suggestions.push({
                  title: item.display_name.split(',')[0],
                  subtitle: item.display_name,
                  latitude: lat,
                  longitude: lon,
                  pincode: addr.postcode || '',
                  area: addr.neighbourhood || addr.suburb || addr.village || addr.county || '',
                  city: addr.city || addr.town || addr.village || addr.state_district || '',
                  state: addr.state || 'Gujarat',
                  formattedAddress: item.display_name,
                  source: 'NOMINATIM'
                });
              }
            }
          }
        }
      } catch (e) {
        logger.warn(`Nominatim fallback error: ${e.message}`);
      }
    }

    return suggestions;
  }

  /**
   * Reverse Geocoder with multi-provider fallback and structured Gujarat addresses.
   */
  static async reverseGeocode(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    // 1. Nominatim Reverse (Detailed road/suburb/postcode)
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`;
      const res = await fetch(nomUrl, {
        headers: {
          'User-Agent': 'AnantaTradersApp/1.0 (contact@anantatraders.com)',
          'Accept-Language': 'en'
        },
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const road = addr.road || addr.street || '';
          const building = addr.building || addr.house_number || '';
          const addressLine1 = [building, road].filter(Boolean).join(', ') || addr.suburb || '';
          const area = addr.suburb || addr.neighbourhood || addr.village || addr.county || addr.commercial || '';
          const city = addr.city || addr.town || addr.village || addr.state_district || addr.county || '';
          const district = addr.state_district || addr.county || city;
          const state = addr.state || 'Gujarat';
          const pincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';
          const landmark = addr.amenity || addr.shop || addr.tourism || addr.historic || '';

          return {
            addressLine1,
            area,
            city,
            district,
            state,
            pincode,
            landmark,
            formattedAddress: data.display_name || '',
            latitude: lat,
            longitude: lng,
            source: 'NOMINATIM'
          };
        }
      }
    } catch (e) {
      logger.warn(`Nominatim reverse geocode error: ${e.message}`);
    }

    // 2. BigDataCloud Fallback
    try {
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
      const res = await fetch(bdcUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const d = await res.json();
        const city = d.city || d.locality || '';
        const state = d.principalSubdivision || 'Gujarat';
        const pincode = d.postcode ? d.postcode.replace(/\D/g, '').slice(0, 6) : '';
        return {
          addressLine1: d.locality || '',
          area: d.locality || '',
          city,
          district: city,
          state,
          pincode,
          landmark: '',
          formattedAddress: [d.locality, city, state, pincode].filter(Boolean).join(', '),
          latitude: lat,
          longitude: lng,
          source: 'BIGDATACLOUD'
        };
      }
    } catch (e) {
      logger.warn(`BigDataCloud reverse geocode error: ${e.message}`);
    }

    return null;
  }
}

module.exports = PincodeService;

