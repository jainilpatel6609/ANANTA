import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import {
  MapPin,
  Navigation,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Crosshair,
  Plus,
  Minus,
  Maximize2
} from 'lucide-react';
import { pincodeService } from '../services';

// Center Pin Controller with Rapido / Swiggy / Zepto Drag & Drop Animations
function MapCenterController({ onCenterChange, onDragStateChange }) {
  const map = useMap();

  useMapEvents({
    movestart() {
      if (onDragStateChange) onDragStateChange(true);
    },
    dragstart() {
      if (onDragStateChange) onDragStateChange(true);
    },
    moveend() {
      const center = map.getCenter();
      if (onDragStateChange) onDragStateChange(false);
      if (onCenterChange) {
        onCenterChange({ lat: center.lat, lng: center.lng });
      }
    }
  });

  return null;
}

// Controller to smoothly pan & zoom map and invalidate size for Android WebViews
function MapFlyController({ targetCoordinates, zoom = 17 }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate size after mount to prevent grey/blank tiles in mobile WebViews
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (
      targetCoordinates?.lat &&
      targetCoordinates?.lng &&
      !Number.isNaN(targetCoordinates.lat) &&
      !Number.isNaN(targetCoordinates.lng)
    ) {
      map.flyTo([targetCoordinates.lat, targetCoordinates.lng], zoom, {
        animate: true,
        duration: 1.0,
        easeLinearity: 0.25
      });
    }
  }, [targetCoordinates, zoom, map]);

  return null;
}

// Modern Floating Map Control Buttons (Zoom In, Zoom Out, Fullscreen)
function FloatingMapControls() {
  const map = useMap();

  const handleZoomIn = (e) => {
    e.stopPropagation();
    map.zoomIn();
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    map.zoomOut();
  };

  return (
    <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5 shadow-lg">
      <button
        type="button"
        onClick={handleZoomIn}
        className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md"
        title="Zoom In"
      >
        <Plus className="w-4 h-4 text-amber-400" />
      </button>
      <button
        type="button"
        onClick={handleZoomOut}
        className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md"
        title="Zoom Out"
      >
        <Minus className="w-4 h-4 text-amber-400" />
      </button>
    </div>
  );
}

