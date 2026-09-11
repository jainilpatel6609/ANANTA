import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Crosshair,
  Sparkles,
  Building2
} from 'lucide-react';
import { loadGoogleMaps } from '../utils/googleMapsLoader';
import { parseGoogleAddressComponents } from '../utils/googleAddressParser';
import { pincodeService } from '../services';

// Default Center: India
const INDIA_DEFAULT_CENTER = { lat: 22.9734, lng: 78.6569 };
const DEFAULT_ZOOM = 5;
const SELECTED_LOCATION_ZOOM = 17;

export default function MapPicker({
  coordinates = { lat: 23.0225, lng: 72.5714 },
  onLocationChange,
  onGPSDetect,
  onFindOnMap,
  onSuggestionSelect,
  isSearching = false,
  isLocating = false,
  statusMessage = null,
  zoom = SELECTED_LOCATION_ZOOM
}) {
  const mapContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTimerRef = useRef(null);

  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const autocompleteInstanceRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const geocoderInstanceRef = useRef(null);

  // High-accuracy GPS tracking refs & state
  const watchIdRef = useRef(null);
  const gpsTimeoutTimerRef = useRef(null);
  const bestPositionRef = useRef(null);
  const readingsCountRef = useRef(0);
  const [isLocatingInternal, setIsLocatingInternal] = useState(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [internalStatus, setInternalStatus] = useState(null);

  // Cleanup GPS watch and timers on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (gpsTimeoutTimerRef.current) {
        clearTimeout(gpsTimeoutTimerRef.current);
        gpsTimeoutTimerRef.current = null;
      }
    };
  }, []);

  // Suppress Google Maps authentication failure alert
  useEffect(() => {
    window.gm_authFailure = () => {
      console.warn('[Google Maps Platform] Missing or unbilled API Key. Seamless backend fallback active.');
    };
  }, []);

  // Initialize Google Maps JavaScript API, Map, Marker, and Places Autocomplete
  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((googleMaps) => {
        if (!isMounted || !mapContainerRef.current) return;

        const initialCenter =
          coordinates?.lat && coordinates?.lng
            ? { lat: Number(coordinates.lat), lng: Number(coordinates.lng) }
            : INDIA_DEFAULT_CENTER;

        const initialZoom = coordinates?.lat && coordinates?.lng ? SELECTED_LOCATION_ZOOM : DEFAULT_ZOOM;

        // 1. Initialize Google Map Instance (Standard Google Maps UI)
        const map = new googleMaps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          mapTypeId: 'roadmap',
          zoomControl: true,
          zoomControlOptions: {
            position: googleMaps.ControlPosition.RIGHT_BOTTOM
          },
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: googleMaps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: googleMaps.ControlPosition.TOP_LEFT
          },
          scaleControl: true,
          streetViewControl: true,
          rotateControl: true,
          fullscreenControl: true,
          gestureHandling: 'greedy'
        });

        mapInstanceRef.current = map;
        geocoderInstanceRef.current = new googleMaps.Geocoder();

        // Initialize Google Places Services
        try {
          if (googleMaps.places?.AutocompleteService) {
            autocompleteServiceRef.current = new googleMaps.places.AutocompleteService();
          }
          if (googleMaps.places?.PlacesService) {
            placesServiceRef.current = new googleMaps.places.PlacesService(map);
          }
        } catch (e) {
          console.warn('Google Places services init notice:', e);
        }

        // 2. Initialize Draggable Delivery Marker
        const marker = new googleMaps.Marker({
          position: initialCenter,
          map,
          draggable: true,
          title: 'Unloading / Delivery Spot',
          animation: googleMaps.Animation.DROP
        });

        markerInstanceRef.current = marker;

        // Marker Drag Listener (dragend)
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (!pos) return;
          const lat = pos.lat();
          const lng = pos.lng();
          executeReverseGeocode(lat, lng, 'marker_drag');
        });

        // Map Click Listener
        map.addListener('click', (e) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          marker.setPosition({ lat, lng });
          executeReverseGeocode(lat, lng, 'map_click');
        });

        // 3. Initialize Google Places Autocomplete on search input
        if (searchInputRef.current) {
          try {
            const autocomplete = new googleMaps.places.Autocomplete(searchInputRef.current, {
              componentRestrictions: { country: 'in' },
              fields: ['address_components', 'geometry', 'formatted_address', 'name']
            });

            autocomplete.bindTo('bounds', map);
            autocompleteInstanceRef.current = autocomplete;

            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace();
              if (place?.geometry?.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();

                map.setCenter({ lat, lng });
                map.setZoom(SELECTED_LOCATION_ZOOM);
                marker.setPosition({ lat, lng });

                const parsed = parseGoogleAddressComponents(
                  place.address_components,
                  place.formatted_address || place.name,
                  lat,
                  lng
                );

                setSearchValue(place.formatted_address || place.name || '');
                setShowSuggestions(false);

                setInternalStatus({
                  type: 'success',
                  text: `✓ Location selected: ${parsed.formattedAddress} (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`
                });

                if (onSuggestionSelect) {
                  onSuggestionSelect(parsed);
                } else if (onLocationChange) {
                  onLocationChange(lat, lng, 'places_autocomplete', parsed);
                }
              }
            });
          } catch (e) {
            console.warn('Places Autocomplete initialization notice:', e);
          }
        }

        setMapLoaded(true);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[Google Maps Loader Error]', err.message);
        setMapError(err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync Map and Marker Position when external coordinates change
  useEffect(() => {
    if (
      mapLoaded &&
      mapInstanceRef.current &&
      markerInstanceRef.current &&
      coordinates?.lat &&
      coordinates?.lng
    ) {
      const currentPos = markerInstanceRef.current.getPosition();
      const newLat = Number(coordinates.lat);
      const newLng = Number(coordinates.lng);

      if (
        !currentPos ||
        Math.abs(currentPos.lat() - newLat) > 0.00001 ||
        Math.abs(currentPos.lng() - newLng) > 0.00001
      ) {
        const newLatLng = { lat: newLat, lng: newLng };
        markerInstanceRef.current.setPosition(newLatLng);
        mapInstanceRef.current.panTo(newLatLng);
        if (mapInstanceRef.current.getZoom() < 14) {
          mapInstanceRef.current.setZoom(SELECTED_LOCATION_ZOOM);
        }
      }
    }
  }, [coordinates?.lat, coordinates?.lng, mapLoaded]);

  // Direct Google Places Prediction Search with automatic fallback
  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchValue(val);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearchingSuggestions(true);

      // 1. First priority: Direct Google Places Autocomplete Service (Real-time Google Database)
      if (autocompleteServiceRef.current && window.google?.maps?.places) {
        try {
          autocompleteServiceRef.current.getPlacePredictions(
            {
              input: val.trim(),
              componentRestrictions: { country: 'in' }
            },
            (predictions, status) => {
              setIsSearchingSuggestions(false);
              if (
                status === window.google.maps.places.PlacesServiceStatus.OK &&
                Array.isArray(predictions) &&
                predictions.length > 0
              ) {
                const googleList = predictions.map((p) => ({
                  title: p.structured_formatting?.main_text || p.description.split(',')[0],
                  subtitle: p.structured_formatting?.secondary_text || p.description,
                  formattedAddress: p.description,
                  placeId: p.place_id,
                  isGooglePlace: true
                }));
                setSuggestions(googleList);
                setShowSuggestions(true);
                return;
              }
              // Fallback to backend geocode if Google returned no predictions
              fallbackBackendSearch(val.trim());
            }
          );
          return;
        } catch (err) {
          console.warn('Google Places AutocompleteService error:', err);
        }
      }

      // 2. Fallback backend search
      fallbackBackendSearch(val.trim());
    }, 250);
  };

  const fallbackBackendSearch = async (query) => {
    setIsSearchingSuggestions(true);
    try {
      const res = await pincodeService.geocode(query);
      const list = res.data?.suggestions || [];
      setSuggestions(list);
      setShowSuggestions(list.length > 0);
    } catch (err) {
      console.warn('Fallback search error:', err);
    } finally {
      setIsSearchingSuggestions(false);
    }
  };

  // Handle Selection from suggestions dropdown (Google Place or Fallback)
  const handleSelectCustomSuggestion = (item) => {
    if (item.isGooglePlace && item.placeId && placesServiceRef.current) {
      setIsSearchingSuggestions(true);
      placesServiceRef.current.getDetails(
        {
          placeId: item.placeId,
          fields: ['address_components', 'geometry', 'formatted_address', 'name']
        },
        (place, status) => {
          setIsSearchingSuggestions(false);
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place?.geometry?.location
          ) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            if (mapInstanceRef.current && markerInstanceRef.current) {
              const newLatLng = { lat, lng };
              mapInstanceRef.current.panTo(newLatLng);
              mapInstanceRef.current.setZoom(18);
              markerInstanceRef.current.setPosition(newLatLng);
            }

            const parsed = parseGoogleAddressComponents(
              place.address_components,
              place.formatted_address || place.name,
              lat,
              lng
            );

            setSearchValue(place.formatted_address || place.name || item.formattedAddress);
            setShowSuggestions(false);
            setSuggestions([]);

            setInternalStatus({
              type: 'success',
              text: `✓ Location selected: ${parsed.formattedAddress} (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`
            });

            if (onSuggestionSelect) {
              onSuggestionSelect(parsed);
            } else if (onLocationChange) {
              onLocationChange(lat, lng, 'places_autocomplete', parsed);
            }
          }
        }
      );
      return;
    }

    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      if (mapInstanceRef.current && markerInstanceRef.current) {
        const newLatLng = { lat, lng };
        mapInstanceRef.current.panTo(newLatLng);
        mapInstanceRef.current.setZoom(SELECTED_LOCATION_ZOOM);
        markerInstanceRef.current.setPosition(newLatLng);
      }

      setSearchValue(item.formattedAddress || item.title);
      setShowSuggestions(false);
      setSuggestions([]);

      setInternalStatus({
        type: 'success',
        text: `✓ Location selected: ${item.formattedAddress || item.title} (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`
      });

      if (onSuggestionSelect) {
        onSuggestionSelect(item);
      } else if (onLocationChange) {
        onLocationChange(lat, lng, 'suggestion_select', item);
      }
    }
  };

  // Execute Google Maps Reverse Geocode with automatic Backend fallback
  const executeReverseGeocode = useCallback(
    (lat, lng, source = 'manual') => {
      setIsReverseGeocoding(true);
      setInternalStatus({ type: 'info', text: 'Finding address for delivery spot...' });

      const handleFallbackReverse = async () => {
        try {
          const res = await pincodeService.reverseGeocode(lat, lng);
          const location = res.data?.location;
          if (location) {
            const fallbackParsed = {
              addressLine1: location.addressLine1 || '',
              area: location.area || '',
              city: location.city || '',
              state: location.state || 'Gujarat',
              pincode: location.pincode || '',
              landmark: location.landmark || '',
              formattedAddress: location.formattedAddress || `${location.addressLine1}, ${location.city}`,
              latitude: lat,
              longitude: lng
            };

            setSearchValue(fallbackParsed.formattedAddress);
            setInternalStatus({
              type: 'success',
              text: `✓ Delivery spot set: ${fallbackParsed.formattedAddress} (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`
            });

            if (onLocationChange) {
              onLocationChange(lat, lng, source, fallbackParsed);
            }
            return;
          }
        } catch (err) {
          console.warn('Backend fallback reverse geocode error:', err);
        }

        setInternalStatus({
          type: 'info',
          text: `📍 Delivery marker set to (${lat.toFixed(5)}, ${lng.toFixed(5)}).`
        });

        if (onLocationChange) {
          onLocationChange(lat, lng, source, {
            latitude: lat,
            longitude: lng,
            formattedAddress: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
          });
        }
      };

      if (geocoderInstanceRef.current) {
        geocoderInstanceRef.current.geocode({ location: { lat, lng } }, (results, status) => {
          setIsReverseGeocoding(false);

          if (status === 'OK' && Array.isArray(results) && results[0]) {
            const topResult = results[0];
            const parsed = parseGoogleAddressComponents(
              topResult.address_components,
              topResult.formatted_address,
              lat,
              lng
            );

            setSearchValue(parsed.formattedAddress);
            setInternalStatus({
              type: 'success',
              text: `✓ Location pinpointed: ${parsed.formattedAddress} (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`
            });

            if (onLocationChange) {
              onLocationChange(lat, lng, source, parsed);
            }
          } else {
            handleFallbackReverse();
          }
        });
      } else {
        setIsReverseGeocoding(false);
        handleFallbackReverse();
      }
    },
    [onLocationChange]
  );

  // Helper to safely stop GPS watch and timers
  const stopGPSWatch = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (gpsTimeoutTimerRef.current) {
      clearTimeout(gpsTimeoutTimerRef.current);
      gpsTimeoutTimerRef.current = null;
    }
    setIsLocatingInternal(false);
  }, []);

  // Finalize location selection using the best GPS reading
  const applyBestGPSPosition = useCallback(
    (pos) => {
      stopGPSWatch();
      if (!pos || !pos.coords) return;

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;
      const roundedAcc = Math.round(accuracy);

      // Center map on high-accuracy GPS coordinates with high zoom (18)
      if (mapInstanceRef.current && markerInstanceRef.current) {
        const newLatLng = { lat, lng };
        mapInstanceRef.current.setCenter(newLatLng);
        mapInstanceRef.current.setZoom(18);
        markerInstanceRef.current.setPosition(newLatLng);
      }

      // Format user-facing accuracy status message
      let statusText = '';
      let statusType = 'success';

      if (accuracy <= 10) {
        statusText = `📍 Current location detected. Excellent GPS accuracy: ±${roundedAcc} meters`;
      } else if (accuracy <= 25) {
        statusText = `📍 Current location detected. Good GPS accuracy: ±${roundedAcc} meters`;
      } else if (accuracy <= 50) {
        statusText = `📍 Current location detected. Acceptable GPS accuracy: ±${roundedAcc} meters`;
      } else {
        statusText = `📍 GPS accuracy is ±${roundedAcc} meters. Please wait or adjust the delivery marker.`;
        statusType = 'warning';
      }

      setInternalStatus({
        type: statusType,
        text: statusText
      });

      // Call existing reverse geocoding with 'gps' source
      executeReverseGeocode(lat, lng, 'gps');

      // Call existing callback with accuracy
      if (onGPSDetect) {
        onGPSDetect(lat, lng, accuracy);
      }
    },
    [executeReverseGeocode, onGPSDetect, stopGPSWatch]
  );

  // High Accuracy GPS detection using navigator.geolocation.watchPosition()
  const handleCurrentGPS = () => {
    if (!navigator.geolocation) {
      setInternalStatus({
        type: 'error',
        text: 'GPS Geolocation is not supported by your browser.'
      });
      return;
    }

    // Clear any previous active watch before starting a new one
    stopGPSWatch();

    bestPositionRef.current = null;
    readingsCountRef.current = 0;
    setIsLocatingInternal(true);
    setInternalStatus({
      type: 'info',
      text: '📍 Finding your exact location... Please wait.'
    });

    const MAX_GPS_READINGS = 5;
    const TARGET_EXCELLENT_ACCURACY = 10; // 10 meters or better

    // 20-second safety timeout
    gpsTimeoutTimerRef.current = setTimeout(() => {
      if (bestPositionRef.current) {
        applyBestGPSPosition(bestPositionRef.current);
      } else {
        stopGPSWatch();
        setInternalStatus({
          type: 'warning',
          text: 'GPS detection timed out. Please try again or search your address manually.'
        });
      }
    }, 20000);

    try {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          readingsCountRef.current += 1;
          const currentAccuracy = pos.coords.accuracy;
          const roundedAcc = Math.round(currentAccuracy);

          // Always retain the reading with lowest/best accuracy value (in meters)
          if (
            !bestPositionRef.current ||
            currentAccuracy < bestPositionRef.current.coords.accuracy
          ) {
            bestPositionRef.current = pos;
          }

          // Real-time status message while collecting readings
          setInternalStatus({
            type: 'info',
            text: `📡 Improving GPS accuracy... ±${roundedAcc} meters`
          });

          // Early finish if accuracy is <= 10m
          if (currentAccuracy <= TARGET_EXCELLENT_ACCURACY) {
            applyBestGPSPosition(bestPositionRef.current);
            return;
          }

          // Finish when maximum reading sample count is reached
          if (readingsCountRef.current >= MAX_GPS_READINGS) {
            applyBestGPSPosition(bestPositionRef.current);
            return;
          }
        },
        (err) => {
          // If a valid position was already received before the error/timeout, use it
          if (bestPositionRef.current) {
            applyBestGPSPosition(bestPositionRef.current);
            return;
          }

          stopGPSWatch();

          let errMsg = 'Unable to detect your current location. Please search your address manually.';
          if (err.code === 1) {
            errMsg = 'Location permission denied. Please allow location access in your browser/device settings.';
          } else if (err.code === 2) {
            errMsg = 'GPS location is currently unavailable. Please enable Location/GPS and try again.';
          } else if (err.code === 3) {
            errMsg = 'GPS detection timed out. Please try again or search your address manually.';
          }

          setInternalStatus({
            type: 'warning',
            text: errMsg
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );

      watchIdRef.current = watchId;
    } catch (e) {
      stopGPSWatch();
      setInternalStatus({
        type: 'error',
        text: 'Error initiating GPS detection. Please try again.'
      });
    }
  };

  // Manual "Sync Address to Map" handler using Google Geocoder with backend fallback
  const handleSyncAddress = () => {
    if (onFindOnMap) {
      onFindOnMap(true);
      return;
    }

    if (!searchValue.trim()) return;

    setInternalStatus({ type: 'info', text: 'Locating address on map...' });

    if (geocoderInstanceRef.current) {
      geocoderInstanceRef.current.geocode(
        { address: searchValue.trim(), componentRestrictions: { country: 'in' } },
        async (results, status) => {
          if (status === 'OK' && Array.isArray(results) && results[0]) {
            const loc = results[0].geometry.location;
            const lat = loc.lat();
            const lng = loc.lng();

            if (mapInstanceRef.current && markerInstanceRef.current) {
              const newLatLng = { lat, lng };
              mapInstanceRef.current.setCenter(newLatLng);
              mapInstanceRef.current.setZoom(SELECTED_LOCATION_ZOOM);
              markerInstanceRef.current.setPosition(newLatLng);
            }

            const parsed = parseGoogleAddressComponents(
              results[0].address_components,
              results[0].formatted_address,
              lat,
              lng
            );

            setInternalStatus({
              type: 'success',
              text: `✓ Address found: ${parsed.formattedAddress} (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`
            });

            if (onLocationChange) {
              onLocationChange(lat, lng, 'sync_address', parsed);
            }
          } else {
            // Try backend geocode
            try {
              const res = await pincodeService.geocode(searchValue.trim());
              const suggestions = res.data?.suggestions || [];
              if (suggestions.length > 0) {
                handleSelectCustomSuggestion(suggestions[0]);
                return;
              }
            } catch (e) {
              console.warn('Backend geocode error:', e);
            }

            setInternalStatus({
              type: 'warning',
              text: 'Unable to determine coordinates for entered address. Try searching a specific road or area.'
            });
          }
        }
      );
    }
  };

  const locatingActive = isLocating || isLocatingInternal;
  const activeStatus = statusMessage || internalStatus;

  return (
    <div className="space-y-3">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span>Set Exact Delivery Location on Google Maps</span>
        </label>

        {/* Sync Manual Address to Map Button */}
        <button
          type="button"
          onClick={handleSyncAddress}
          disabled={isSearching || locatingActive || isReverseGeocoding}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 active:scale-95 cursor-pointer"
          title="Sync manual address to map location"
        >
          {isSearching || isReverseGeocoding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5 rotate-45" />
          )}
          <span>{isSearching || isReverseGeocoding ? 'Locating on Map...' : 'Sync Address to Map'}</span>
        </button>
      </div>

      {/* Search Input & Suggestions Container */}
      <div className="relative z-30">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {isSearching || isReverseGeocoding || isSearchingSuggestions ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Search className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={handleSearchInputChange}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="Search address, site, road, highway..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-950/95 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 transition-all shadow-xl"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => {
                setSearchValue('');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Fallback Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectCustomSuggestion(item)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-800/80 border-b border-slate-800/50 last:border-0 transition-colors flex items-start gap-2.5 cursor-pointer"
              >
                <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${item.isGooglePlace ? 'text-red-400' : 'text-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{item.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">{item.subtitle || item.formattedAddress}</div>
                </div>
                {item.isGooglePlace && (
                  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                    Google Maps
                  </span>
                )}
                {item.pincode && (
                  <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md shrink-0">
                    {item.pincode}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Feedback Banner */}
      {activeStatus && activeStatus.text && (
        <div
          className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs transition-all shadow-md ${
            activeStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : activeStatus.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : activeStatus.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          {activeStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <span className="font-medium leading-relaxed">{activeStatus.text}</span>
        </div>
      )}

      {/* Google Maps Container */}
      <div className="h-72 sm:h-96 w-full rounded-3xl overflow-hidden border-2 border-slate-700/80 shadow-2xl relative z-10 select-none bg-slate-950">
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Loading Spinner overlay before Google Maps mounts */}
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            <span className="text-xs font-bold text-slate-300">Loading Google Maps Platform...</span>
          </div>
        )}

        {/* Floating "Locate Me" GPS Button */}
        <button
          type="button"
          onClick={handleCurrentGPS}
          disabled={locatingActive || isReverseGeocoding}
          className="absolute bottom-4 right-4 z-[400] px-4 py-2.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800/95 backdrop-blur-xl border border-slate-700 text-xs font-black text-emerald-400 flex items-center gap-2 shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 group cursor-pointer"
          title="Use My Current Location via GPS"
        >
          {locatingActive ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            <Crosshair className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
          )}
          <span>{locatingActive ? 'Detecting GPS...' : 'Use My Current Location'}</span>
        </button>

        {/* Real-Time Location Pill at Bottom Left */}
        <div className="absolute bottom-4 left-4 z-[400] max-w-[65%] sm:max-w-[70%] pointer-events-none">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-[11px] font-medium text-slate-300 flex items-center gap-2 shadow-2xl truncate">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
            <span className="truncate font-mono text-[10px] text-amber-300">
              {coordinates?.lat ? Number(coordinates.lat).toFixed(5) : '0.00000'},{' '}
              {coordinates?.lng ? Number(coordinates.lng).toFixed(5) : '0.00000'}
            </span>
          </div>
        </div>
      </div>

      {/* Helper Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 px-1">
        <span>💡 Drag the Delivery Spot marker or click on Google Map to pinpoint exact unloading spot.</span>
        <span className="font-mono text-slate-500">
          Lat: <strong className="text-amber-400">{coordinates?.lat ? Number(coordinates.lat).toFixed(5) : '—'}</strong>
          , Lng:{' '}
          <strong className="text-amber-400">{coordinates?.lng ? Number(coordinates.lng).toFixed(5) : '—'}</strong>
        </span>
      </div>
    </div>
  );
}
