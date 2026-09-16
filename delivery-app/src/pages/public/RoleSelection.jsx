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
        { icon: Clock, text: 'Live Order Pool & 15-min Alarms' },
        { icon: KeyRound, text: 'Customer Delivery OTP Verification' },
        { icon: Truck, text: 'Tipper & Tractor Fleet Dispatch' }
      ]
    },
    {
      key: 'DRIVER',
      title: 'Driver Console',
      roleLabel: 'Fleet Driver',
      subtitle: 'Fast Driver Login with Live Route & Customer OTP',
      icon: Navigation,
      badge: 'Fleet Transit',
      themeColor: 'cyan',
      bgGradient: 'from-cyan-500/15 via-cyan-500/5 to-slate-900',
      borderClass: 'border-cyan-500/30 hover:border-cyan-400 hover:shadow-cyan-500/20',
      iconBg: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
      badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      btnClass: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25',
      features: [
        { icon: MapPin, text: 'Turn-by-turn Site Navigation' },
        { icon: KeyRound, text: 'Verify 6-digit Customer OTP' },
        { icon: ShieldCheck, text: 'Proof of Delivery Photo Upload' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden select-none">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 max-w-4xl mx-auto w-full pt-4 sm:pt-6 text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-brand-500/30 text-brand-400 text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-500/10">
          <Sparkles className="w-4 h-4 text-brand-400 animate-pulse" />
          Gateway To Gujarat's Construction Fleet
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white font-display tracking-tight">
          ANANTA <span className="text-brand-400">TRADERS</span>
        </h1>

        <p className="text-xs sm:text-sm font-medium text-slate-400 max-w-md mx-auto leading-relaxed">
          Select your operational role below to enter your dedicated material management portal.
        </p>
      </div>

      {/* Role Cards Grid */}
      <div className="relative z-10 max-w-4xl mx-auto w-full py-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <div
              key={role.key}
              onClick={() => handleSelect(role.key)}
              className={`relative overflow-hidden bg-gradient-to-b ${role.bgGradient} backdrop-blur-xl border rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group ${role.borderClass}`}
            >
              <div className="space-y-4">
                {/* Header with icon and role badge */}
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl ${role.iconBg} shadow-inner group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${role.badgeClass}`}>
                    {role.badge}
                  </span>
                </div>

                {/* Role Title & Description */}
                <div>
                  <h3 className="text-xl font-black text-white font-display tracking-tight group-hover:text-brand-300 transition-colors">
                    {role.title}
                  </h3>
                  <div className="text-xs font-bold text-slate-400 mt-0.5">{role.roleLabel}</div>
                  <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">{role.subtitle}</p>
                </div>

                {/* Features List */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                  {role.features.map((feat, idx) => {
                    const FeatIcon = feat.icon;
                    return (
                      <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                        <FeatIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{feat.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Trigger Button */}
              <div className="mt-6 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(role.key);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-black transition-all shadow-lg active:scale-95 ${role.btnClass}`}
                >
                  <span>Enter {role.title.split(' ')[0]}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Quick Help */}
      <div className="relative z-10 max-w-4xl mx-auto w-full pt-4 pb-2 border-t border-slate-900 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>Quality Materials • Reliable Delivery • 100% Genuine Royalty</div>
        <div className="flex items-center gap-4">
          <a href="tel:+919876543210" className="text-slate-400 hover:text-brand-400 transition-colors font-bold">
            Dispatch Helpline: +91 98765 43210
          </a>
        </div>
      </div>
    </div>
  );
}
