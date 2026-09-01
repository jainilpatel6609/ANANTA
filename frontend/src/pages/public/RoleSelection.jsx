import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, ShieldCheck, UserCheck, HardHat, ArrowRight, ShieldAlert, Sparkles, Building2, Warehouse } from 'lucide-react';

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
      key: 'ADMIN',
      title: 'Super Admin',
      badge: 'Executive Root',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: ShieldAlert,
      iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      description:
        'System governance, platform security, dealer management, pricing controls, and company reports.',
      highlight: 'Requires authorized Super Admin credentials & Secret Key for registration.',
      borderColor: 'hover:border-amber-500/60 hover:shadow-amber-500/10',
      buttonBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
    },
    {
      key: 'DEALER',
      title: 'Dealer',
      badge: 'Authorized Depot',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: Warehouse,
      iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      description:
        'Regional material depot, nearest PIN delivery dispatch, order fulfillment, and delivery fleet tracking.',
      highlight: 'Mandatory 6-digit Indian PIN depot registration with GPS radius routing.',
      borderColor: 'hover:border-blue-500/60 hover:shadow-blue-500/10',
      buttonBg: 'bg-blue-500 hover:bg-blue-400 text-slate-950 shadow-blue-500/20'
    },
    {
      key: 'USER',
      title: 'Customer',
      badge: 'Builder & Contractor',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: HardHat,
      iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      description:
        'Contractor, builder, and individual material procurement for river sand, aggregate, grit, and rubble stone.',
      highlight: 'Direct riverbed delivery, transparent ton pricing, and live weighbridge slips.',
      borderColor: 'hover:border-emerald-500/60 hover:shadow-emerald-500/10',
      buttonBg: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
    }
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl space-y-10">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center text-slate-950 font-black mx-auto shadow-xl shadow-brand-500/20">
            <Truck className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            Direct Riverbed & Quarry Supply Network
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-display tracking-tight">
            Welcome to ANANTA <span className="text-brand-400">TRADERS</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto font-medium">
            Please select your role to proceed to the dedicated portal
          </p>
        </div>

        {/* 3 Exactly Displayed Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.key}
                onClick={() => handleSelect(role.key)}
                className={`group relative bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 cursor-pointer shadow-2xl ${role.borderColor}`}
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${role.iconBg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${role.badgeColor}`}>
                      {role.badge}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-white font-display group-hover:text-brand-400 transition-colors">
                      {role.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {role.description}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-300 leading-snug">
                    <span className="font-semibold text-slate-200">Notice: </span>
                    {role.highlight}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(role.key);
                    }}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${role.buttonBg}`}
                  >
                    Enter as {role.title}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Tagline */}
        <div className="text-center text-xs text-slate-500">
          ANANTA TRADERS &bull; Quality Materials. Reliable Delivery. &bull; 100% Certified Royalty Slips
        </div>
      </div>
    </div>
  );
}

