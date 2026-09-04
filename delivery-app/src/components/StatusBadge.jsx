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

export default function StatusBadge({ status }) {
  const config = ORDER_STATUS_CONFIG[status] || {
    label: status,
    color: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  const IconComponent = ICONS[status] || Clock;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}
    >
      <IconComponent className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
