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
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
      <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-400 mb-4">
        <Icon className="w-8 h-8 text-brand-500" />
      </div>
      <h4 className="text-base font-bold text-slate-200">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mt-1">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold transition-colors shadow-md shadow-brand-500/10"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
