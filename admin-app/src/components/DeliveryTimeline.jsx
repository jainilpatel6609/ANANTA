import React from 'react';
import { Check, Clock, Truck, ShieldCheck, XCircle } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function DeliveryTimeline({ order }) {
  if (!order) return null;

  const isTractor =
    order.transportType === 'Tractor' ||
    order.vehicleTypeSnapshot === 'TRACTOR' ||
    Boolean(order.tractorType) ||
    (order.vehicleType && order.vehicleType.toLowerCase().includes('patiya'));

  const steps = [
    {
      id: 'PLACED',
      title: 'Order Confirmed',
      desc: 'Payment captured & order received by regional depot.',
      icon: Clock,
      isCompleted: ['PLACED', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus),
      isActive: order.orderStatus === 'PLACED',
      date: order.createdAt
    },
    {
      id: 'ACCEPTED',
      title: 'Driver & Vehicle Assigned',
      desc: isTractor
        ? 'Assigned tractor driver & dispatched.'
        : 'Assigned driver & compliance slips uploaded.',
      icon: Truck,
      isCompleted: ['ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus),
      isActive: order.orderStatus === 'ACCEPTED',
      date: order.acceptedAt
    },
    {
      id: 'OUT_FOR_DELIVERY',
      title: 'Out for Delivery',
      desc: 'En route to destination site. 6-digit OTP generated.',
      icon: Truck,
      isCompleted: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus),
      isActive: order.orderStatus === 'OUT_FOR_DELIVERY',
      date: order.outForDeliveryAt
    },
    {
      id: 'DELIVERED',
      title: 'Site Handover Verified',
      desc: 'Material unloaded and OTP verified at site.',
      icon: ShieldCheck,
      isCompleted: order.orderStatus === 'DELIVERED',
      isActive: order.orderStatus === 'DELIVERED',
      date: order.deliveryVerifiedAt || order.deliveredAt
    }
  ];

  if (order.orderStatus === 'CANCELLED') {
    return (
      <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/40 text-rose-300 flex items-center gap-3 text-xs">
        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
        <div>
          <span className="font-semibold block">Order Cancelled</span>
          <span className="text-slate-400">This order dispatch has been stopped and marked cancelled.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      {/* Mobile Vertical Flow */}
      <div className="md:hidden space-y-5 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-800">
        {steps.map((step) => {
          const StepIcon = step.icon;
          return (
            <div key={step.id} className="relative flex items-start gap-4 z-10">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all shrink-0 shadow-sm ${
                  step.isCompleted
                    ? 'bg-emerald-700/80 border-emerald-500/60 text-white'
                    : step.isActive
                    ? 'bg-amber-600 border-amber-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                {step.isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : <StepIcon className="w-4 h-4" />}
              </div>

              <div className="pt-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-xs sm:text-sm font-semibold tracking-tight ${
                      step.isCompleted ? 'text-white' : step.isActive ? 'text-amber-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </h4>
                  {step.isActive && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-300 border border-amber-800/40 text-[10px] font-semibold uppercase">
                      In Progress
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Horizontal Stepper */}
      <div className="hidden md:block relative">
        <div className="absolute top-5 left-12 right-12 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
        <div className="flex justify-between items-start">
          {steps.map((step) => {
            const StepIcon = step.icon;
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center text-center w-1/4 px-2">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all shadow-sm mb-3 ${
                    step.isCompleted
                      ? 'bg-emerald-700/80 border-emerald-500/60 text-white'
                      : step.isActive
                      ? 'bg-amber-600 border-amber-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {step.isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : <StepIcon className="w-4 h-4" />}
                </div>

                <h4
                  className={`text-xs font-semibold tracking-tight ${
                    step.isCompleted ? 'text-white' : step.isActive ? 'text-amber-300 font-bold' : 'text-slate-400'
                  }`}
                >
                  {step.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[140px] leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
