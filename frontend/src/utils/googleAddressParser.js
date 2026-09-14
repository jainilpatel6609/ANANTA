/**
 * ANANTA TRADERS - Strict Google Maps Address Component Parser
 * 
 * Rules:
 * 1. CITY:
 *    - Priority 1: 'locality' (e.g. Ahmedabad, Mehsana, Patan, Surat, Vadodara)
 *    - Priority 2: 'administrative_area_level_3' (Taluka / Tehsil / Sub-district)
 *    - Priority 3: 'administrative_area_level_2' (District)
 *    - NEVER use as City: 'sublocality', 'sublocality_level_1', 'sublocality_level_2', 'neighborhood', 'route'.
 *      For example: Gota must NOT become City. Gota -> Area, Ahmedabad -> City.
 * 
 * 2. AREA / HIGHWAY:
 *    - Checks: 'sublocality_level_1', 'sublocality', 'route', 'neighborhood', 'sublocality_level_2'.
 *    - Intelligently combines without duplicating the same string.
 *    - E.g.: "Gota", "SG Highway", "Chandkheda", "Modhera Road".
 * 
 * 3. STATE:
 *    - 'administrative_area_level_1' (e.g. "Gujarat").
 * 
 * 4. PINCODE:
 *    - 'postal_code' (e.g. "380060", "382481", "384002").
 * 
 * 5. ADDRESS LINE 1:
 *    - 'premise', 'subpremise', 'street_number' + 'route', 'establishment', 'point_of_interest' or primary name.
 */

export function getAddressComponent(components, type, useShort = false) {
  if (!Array.isArray(components)) return '';
  const match = components.find((c) => Array.isArray(c.types) && c.types.includes(type));
  return match ? (useShort ? match.short_name : match.long_name).trim() : '';
}

export function parseGoogleAddressComponents(
  components = [],
  formattedAddress = '',
  lat = null,
  lng = null,
  placeId = '',
  placeName = ''
) {
  if (!Array.isArray(components)) components = [];

  // Extract raw Google types
  const premise = getAddressComponent(components, 'premise');
  const subpremise = getAddressComponent(components, 'subpremise');
  const streetNumber = getAddressComponent(components, 'street_number');
  const route = getAddressComponent(components, 'route');
  const neighborhood = getAddressComponent(components, 'neighborhood');
  const sublocalityLevel2 = getAddressComponent(components, 'sublocality_level_2');
  const sublocalityLevel1 = getAddressComponent(components, 'sublocality_level_1');
  const sublocality = getAddressComponent(components, 'sublocality');
  const locality = getAddressComponent(components, 'locality');
  const adminLevel3 = getAddressComponent(components, 'administrative_area_level_3');
  const adminLevel2 = getAddressComponent(components, 'administrative_area_level_2');
  const adminLevel1 = getAddressComponent(components, 'administrative_area_level_1');
  const country = getAddressComponent(components, 'country');
  const postalCode = getAddressComponent(components, 'postal_code');

  // 1. STRICT CITY RESOLUTION (Never sublocality or route!)
  let rawCity = locality || adminLevel3 || adminLevel2 || '';
  if (rawCity.toLowerCase().endsWith(' taluka')) {
    rawCity = rawCity.replace(/ taluka$/i, '').trim();
  }
  const city = rawCity || 'Gujarat';

  // 2. AREA / HIGHWAY RESOLUTION
  const areaParts = [];
  if (sublocalityLevel1 && sublocalityLevel1.toLowerCase() !== city.toLowerCase()) {
    areaParts.push(sublocalityLevel1);
  } else if (sublocality && sublocality.toLowerCase() !== city.toLowerCase()) {
    areaParts.push(sublocality);
  }

  if (route && !areaParts.some((p) => p.toLowerCase() === route.toLowerCase()) && route.toLowerCase() !== city.toLowerCase()) {
    areaParts.push(route);
  }

  if (areaParts.length === 0 && neighborhood && neighborhood.toLowerCase() !== city.toLowerCase()) {
    areaParts.push(neighborhood);
  } else if (areaParts.length === 0 && sublocalityLevel2 && sublocalityLevel2.toLowerCase() !== city.toLowerCase()) {
    areaParts.push(sublocalityLevel2);
  }

  const area = areaParts.join(', ') || sublocalityLevel1 || sublocality || route || neighborhood || '';

  // 3. ADDRESS LINE 1 (Building / Premise / House / Street)
  let addressLine1 = '';
  const buildingParts = [];
  if (premise) buildingParts.push(premise);
  if (subpremise) buildingParts.push(subpremise);
  if (streetNumber) buildingParts.push(streetNumber);

  if (buildingParts.length > 0) {
    addressLine1 = buildingParts.join(', ');
    if (route && !addressLine1.toLowerCase().includes(route.toLowerCase())) {
      addressLine1 = `${addressLine1}, ${route}`;
    }
  } else if (formattedAddress) {
    const firstSegment = formattedAddress.split(',')[0].trim();
    if (
      firstSegment &&
      firstSegment.toLowerCase() !== city.toLowerCase() &&
      firstSegment.toLowerCase() !== area.toLowerCase()
    ) {
      addressLine1 = firstSegment;
    } else if (area) {
      addressLine1 = area;
    } else {
      addressLine1 = `${city} Site`;
    }
  } else if (area) {
    addressLine1 = area;
  } else {
    addressLine1 = `${city} Site`;
  }

  // 4. STATE
  const state = adminLevel1 || 'Gujarat';

  // 5. PINCODE
  const pincode = (postalCode || '').replace(/\D/g, '').slice(0, 6);

  // Parse numeric coordinates
  const latitude = lat !== null && lat !== undefined ? Number(lat) : null;
  const longitude = lng !== null && lng !== undefined ? Number(lng) : null;

  // Resolved human-readable Place Name
  const resolvedPlaceName = (
    placeName ||
    premise ||
    (formattedAddress ? formattedAddress.split(',')[0].trim() : '') ||
    addressLine1 ||
    ''
  ).trim();

  return {
    addressLine1,
    area,
    city,
    state,
    pincode,
    country: country || 'India',
    formattedAddress: formattedAddress || [addressLine1, area, city, state, pincode].filter(Boolean).join(', '),
    latitude,
    longitude,
    placeId: placeId || '',
    placeName: resolvedPlaceName
  };
}

