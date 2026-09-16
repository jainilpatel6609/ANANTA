import React from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading ANANTA Admin HQ...', skeleton = false }) {
  if (skeleton) {
    return (
      <div className="space-y-4 p-4 sm:p-6 w-full animate-pulse">
        <div className="h-8 w-1/3 bg-slate-800/80 rounded-xl skeleton-shimmer" />
        <div className="h-28 w-full bg-slate-900/90 rounded-2xl border border-slate-800/80 skeleton-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-900/90 rounded-2xl border border-slate-800/80 skeleton-shimmer" />
          <div className="h-24 bg-slate-900/90 rounded-2xl border border-slate-800/80 skeleton-shimmer" />
          <div className="h-24 bg-slate-900/90 rounded-2xl border border-slate-800/80 skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[280px] p-8 text-center">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 animate-pulse">
          <ShieldAlert className="w-7 h-7 text-amber-400 animate-bounce" />
        </div>
        <Loader2 className="w-20 h-20 text-amber-500/30 animate-spin absolute -top-2 -left-2" />
      </div>
      <span className="text-sm font-bold text-slate-200 tracking-wide font-display">{message}</span>
      <span className="text-xs text-slate-500 mt-1 font-medium">Synchronizing back-office operations</span>
    </div>
  );
}
