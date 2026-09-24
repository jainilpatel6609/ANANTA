import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Smartphone, CheckCircle, Volume2, ShieldCheck, X } from 'lucide-react';
import { getPushPermissionState, getPushPermissionStateAsync, requestAndRegisterDevicePush } from '../utils/fcm';
import { notificationService } from '../services';
import toast from 'react-hot-toast';

export default function NotificationPermissionPrompt({ role = 'DEALER' }) {
  const [permission, setPermission] = useState('default');
  const [dismissed, setDismissed] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setPermission(getPushPermissionState());
    // Inside the Android app the real permission status is read from the native side asynchronously.
    getPushPermissionStateAsync().then(setPermission);
  }, []);

  if (dismissed || permission === 'unsupported' || permission === 'denied') {
    return null;
  }

  // If already granted, show a compact verified status indicator with test button
  if (permission === 'granted') {
    return (
      <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            <strong>Device Push Alarm Active:</strong> You will receive real mobile notifications & sound alerts for incoming dispatches.
          </span>
        </div>
        <button
          type="button"
          onClick={async () => {
            setTesting(true);
            try {
              await notificationService.testPush();
              toast.success('Test alarm dispatched to your device!');
            } catch (err) {
              toast.error('Test push failed');
            } finally {
              setTesting(false);
            }
          }}
          disabled={testing}
          className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-bold transition-colors disabled:opacity-50"
        >
          {testing ? 'Testing...' : '🔔 Test Device Alarm'}
        </button>
      </div>
    );
  }

  const handleEnablePush = async () => {
    setRegistering(true);
    try {
      const res = await requestAndRegisterDevicePush();
      if (res.success) {
        setPermission('granted');
        toast.success('Mobile & Device Push Alarm activated! You will receive live alerts.');
      } else if (res.reason === 'denied') {
        setPermission('denied');
        toast.error('Notification permission was blocked in your browser settings.');
      }
    } catch (err) {
      toast.error('Could not activate push notifications.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-950 border-2 border-amber-500/30 p-5 text-white shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 animate-bounce">
            <Smartphone className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                📱 Real Mobile Device Push Alarm
              </span>
              <span className="text-xs font-bold text-amber-300">
                {role === 'DEALER' ? 'Dealer Dispatch Alert' : 'Super Admin Alert'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Enable native mobile device push notifications to receive <strong>real-time order dispatch sound alerts</strong> even when this browser tab is minimized or closed!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-2 text-slate-400 hover:text-slate-200 text-xs rounded-xl"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={registering}
            onClick={handleEnablePush}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <BellRing className="w-4 h-4" />
            {registering ? 'Activating...' : 'Enable Device Push Alarm'}
          </button>
        </div>
      </div>
    </div>
  );
}

