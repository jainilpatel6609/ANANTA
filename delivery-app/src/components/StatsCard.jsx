import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendDirection = 'up', color = 'brand' }) {
  const colorMap = {
    brand: {
      badge: 'bg-amber-50 border-amber-200 text-amber-600',
      border: 'hover:border-amber-300'
    },
    blue: {
      badge: 'bg-blue-50 border-blue-200 text-blue-600',
      border: 'hover:border-blue-300'
    },
    emerald: {
      badge: 'bg-emerald-50 border-emerald-200 text-emerald-600',
      border: 'hover:border-emerald-300'
    },
    purple: {
      badge: 'bg-indigo-50 border-indigo-200 text-indigo-600',
      border: 'hover:border-indigo-300'
    },
    rose: {
      badge: 'bg-rose-50 border-rose-200 text-rose-600',
      border: 'hover:border-rose-300'
    }
  };

  const currentTheme = colorMap[color] || colorMap.brand;

  return (
    <div className={`relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all duration-150 ${currentTheme.border} group`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            {title}
          </span>
          {Icon && (
            <div className={`p-2.5 rounded-xl border shrink-0 ${currentTheme.badge}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-2.5 flex-wrap">
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight leading-none">
            {value}
          </h3>
          {trend && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              trendDirection === 'down'
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              {trendDirection === 'down' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {trend}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-slate-500 mt-2 font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
