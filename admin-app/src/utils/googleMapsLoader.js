/**
 * ANANTA TRADERS - Dynamic Google Maps API Loader
 * Safely loads Google Maps JavaScript API with Places and Geometry libraries.
 */

let googleMapsPromise = null;

export function loadGoogleMaps(customApiKey) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined'));
  }

  // If already loaded and available globally
  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve(window.google.maps);
  }

  // If already in-flight, return the active Promise
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey =
    customApiKey ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    (typeof window !== 'undefined' ? window.__GOOGLE_MAPS_API_KEY__ : '') ||
    '';

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if script tag already exists in document
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.google && window.google.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps script loaded but window.google.maps is undefined.'));
        }
      });
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const callbackName = `__googleMapsCallback_${Date.now()}`;
    window[callbackName] = () => {
      delete window[callbackName];
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps initialization callback failed.'));
      }
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=en&region=IN&loading=async&callback=${callbackName}`;

    script.onerror = (error) => {
      delete window[callbackName];
      googleMapsPromise = null;
      reject(new Error(`Failed to load Google Maps script from Google CDN: ${error?.message || 'Network Error'}`));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

