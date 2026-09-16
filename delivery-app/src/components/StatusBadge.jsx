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
  PENDING_PAYMENT: 'bg-amber-50 text-amber-800 border-amber-200/80',
  PAYMENT_FAILED: 'bg-rose-50 text-rose-700 border-rose-200/80',
  PLACED: 'bg-blue-50 text-blue-700 border-blue-200/80',
  DEALER_NOTIFIED: 'bg-orange-50 text-orange-800 border-orange-200/80',
  ACCEPTED: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  OUT_FOR_DELIVERY: 'bg-amber-50 text-amber-900 border-amber-300 font-semibold',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200'
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
