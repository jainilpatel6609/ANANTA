import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Store,
  Send,
  ArrowRight,
  Sparkles
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
      titleWhite: 'Customer',
      titleColor: 'Portal',
      icon: User,
      ringClass: 'border-emerald-400/70',
      glowClass: 'bg-emerald-500',
      glowShadow: 'shadow-[0_0_55px_-8px_rgba(16,185,129,0.65)]',
      iconGradient: 'from-emerald-300 to-emerald-600',
      textColorClass: 'text-emerald-400',
      arrowClass: 'border-emerald-400/70 text-emerald-400'
    },
    {
      key: 'DEALER',
      titleWhite: 'Dealer',
      titleColor: 'Portal',
      icon: Store,
      ringClass: 'border-amber-400/70',
      glowClass: 'bg-amber-500',
      glowShadow: 'shadow-[0_0_55px_-8px_rgba(245,158,11,0.65)]',
      iconGradient: 'from-amber-300 to-amber-600',
      textColorClass: 'text-amber-400',
      arrowClass: 'border-amber-400/70 text-amber-400'
    },
    {
      key: 'DRIVER',
      titleWhite: 'Driver',
      titleColor: 'Portal',
      icon: Send,
      ringClass: 'border-blue-400/70',
      glowClass: 'bg-blue-500',
      glowShadow: 'shadow-[0_0_55px_-8px_rgba(59,130,246,0.65)]',
      iconGradient: 'from-blue-300 to-blue-600',
      textColorClass: 'text-blue-400',
      arrowClass: 'border-blue-400/70 text-blue-400'
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

      {/* Glowing Role Circles */}
      <div className="relative z-10 max-w-sm sm:max-w-3xl mx-auto w-full py-10 flex flex-col sm:flex-row items-center justify-center gap-12 sm:gap-10">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <button
              key={role.key}
              type="button"
              onClick={() => handleSelect(role.key)}
              className="relative flex flex-col items-center justify-center group"
            >
              {/* Ambient glow bloom behind the ring */}
              <div
                className={`absolute inset-0 m-auto w-44 h-44 sm:w-48 sm:h-48 rounded-full ${role.glowClass} opacity-20 blur-3xl transition-opacity group-hover:opacity-30 pointer-events-none`}
              />

              {/* Outer glowing ring */}
              <div
                className={`relative w-52 h-52 sm:w-56 sm:h-56 rounded-full border-2 ${role.ringClass} ${role.glowShadow} bg-slate-950/60 flex flex-col items-center justify-center gap-3 transition-transform duration-300 group-hover:scale-[1.04] group-active:scale-[0.97]`}
              >
                {/* Icon bubble */}
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${role.iconGradient} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-8 h-8 text-white" strokeWidth={2.2} />
                </div>

                {/* Title */}
                <div className="text-base sm:text-lg font-black tracking-tight">
                  <span className="text-white">{role.titleWhite}</span>{' '}
                  <span className={role.textColorClass}>{role.titleColor}</span>
                </div>

                {/* Arrow trigger */}
                <span className={`w-7 h-7 rounded-full border flex items-center justify-center ${role.arrowClass}`}>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
              </div>
            </button>
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
