import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading ANANTA TRADERS...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
      <Loader2 className="w-9 h-9 text-brand-500 animate-spin mb-3" />
      <span className="text-sm font-medium text-slate-400 tracking-wide">{message}</span>
    </div>
  );
}
