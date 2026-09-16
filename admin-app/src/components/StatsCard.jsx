import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendDirection = 'up', color = 'brand' }) {
  const colorMap = {
    brand: {
      badge: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
      border: 'hover:border-amber-500/30'
    },
    blue: {
      badge: 'bg-blue-500/10 border-blue-500/25 text-blue-300',
      border: 'hover:border-blue-500/30'
    },
    emerald: {
      badge: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
      border: 'hover:border-emerald-500/30'
    },
    purple: {
      badge: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300',
      border: 'hover:border-indigo-500/30'
    },
    rose: {
      badge: 'bg-rose-500/10 border-rose-500/25 text-rose-300',
      border: 'hover:border-rose-500/30'
    }
  };

  const currentTheme = colorMap[color] || colorMap.brand;

  return (
    <div className={`relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-classic transition-all duration-150 ${currentTheme.border} group`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
            {title}
          </span>
          {Icon && (
            <div className={`p-2.5 rounded-xl border shrink-0 ${currentTheme.badge}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-2.5 flex-wrap">
          <h3 className="text-2xl sm:text-3xl font-bold text-white font-display tracking-tight leading-none">
            {value}
          </h3>
          {trend && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              trendDirection === 'down'
                ? 'bg-rose-950/30 text-rose-300 border-rose-800/40'
                : 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40'
            }`}>
              {trendDirection === 'down' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {trend}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-slate-400 mt-2 font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
