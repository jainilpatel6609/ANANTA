import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Truck, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AuthSuccessAnimation() {
  const { user, isAuthenticated, isUser, isDealer, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 5.0 Seconds duration (5000ms)
  const DURATION_MS = 5000;
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const current = Date.now() - startTime;
      if (current >= DURATION_MS) {
        setElapsedMs(DURATION_MS);
        clearInterval(interval);

        // Compute destination based on trusted authenticated user role
        let target = '/user/dashboard';
        const role = user?.role;
        if (role === 'ADMIN') {
          target = '/admin/dashboard';
        } else if (role === 'DEALER') {
          target = '/dealer/dashboard';
        } else {
          target = location.state?.from?.pathname || '/user/dashboard';
        }

        navigate(target, { replace: true });
      } else {
        setElapsedMs(current);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [user, navigate, location]);

  const progressPercent = Math.min(100, Math.round((elapsedMs / DURATION_MS) * 100));
  const remainingSeconds = Math.max(0, ((DURATION_MS - elapsedMs) / 1000).toFixed(1));
  const isNearEnd = elapsedMs >= 3500;

  // Role display label
  const getRoleLabel = () => {
    if (user?.role === 'ADMIN') return 'Super Admin Executive';
    if (user?.role === 'DEALER') return 'Authorized Dealer Depot';
    return 'Customer / Builder Portal';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center px-4 overflow-hidden select-none">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[800px] h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-2xl text-center space-y-8">
        {/* Brand Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-brand-500/30 text-brand-400 text-xs font-bold tracking-wider uppercase shadow-lg shadow-brand-500/10">
            <ShieldCheck className="w-4 h-4 text-brand-400 animate-pulse" />
            Verified Authentication
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
            ANANTA <span className="text-brand-400">TRADERS</span>
          </h1>

          <p className="text-sm font-medium text-slate-400 transition-all duration-300">
            {isNearEnd ? (
              <span className="text-emerald-400 font-bold inline-flex items-center gap-1.5 animate-bounce">
                <CheckCircle2 className="w-4 h-4" /> Welcome Back, {user?.name || 'Authorized Member'}!
              </span>
            ) : (
              `Establishing secure connection to ${getRoleLabel()}...`
            )}
          </p>
        </div>

        {/* 5-SECOND TRACTOR ANIMATION STAGE */}
        <div className="relative w-full h-52 sm:h-60 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 overflow-hidden shadow-2xl flex flex-col justify-end">
          {/* Distant Quarry Silhouette / Horizon */}
          <div className="absolute top-6 left-0 right-0 h-16 opacity-20 pointer-events-none flex justify-around items-end px-4">
            <div className="w-24 h-10 bg-slate-700 rounded-t-full" />
            <div className="w-36 h-14 bg-slate-700 rounded-t-full" />
            <div className="w-28 h-8 bg-slate-700 rounded-t-full" />
            <div className="w-40 h-12 bg-slate-700 rounded-t-full" />
          </div>

          {/* Animated Tractor & Trolley Fleet Object */}
          <div
            className="absolute bottom-11 will-change-transform"
            style={{
              left: `${(elapsedMs / DURATION_MS) * 115 - 15}%`,
              transition: 'left 50ms linear'
            }}
          >
            {/* SVG Tractor + Trolley */}
            <div className="relative flex items-end">
              {/* Dust / Exhaust Particle Cloud behind tractor */}
              <div className="absolute -left-8 bottom-3 flex items-center gap-1 opacity-75">
                <span className="w-3 h-3 rounded-full bg-slate-600/60 blur-xs animate-ping" />
                <span className="w-4 h-4 rounded-full bg-amber-600/40 blur-xs animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-slate-500/50 blur-xs animate-ping" />
              </div>

              {/* TROLLEY (Double Patiya Loaded with Sand/Aggregate) */}
              <svg width="120" height="70" viewBox="0 0 120 70" className="drop-shadow-md">
                {/* Trolley Body */}
                <path d="M 10 25 L 110 25 L 105 52 L 15 52 Z" fill="#18181b" stroke="#000000" strokeWidth="2" />
                {/* Sand / Aggregate Load Mound */}
                <path d="M 14 25 Q 60 8 106 25 Z" fill="#dca83a" />
                {/* Trolley Side Rail Ribs */}
                <line x1="35" y1="25" x2="35" y2="52" stroke="#000000" strokeWidth="2" />
                <line x1="60" y1="25" x2="60" y2="52" stroke="#000000" strokeWidth="2" />
                <line x1="85" y1="25" x2="85" y2="52" stroke="#000000" strokeWidth="2" />
                {/* Hitch Bar to Tractor */}
                <rect x="105" y="44" width="18" height="4" fill="#3f3f46" />
                {/* Rear Heavy Wheels */}
                <g className="animate-spin" style={{ transformOrigin: '35px 54px', animationDuration: '0.6s' }}>
                  <circle cx="35" cy="54" r="14" fill="#18181b" stroke="#52525b" strokeWidth="3" />
                  <circle cx="35" cy="54" r="6" fill="#c9a227" />
                  <line x1="35" y1="40" x2="35" y2="68" stroke="#d4d4d8" strokeWidth="2" />
                  <line x1="21" y1="54" x2="49" y2="54" stroke="#d4d4d8" strokeWidth="2" />
                </g>
                <g className="animate-spin" style={{ transformOrigin: '85px 54px', animationDuration: '0.6s' }}>
                  <circle cx="85" cy="54" r="14" fill="#18181b" stroke="#52525b" strokeWidth="3" />
                  <circle cx="85" cy="54" r="6" fill="#c9a227" />
                  <line x1="85" y1="40" x2="85" y2="68" stroke="#d4d4d8" strokeWidth="2" />
                  <line x1="71" y1="54" x2="99" y2="54" stroke="#d4d4d8" strokeWidth="2" />
                </g>
              </svg>

              {/* HEAVY TRACTOR */}
              <svg width="130" height="85" viewBox="0 0 130 85" className="-ml-3 drop-shadow-lg">
                {/* Headlamp beam */}
                <polygon points="120,48 180,35 180,65 120,54" fill="rgba(220, 168, 58, 0.3)" className="animate-pulse" />
                
                {/* Exhaust Pipe & Smoke Puffs */}
                <rect x="78" y="10" width="4" height="24" fill="#27272a" />
                <path d="M 76 10 L 84 10 L 80 6 Z" fill="#52525b" />
                <circle cx="80" cy="4" r="3" fill="#a1a1aa" className="animate-ping opacity-60" />

                {/* Engine Hood / Bonnet */}
                <path d="M 52 34 L 118 36 L 120 54 L 52 54 Z" fill="#0a0a0a" stroke="#000000" strokeWidth="2" />
                {/* Grille */}
                <rect x="112" y="38" width="6" height="14" fill="#27272a" rx="1" />
                {/* Headlight */}
                <circle cx="118" cy="48" r="3.5" fill="#fef08a" stroke="#000000" strokeWidth="1" />

                {/* Driver Cabin / Roll Cage */}
                <path d="M 22 20 L 52 20 L 52 54 L 20 54 Z" fill="#dca83a" stroke="#a9841e" strokeWidth="2" />
                {/* Cabin Glass */}
                <path d="M 26 24 L 48 24 L 48 40 L 26 40 Z" fill="#38bdf8" opacity="0.8" />
                {/* Steering wheel */}
                <line x1="45" y1="36" x2="38" y2="30" stroke="#18181b" strokeWidth="2" />
                
                {/* Rear Big Wheel (Rotates) */}
                <g className="animate-spin" style={{ transformOrigin: '32px 58px', animationDuration: '0.6s' }}>
                  <circle cx="32" cy="58" r="22" fill="#09090b" stroke="#3f3f46" strokeWidth="4" />
                  <circle cx="32" cy="58" r="10" fill="#c9a227" stroke="#816417" strokeWidth="2" />
                  {/* Wheel Spoke Lines */}
                  <line x1="32" y1="36" x2="32" y2="80" stroke="#e4e4e7" strokeWidth="2" />
                  <line x1="10" y1="58" x2="54" y2="58" stroke="#e4e4e7" strokeWidth="2" />
                  <line x1="16" y1="42" x2="48" y2="74" stroke="#e4e4e7" strokeWidth="2" />
                  <line x1="16" y1="74" x2="48" y2="42" stroke="#e4e4e7" strokeWidth="2" />
                </g>

                {/* Front Smaller Wheel (Rotates) */}
                <g className="animate-spin" style={{ transformOrigin: '106px 64px', animationDuration: '0.6s' }}>
                  <circle cx="106" cy="64" r="14" fill="#09090b" stroke="#3f3f46" strokeWidth="3" />
                  <circle cx="106" cy="64" r="6" fill="#c9a227" />
                  <line x1="106" y1="50" x2="106" y2="78" stroke="#e4e4e7" strokeWidth="2" />
                  <line x1="92" y1="64" x2="120" y2="64" stroke="#e4e4e7" strokeWidth="2" />
                </g>
              </svg>
            </div>
          </div>

          {/* Construction Road Bed & Moving Dashed Line */}
          <div className="relative w-full h-11 bg-slate-950 border-t-2 border-slate-700 flex flex-col justify-center">
            {/* Moving Road Dashes */}
            <div className="w-full h-1 border-t-2 border-dashed border-amber-400/80 animate-pulse" />
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest text-right pr-4 pt-1">
              ANANTA DIRECT DISPATCH ROUTE
            </div>
          </div>
        </div>

        {/* Live Progress Bar & 5-Second Countdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-slate-300">
              <Truck className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
              Fleet Dispatch Initialization
            </span>
            <span className="font-bold text-amber-400">
              {remainingSeconds}s remaining ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-brand-400 to-emerald-400 rounded-full transition-all duration-75 shadow-lg shadow-brand-500/50"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Direct Riverbed & Quarry Supply Network — 100% Certified Royalty</span>
          </div>
        </div>
      </div>
    </div>
  );
}

