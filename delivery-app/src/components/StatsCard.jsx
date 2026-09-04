import React from 'react';

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'brand' }) {
  const colorMap = {
    brand: 'bg-brand-500/10 border-brand-500/20 text-brand-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400'
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${colorMap[color] || colorMap.brand}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-display">{value}</h3>
        {trend && <span className="text-xs text-emerald-400 font-medium">{trend}</span>}
      </div>

      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}
