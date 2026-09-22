import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services';
import {
  MapPin,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Radio,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DealerLocationEnforcer({ children }) {
  const { user, updateUser } = useAuth();
  const [locationStatus, setLocationStatus] = useState('CHECKING'); // 'CHECKING' | 'ACTIVE' | 'DENIED' | 'UNSUPPORTED'
  const [coords, setCoords] = useState(
    user?.latitude && user?.longitude ? { latitude: user.latitude, longitude: user.longitude } : null
  );
  const [accuracy, setAccuracy] = useState(user?.locationAccuracyMeters || null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const watchIdRef = useRef(null);

  const syncCoordinates = async (latitude, longitude, acc) => {
    try {
      setIsSyncing(true);
      const res = await authService.updateLiveLocation({
        latitude,
        longitude,
        accuracy: acc
      });

      if (res.data?.success) {
        setCoords({ latitude, longitude });
        setAccuracy(acc);
        setLocationStatus('ACTIVE');
        if (user) {
          updateUser({
            ...user,
            latitude,
            longitude,
            isLocationActive: true,
            locationAccuracyMeters: acc,
            locationUpdatedAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.warn('Failed to sync dealer live location:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const requestLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('UNSUPPORTED');
      setErrorMessage('Geolocation is not supported by your browser or device.');
      return;
    }

    setLocationStatus('CHECKING');
    setIsSyncing(true);
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        syncCoordinates(latitude, longitude, acc);
        toast.success(`📍 Live GPS Location Active (${acc ? `±${Math.round(acc)}m` : 'Accurate'})! 5 KM Radar enabled.`);

        // Setup background watcher for smooth real-time movements
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude: lat, longitude: lng, accuracy: posAcc } = pos.coords;
            syncCoordinates(lat, lng, posAcc);
          },
          (err) => {
            console.warn('Geolocation watch warning:', err.message);
          },
          { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
        );
      },
      (error) => {
        setIsSyncing(false);
        setLocationStatus('DENIED');
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage('Location permission was denied. Please allow location access in your browser or device settings.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMessage('GPS position is currently unavailable. Please ensure device Location / GPS is turned ON.');
        } else if (error.code === error.TIMEOUT) {
          setErrorMessage('Location request timed out. Please click below to retry with high accuracy.');
        } else {
          setErrorMessage(error.message || 'Unable to retrieve location.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  useEffect(() => {
    // Automatically trigger GPS request on component mount
    requestLiveLocation();

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const isBlocked = locationStatus === 'DENIED' || locationStatus === 'UNSUPPORTED';

  return (
    <>
      {/* Top Live GPS Radar Bar in Dealer Portal */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {locationStatus === 'ACTIVE' ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>5 KM Radar: Active</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              <span>5 KM Radar: Connecting GPS...</span>
            </span>
          )}

          {coords && (
            <span className="text-slate-400 font-mono hidden sm:inline text-[11px]">
              GPS: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
              {accuracy ? ` (±${Math.round(accuracy)}m)` : ''}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={requestLiveLocation}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
          <span>{isSyncing ? 'Syncing GPS...' : 'Refresh Location'}</span>
        </button>
      </div>

      {/* Main Dealer Content */}
      {children}

      {/* MANDATORY LOCATION ACTIVATION MODAL (Non-Dismissible if Denied/Blocked) */}
      {isBlocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-amber-500/10 space-y-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <MapPin className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Compulsory Requirement
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                Turn ON GPS Location
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dear Dealer Partner, your live GPS location must be turned <strong>ON</strong> to receive and accept confirmed customer orders within your <strong>5 KM dispatch radius</strong>.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-left text-xs text-slate-400">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
                <span>How to enable:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                <li>Click the green button below.</li>
                <li>Tap <strong>"Allow"</strong> or <strong>"While using the app"</strong> in browser popup.</li>
                <li>Ensure Device GPS / Location is toggled ON in phone settings.</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={requestLiveLocation}
              disabled={isSyncing}
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm transition-all shadow-lg shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Activating GPS Location...</span>
                </>
              ) : (
                <>
                  <Radio className="w-5 h-5" />
                  <span>Turn ON Live Location & Grant Permission</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