export default function MapPicker({
  coordinates = { lat: 23.0225, lng: 72.5714 },
  onLocationChange,
  onGPSDetect,
  onFindOnMap,
  onSuggestionSelect,
  isSearching = false,
  isLocating = false,
  statusMessage = null,
  zoom = 17
}) {
  const [currentCenter, setCurrentCenter] = useState(coordinates);
  const [targetCoords, setTargetCoords] = useState(coordinates);
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchingSuggestions, setSearchingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [detectedAddressPreview, setDetectedAddressPreview] = useState('');
  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (
      coordinates?.lat &&
      coordinates?.lng &&
      (coordinates.lat !== currentCenter.lat || coordinates.lng !== currentCenter.lng)
    ) {
      setCurrentCenter(coordinates);
      setTargetCoords(coordinates);
    }
  }, [coordinates]);

  // Click outside listener to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Live search suggestions debounce
  useEffect(() => {
    if (!searchInput || searchInput.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingSuggestions(true);
      try {
        const res = await pincodeService.geocode(searchInput.trim());
        if (res.data?.suggestions) {
          setSuggestions(res.data.suggestions);
          setShowDropdown(res.data.suggestions.length > 0);
        }
      } catch (err) {
        console.warn('Geocoding suggestions error:', err);
      } finally {
        setSearchingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle center change when user stops dragging the map (Rapido / Swiggy style)
  const handleMapCenterChanged = useCallback(
    (newCenter) => {
      setCurrentCenter(newCenter);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        if (onLocationChange) {
          onLocationChange(newCenter.lat, newCenter.lng, 'map_pan');
        }

        // Fetch reverse geocode address preview for bottom pill
        try {
          const res = await pincodeService.reverseGeocode(newCenter.lat, newCenter.lng);
          const loc = res.data?.location;
          if (loc) {
            const preview = [loc.addressLine1, loc.area, loc.city].filter(Boolean).join(', ');
            setDetectedAddressPreview(preview || loc.formattedAddress || 'Location selected');
          }
        } catch (e) {
          // ignore preview error
        }
      }, 400);
    },
    [onLocationChange]
  );

  const handleSelectSuggestion = (item) => {
    const newPos = { lat: item.latitude, lng: item.longitude };
    setCurrentCenter(newPos);
    setTargetCoords(newPos);
    setSearchInput(item.title);
    setShowDropdown(false);
    setDetectedAddressPreview(item.subtitle || item.title);

    if (onSuggestionSelect) {
      onSuggestionSelect(item);
    } else if (onLocationChange) {
      onLocationChange(newPos.lat, newPos.lng, 'suggestion_select');
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span>Set Exact Delivery Location on Map</span>
        </label>

        {/* Sync Address Button */}
        {onFindOnMap && (
          <button
            type="button"
            onClick={onFindOnMap}
            disabled={isSearching || isLocating}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 active:scale-95"
            title="Sync manual address to map location"
          >
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 rotate-45" />
            )}
            <span>{isSearching ? 'Locating...' : 'Sync Address to Map'}</span>
          </button>
        )}
      </div>

      {/* Swiggy / Zepto Style Live Places Autocomplete Search Bar */}
      <div ref={searchContainerRef} className="relative z-30">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {searchingSuggestions ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Search className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            placeholder="🔍 Search site, building, road, area, or PIN code (e.g. Mehsana Highway, Patan)..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-950/95 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 transition-all shadow-xl"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSuggestions([]);
                setShowDropdown(false);
              }}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Places Autocomplete Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-slate-700 shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-800/80 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {suggestions.map((item, idx) => (
              <div
                key={`${item.latitude}-${item.longitude}-${idx}`}
                onClick={() => handleSelectSuggestion(item)}
                className="p-3.5 hover:bg-amber-500/10 cursor-pointer transition-colors flex items-start gap-3 text-xs group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500/20 group-hover:text-amber-400 text-slate-400 transition-colors">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white group-hover:text-amber-300 transition-colors truncate text-xs">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
                {item.pincode && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] font-mono font-bold text-amber-400 border border-slate-700 shrink-0">
                    {item.pincode}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && statusMessage.text && (
        <div
          className={`p-2.5 rounded-xl border flex items-start gap-2 text-xs transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : statusMessage.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : statusMessage.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Swiggy / Rapido / Zepto Style Interactive Map Container */}
      <div className="h-72 sm:h-96 w-full rounded-3xl overflow-hidden border-2 border-slate-700/80 shadow-2xl relative z-10 select-none bg-slate-950">
        <MapContainer
          center={[currentCenter.lat, currentCenter.lng]}
          zoom={zoom}
          zoomControl={false} // Clean modern look - removes ugly default +- box
          scrollWheelZoom={true}
          touchZoom={true}
          tap={false}
          preferCanvas={true}
          bounceAtZoomLimits={false}
          className="h-full w-full"
        >
          {/* Authentic Google Maps Standard Roads & Landmarks Tiles (Zero Watermark, 100% Crisp) */}
          <TileLayer
            attribution='&copy; <a href="https://maps.google.com/">Google Maps</a>'
            url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            maxZoom={20}
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          />

          <MapCenterController
            onCenterChange={handleMapCenterChanged}
            onDragStateChange={setIsMapDragging}
          />
          <MapFlyController targetCoordinates={targetCoords} zoom={zoom} />
          <FloatingMapControls />
        </MapContainer>

        {/* SWIGGY / RAPIDO / ZEPTO SIGNATURE FIXED CENTER DELIVERY PIN */}
        <div className="absolute inset-0 pointer-events-none z-[450] flex items-center justify-center">
          <div className="relative flex flex-col items-center">
            {/* Top Floating Speech Bubble Tooltip */}
            <div
              className={`absolute -top-12 whitespace-nowrap px-3.5 py-1.5 rounded-full bg-slate-950/95 backdrop-blur-md border border-amber-500/50 shadow-2xl text-[11px] font-bold text-amber-300 flex items-center gap-1.5 transition-all duration-300 ${
                isMapDragging
                  ? 'opacity-100 scale-105 -translate-y-2'
                  : 'opacity-90 scale-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{isMapDragging ? 'Move map to pinpoint delivery spot' : 'Order will be delivered here'}</span>
            </div>

            {/* Premium Animated Delivery Pin */}
            <div
              className={`transition-transform duration-300 ease-out origin-bottom ${
                isMapDragging ? '-translate-y-4 scale-110' : 'translate-y-0 scale-100'
              }`}
            >
              <svg
                width="42"
                height="54"
                viewBox="0 0 42 54"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-2xl"
              >
                <path
                  d="M21 0C9.402 0 0 9.402 0 21C0 35.156 18.396 51.986 20.178 53.58C20.648 54.004 21.352 54.004 21.822 53.58C23.604 51.986 42 35.156 42 21C42 9.402 32.598 0 21 0Z"
                  fill="url(#pinGradient)"
                />
                <circle cx="21" cy="21" r="11" fill="#0f172a" />
                <circle cx="21" cy="21" r="6" fill="#f59e0b" />
                <defs>
                  <linearGradient id="pinGradient" x1="0" y1="0" x2="42" y2="54" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fbbf24" />
                    <stop offset="1" stopColor="#d97706" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Pin Ground Shadow Animation */}
            <div
              className={`w-5 h-2 bg-black/40 rounded-full blur-[2px] transition-all duration-300 -mt-1 ${
                isMapDragging ? 'scale-50 opacity-20' : 'scale-100 opacity-60'
              }`}
            />
          </div>
        </div>

        {/* Floating Uber / Swiggy Style "Use My Current Location" Round GPS Button */}
        {onGPSDetect && (
          <button
            type="button"
            onClick={onGPSDetect}
            disabled={isLocating}
            className="absolute bottom-4 right-4 z-[400] px-4 py-2.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800/95 backdrop-blur-xl border border-slate-700 text-xs font-black text-emerald-400 flex items-center gap-2 shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 group"
            title="Locate me using GPS"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Crosshair className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
            )}
            <span>{isLocating ? 'Locating GPS...' : 'Locate Me'}</span>
          </button>
        )}

        {/* Real-Time Location Pill at Bottom Left */}
        <div className="absolute bottom-4 left-4 z-[400] max-w-[65%] sm:max-w-[70%] pointer-events-none">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-[11px] font-medium text-slate-300 flex items-center gap-2 shadow-2xl truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">
              {detectedAddressPreview || `Coords: ${currentCenter.lat.toFixed(4)}, ${currentCenter.lng.toFixed(4)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Helper Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 px-1">
        <span>💡 Drag & move the map to place the golden pin at your exact delivery gate / site.</span>
        <span className="font-mono text-slate-500">
          Lat: <strong className="text-amber-400">{currentCenter.lat.toFixed(5)}</strong>, Lng:{' '}
          <strong className="text-amber-400">{currentCenter.lng.toFixed(5)}</strong>
        </span>
      </div>
    </div>
  );
}
