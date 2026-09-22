import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no items matching your criteria at this moment.',
  actionText,
  onAction,
  icon: Icon = PackageOpen
}) {
  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-slate-900/60 backdrop-blur-md border border-slate-800/90 rounded-3xl shadow-lg my-4">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-brand-400 mb-4 shadow-inner shadow-black/40">
          <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-brand-400" />
        </div>
        <h4 className="text-base sm:text-lg font-black text-white font-display tracking-tight">{title}</h4>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1.5 font-medium leading-relaxed">{description}</p>
        
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-6 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all shadow-lg shadow-slate-900/25 active:scale-95"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
}
