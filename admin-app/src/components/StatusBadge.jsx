import React from 'react';
import { ORDER_STATUS_CONFIG } from '../utils/constants';
import { CheckCircle2, Clock, Truck, Package, XCircle, AlertCircle } from 'lucide-react';

const ICONS = {
  PENDING_PAYMENT: AlertCircle,
  PAYMENT_FAILED: XCircle,
  PLACED: Package,
  DEALER_NOTIFIED: Clock,
  ACCEPTED: CheckCircle2,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle2,
  CANCELLED: XCircle
};

const PILL_STYLES = {
  PENDING_PAYMENT: 'bg-amber-950/30 text-amber-300 border-amber-800/40',
  PAYMENT_FAILED: 'bg-rose-950/30 text-rose-300 border-rose-800/40',
  PLACED: 'bg-blue-950/30 text-blue-300 border-blue-800/40',
  DEALER_NOTIFIED: 'bg-amber-950/30 text-amber-300 border-amber-800/40',
  ACCEPTED: 'bg-indigo-950/30 text-indigo-300 border-indigo-800/40',
  OUT_FOR_DELIVERY: 'bg-amber-950/40 text-amber-200 border-amber-700/50',
  DELIVERED: 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40',
  CANCELLED: 'bg-slate-900 text-slate-400 border-slate-800'
};

export default function StatusBadge({ status, size = 'md' }) {
  const config = ORDER_STATUS_CONFIG[status] || {
    label: status,
    color: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  const IconComponent = ICONS[status] || Clock;
  const pillColor = PILL_STYLES[status] || config.color;

  const sizeClasses = size === 'sm' 
    ? 'px-2.5 py-0.5 text-[11px] gap-1' 
    : 'px-3 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border transition-all duration-150 tracking-wide ${sizeClasses} ${pillColor}`}
    >
      <IconComponent className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span>{config.label}</span>
    </span>
  );
}
