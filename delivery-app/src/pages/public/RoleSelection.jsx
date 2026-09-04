import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  HardHat,
  Warehouse,
  Navigation,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Clock,
  KeyRound,
  Coins,
  PhoneCall
} from 'lucide-react';

export default function RoleSelection({ onSelectRole }) {
  const navigate = useNavigate();

  const handleSelect = (roleKey) => {
    if (onSelectRole) {
      onSelectRole(roleKey);
    } else {
      navigate(`/login?role=${roleKey}`);
    }
  };

  const roles = [
    {
      key: 'USER',
      title: 'Customer Portal',
      roleLabel: 'Builder & Contractor',
      subtitle: 'Order Sand, Aggregate & Grit with Live Delivery',
      icon: HardHat,
      badge: 'Order Materials',
      themeColor: 'emerald',
      bgGradient: 'from-emerald-500/15 via-emerald-500/5 to-slate-900',
      borderClass: 'border-emerald-500/30 hover:border-emerald-400 hover:shadow-emerald-500/20',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      btnClass: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25',
      features: [
        { icon: Coins, text: 'Direct Riverbed & Quarry Rates' },
        { icon: MapPin, text: 'Google Maps GPS Delivery' },
        { icon: ShieldCheck, text: '100% Genuine Royalty & Slips' }
      ]
    },
    {
      key: 'DEALER',
      title: 'Dealer Portal',
      roleLabel: 'Authorized Depot',
      subtitle: 'Regional Material Depot & Fleet Dispatch Management',
      icon: Warehouse,
      badge: 'Depot & Fleet',
      themeColor: 'amber',
      bgGradient: 'from-amber-500/15 via-amber-500/5 to-slate-900',
      borderClass: 'border-amber-500/30 hover:border-amber-400 hover:shadow-amber-500/20',
      iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      btnClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25',
      features: [
        { icon: Clock, text: '15-Min Real-Time Order Alarm' },
        { icon: Truck, text: 'Driver & Vehicle Assignment' },
        { icon: MapPin, text: 'Pincode Zone Auto-Routing' }
      ]
    },
    {
      key: 'DRIVER',
      title: 'Fleet Driver Portal',
      roleLabel: 'Delivery Navigation',
      subtitle: 'Turn-by-Turn GPS Route & Customer OTP Verification',
      icon: Navigation,
      badge: 'Live Navigation',
      themeColor: 'sky',
      bgGradient: 'from-sky-500/15 via-sky-500/5 to-slate-900',
      borderClass: 'border-sky-500/30 hover:border-sky-400 hover:shadow-sky-500/20',
      iconBg: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
      badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      btnClass: 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/25',
      features: [
        { icon: Navigation, text: 'One-Tap Google Maps Route' },
        { icon: KeyRound, text: '6-Digit Delivery OTP Handover' },
        { icon: PhoneCall, text: 'Direct Customer Calling' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6 selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-xl mx-auto space-y-6">
        {/* Mobile-Friendly App Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-xl shadow-amber-500/20 ring-4 ring-amber-500/10">
            <Truck className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Direct Riverbed & Fleet Platform
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
              ANANTA <span className="text-amber-400">TRADERS</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Select your role to access your dedicated mobile workspace
            </p>
          </div>
        </div>

        {/* Vertical Stacked Mobile Cards */}
        <div className="space-y-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.key}
                onClick={() => handleSelect(role.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(role.key)}
                className={`group relative bg-gradient-to-br ${role.bgGradient} bg-slate-900/90 border ${role.borderClass} rounded-2xl p-5 shadow-xl transition-all duration-200 active:scale-[0.98] cursor-pointer`}
              >
                {/* Card Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${role.iconBg}`}>
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-white font-display group-hover:text-amber-400 transition-colors">
                          {role.title}
                        </h2>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${role.badgeClass}`}>
                          {role.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium line-clamp-1 mt-0.5">
                        {role.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 group-hover:text-white group-hover:bg-slate-700 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Feature Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-slate-800/80">
                  {role.features.map((feat, idx) => {
                    const FeatIcon = feat.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60"
                      >
                        <FeatIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{feat.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Action Button */}
                <div className="mt-4 pt-1">
                  <div
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all group-hover:opacity-95 ${role.btnClass}`}
                  >
                    <span>Proceed to {role.title}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-xl mx-auto text-center pt-6 pb-2 text-[11px] text-slate-500 space-y-1">
        <p className="font-medium text-slate-400">
          Need Dispatch Assistance? Call Helpline: <a href="tel:+919876543210" className="text-amber-400 hover:underline font-bold">+91 98765 43210</a>
        </p>
        <p className="text-slate-600">
          ANANTA TRADERS • High Quality River Sand, Aggregate & Grit Delivery
        </p>
      </div>
    </div>
  );
}
