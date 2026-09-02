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
   * Identifies the geographically nearest dealer for a given customer location within radius (default: 5.0 KM).
   * Compares the customer's coordinates with all active dealers registered in the system.
   *
   * @param {Object} customerCoords { lat, lng } or { latitude, longitude }
   * @param {Array} activeDealers Array of User documents with role DEALER and isActive true
   * @param {number} maxRadiusKm Maximum radius in kilometers (default: 5.0 km)
   * @returns {Promise<Object>} { nearestDealer, distanceKm, isWithinRadius, dealersWithinRadius, dealersEvaluated }
   */
  static async findNearestDealer(customerCoords, activeDealers = [], maxRadiusKm = 5.0) {
    const custLat = customerCoords.latitude !== undefined ? customerCoords.latitude : customerCoords.lat;
    const custLng = customerCoords.longitude !== undefined ? customerCoords.longitude : customerCoords.lng;

    if (custLat === undefined || custLng === undefined || activeDealers.length === 0) {
      return {
        nearestDealer: null,
        distanceKm: null,
        isWithinRadius: false,
        dealersWithinRadius: [],
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
            isWithinRadius: distance <= maxRadiusKm,
            dealerPincode: dealer.pincode || '',
            dealerName: dealer.companyName || dealer.name,
            dealerCoords: { lat: dLat, lng: dLng }
          });
        }
      }
    }

    // Sort ascending by geographic distance
    evaluated.sort((a, b) => a.distanceKm - b.distanceKm);

    const dealersWithinRadius = evaluated.filter((e) => e.distanceKm <= maxRadiusKm);
    const nearestWithinRadius = dealersWithinRadius.length > 0 ? dealersWithinRadius[0] : null;
    const nearestOverall = evaluated.length > 0 ? evaluated[0] : null;

    // Pick nearest within 5km if available, else closest overall
    const chosen = nearestWithinRadius || nearestOverall;

    return {
      nearestDealer: chosen ? chosen.dealer : null,
      distanceKm: chosen ? chosen.distanceKm : null,
      isWithinRadius: Boolean(nearestWithinRadius),
      dealersWithinRadius: dealersWithinRadius.map((d) => d.dealer),
      dealersEvaluated: evaluated
    };
  }

  /**
   * Universal component extractor for OSM, Photon, and Nominatim responses.
   * Maps house/building -> addressLine1, road/highway/suburb -> area, city/town/village -> city.
   */
  static parseAddressComponents(addr = {}, displayName = '', fallbackTitle = '', lat = 0, lon = 0) {
    const road = (addr.road || addr.street || addr.highway || addr.residential || addr.path || '').trim();
    const building = (
      addr.building ||
      addr.house_name ||
      addr.house_number ||
      addr.amenity ||
      addr.shop ||
      addr.commercial ||
      addr.industrial ||
      addr.office ||
      ''
    ).trim();
    const locality = (
      addr.suburb ||
      addr.neighbourhood ||
      addr.quarter ||
      addr.subdivision ||
      addr.locality ||
      addr.residential ||
      ''
    ).trim();
    const village = (addr.village || addr.hamlet || '').trim();
    const town = (addr.town || '').trim();
    const rawCity = (addr.city || addr.municipality || '').trim();
    const county = (addr.county || '').trim();
    const stateDistrict = (addr.state_district || '').trim();
    const state = (addr.state || addr.province || 'Gujarat').trim();

    // 1. PIN Code extraction
    let pincode = '';
    if (addr.postcode) {
      const m = String(addr.postcode).match(/\b([1-9][0-9]{5})\b/);
      if (m) pincode = m[1];
    }
    if (!pincode && displayName) {
      const m = String(displayName).match(/\b([1-9][0-9]{5})\b/);
      if (m) pincode = m[1];
    }

    // 2. City extraction (Clean up "Taluka" suffix)
    let city = rawCity || town || (village && stateDistrict && village !== stateDistrict ? stateDistrict : village) || stateDistrict || county || 'Gujarat';
    if (city.toLowerCase().endsWith(' taluka')) {
      city = city.replace(/ taluka$/i, '').trim();
    }

    // 3. Area / Highway extraction (Avoid duplicating City)
    let area = '';
    if (road && road.toLowerCase() !== city.toLowerCase()) {
      area = road;
    } else if (locality && locality.toLowerCase() !== city.toLowerCase()) {
      area = locality;
    } else if (village && village.toLowerCase() !== city.toLowerCase()) {
      area = village;
    } else if (county && county.toLowerCase() !== city.toLowerCase()) {
      area = county;
    } else {
      area = locality || road || '';
    }

    // 4. Address Line 1 / Site / Building extraction
    const primaryName = (fallbackTitle || (displayName ? displayName.split(',')[0].trim() : '')).trim();
    let addressLine1 = '';
    if (building && road && building.toLowerCase() !== road.toLowerCase()) {
      addressLine1 = `${building}, ${road}`;
    } else if (building) {
      addressLine1 = building;
    } else if (primaryName && primaryName.toLowerCase() !== city.toLowerCase() && primaryName.toLowerCase() !== area.toLowerCase()) {
      addressLine1 = primaryName;
    } else if (locality && locality.toLowerCase() !== city.toLowerCase()) {
      addressLine1 = locality;
    } else if (road) {
      addressLine1 = road;
    } else {
      addressLine1 = primaryName || `${city} Site`;
    }

    return {
      addressLine1,
      area,
      city,
      district: stateDistrict || county || city,
      state,
      pincode,
      landmark: addr.amenity || addr.shop || addr.tourism || addr.historic || addr.leisure || '',
      formattedAddress: displayName || [addressLine1, area, city, state, pincode].filter(Boolean).join(', '),
      latitude: parseFloat(lat),
      longitude: parseFloat(lon)
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
            addressLine1: pinResult.city,
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
    const seenTitles = new Set();

    // Tier 0: Official Google Geocoding API (If GOOGLE_MAPS_API_KEY configured)
    if (process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${process.env.GOOGLE_MAPS_API_KEY}&components=country:IN`;
        const gRes = await fetch(gUrl, { signal: AbortSignal.timeout(4000) });
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.status === 'OK' && Array.isArray(gData.results)) {
            for (const item of gData.results) {
              const lat = item.geometry?.location?.lat;
              const lon = item.geometry?.location?.lng;
              if (lat !== undefined && lon !== undefined) {
                // Convert Google address_components format
                const addrMap = {};
                if (Array.isArray(item.address_components)) {
                  for (const c of item.address_components) {
                    if (c.types.includes('premise')) addrMap.building = c.long_name;
                    if (c.types.includes('route')) addrMap.road = c.long_name;
                    if (c.types.includes('sublocality_level_1') || c.types.includes('sublocality')) addrMap.suburb = c.long_name;
                    if (c.types.includes('locality')) addrMap.city = c.long_name;
                    if (c.types.includes('administrative_area_level_3')) addrMap.county = c.long_name;
                    if (c.types.includes('administrative_area_level_2')) addrMap.state_district = c.long_name;
                    if (c.types.includes('administrative_area_level_1')) addrMap.state = c.long_name;
                    if (c.types.includes('postal_code')) addrMap.postcode = c.long_name;
                  }
                }

                const title = item.formatted_address.split(',')[0];
                const parsed = this.parseAddressComponents(addrMap, item.formatted_address, title, lat, lon);
                const key = `${title}-${parsed.city}-${parsed.pincode}`.toLowerCase();

                if (!seenTitles.has(key)) {
                  seenTitles.add(key);
                  suggestions.push({
                    ...parsed,
                    title,
                    subtitle: item.formatted_address,
                    source: 'GOOGLE_MAPS'
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        logger.warn(`Google geocoding error: ${err.message}`);
      }
    }

    // Tier 1: Photon Geocoder (Fast, tuned for fuzzy search in India with Gujarat center bias)
    if (suggestions.length === 0) {
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=23.0225&lon=72.5714&limit=8`;
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
              const lon = coords[0];
              const lat = coords[1];
              const title = props.name || props.street || props.city || 'Location';
              const subtitle = [props.street, props.city, props.county, props.state, props.postcode]
                .filter(Boolean)
                .join(', ');

              const parsed = this.parseAddressComponents(
                {
                  building: props.name !== props.street ? props.name : '',
                  road: props.street,
                  suburb: props.district,
                  city: props.city,
                  county: props.county,
                  state: props.state,
                  postcode: props.postcode
                },
                [title, subtitle].filter(Boolean).join(', '),
                title,
                lat,
                lon
              );

              const key = `${title}-${parsed.city}-${parsed.pincode}`.toLowerCase();
              if (!seenTitles.has(key)) {
                seenTitles.add(key);
                suggestions.push({
                  ...parsed,
                  title,
                  subtitle: subtitle || 'India',
                  source: 'PHOTON'
                });
              }
            }
          }
        }
      } catch (e) {
        logger.warn(`Photon forward geocode error: ${e.message}`);
      }
    }

    // Tier 2: Nominatim Geocoder with India restriction
    if (suggestions.length === 0) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&addressdetails=1&limit=8`;
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
                const title = item.display_name.split(',')[0];
                const parsed = this.parseAddressComponents(addr, item.display_name, title, lat, lon);
                const key = `${title}-${parsed.city}-${parsed.pincode}`.toLowerCase();

                if (!seenTitles.has(key)) {
                  seenTitles.add(key);
                  suggestions.push({
                    ...parsed,
                    title,
                    subtitle: item.display_name,
                    source: 'NOMINATIM'
                  });
                }
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
   * Finds nearest Indian PIN code from embedded dataset based on coordinates
   */
  static findNearestPincode(lat, lng) {
    let nearestPin = '';
    let minDistance = Infinity;
    for (const [pin, data] of Object.entries(PINCODE_DATA)) {
      const dLat = ((data.lat - lat) * Math.PI) / 180;
      const dLng = ((data.lng - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((data.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distKm = 6371 * c;
      if (distKm < minDistance) {
        minDistance = distKm;
        nearestPin = pin;
      }
    }
    if (nearestPin && minDistance <= 35) {
      return { pin: nearestPin, data: PINCODE_DATA[nearestPin], distanceKm: minDistance };
    }
    return null;
  }

  /**
   * Reverse Geocoder with multi-provider fallback and structured Gujarat addresses.
   */
  static async reverseGeocode(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    let resolvedData = null;

    // Tier 0: Official Google Geocoding API (If GOOGLE_MAPS_API_KEY configured)
    if (process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}&language=en`;
        const gRes = await fetch(gUrl, { signal: AbortSignal.timeout(4000) });
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.status === 'OK' && Array.isArray(gData.results) && gData.results[0]) {
            const topResult = gData.results[0];
            const addrMap = {};
            if (Array.isArray(topResult.address_components)) {
              for (const c of topResult.address_components) {
                if (c.types.includes('premise')) addrMap.building = c.long_name;
                if (c.types.includes('route')) addrMap.road = c.long_name;
                if (c.types.includes('sublocality_level_1') || c.types.includes('sublocality')) addrMap.suburb = c.long_name;
                if (c.types.includes('locality')) addrMap.city = c.long_name;
                if (c.types.includes('administrative_area_level_3')) addrMap.county = c.long_name;
                if (c.types.includes('administrative_area_level_2')) addrMap.state_district = c.long_name;
                if (c.types.includes('administrative_area_level_1')) addrMap.state = c.long_name;
                if (c.types.includes('postal_code')) addrMap.postcode = c.long_name;
              }
            }

            const parsed = this.parseAddressComponents(addrMap, topResult.formatted_address, '', lat, lng);
            resolvedData = {
              ...parsed,
              source: 'GOOGLE_MAPS'
            };
          }
        }
      } catch (err) {
        logger.warn(`Google reverse geocode error: ${err.message}`);
      }
    }

    if (resolvedData) return resolvedData;

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
          const parsed = this.parseAddressComponents(data.address, data.display_name, '', lat, lng);

          if (!parsed.pincode || !/^[1-9][0-9]{5}$/.test(parsed.pincode)) {
            const nearest = this.findNearestPincode(lat, lng);
            if (nearest) parsed.pincode = nearest.pin;
          }

          resolvedData = {
            ...parsed,
            source: 'NOMINATIM'
          };
        }
      }
    } catch (e) {
      logger.warn(`Nominatim reverse geocode error: ${e.message}`);
    }

    if (resolvedData) return resolvedData;

    // 2. BigDataCloud Fallback
    try {
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
      const res = await fetch(bdcUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const d = await res.json();
        const city = d.city || d.locality || '';
        const state = d.principalSubdivision || 'Gujarat';
        let pincode = d.postcode ? d.postcode.replace(/\D/g, '').slice(0, 6) : '';

        if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) {
          const nearest = this.findNearestPincode(lat, lng);
          if (nearest) pincode = nearest.pin;
        }

        return {
          addressLine1: d.locality || city,
          area: d.locality !== city ? d.locality : '',
          city: city || 'Gujarat',
          district: city || 'Gujarat',
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

    // 3. Embedded Gujarat Offline Coordinates Matcher Fallback
    const nearest = this.findNearestPincode(lat, lng);
    if (nearest) {
      return {
        addressLine1: `${nearest.data.city} Region`,
        area: nearest.data.district !== nearest.data.city ? nearest.data.district : '',
        city: nearest.data.city,
        district: nearest.data.district,
        state: nearest.data.state,
        pincode: nearest.pin,
        landmark: '',
        formattedAddress: `${nearest.data.city}, ${nearest.data.district}, ${nearest.data.state} - ${nearest.pin}`,
        latitude: lat,
        longitude: lng,
        source: 'OFFLINE_DATASET'
      };
    }

    return null;
  }
}

module.exports = PincodeService;


