import React from 'react';
import { Check, Clock, Truck, ShieldCheck, FileCheck, Package } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function DeliveryTimeline({ order }) {
  if (!order) return null;

  const steps = [
    {
      id: 'placed',
      title: 'Order Placed & Paid',
      desc: order.createdAt ? formatDate(order.createdAt) : 'Awaiting payment',
      isCompleted: ['PLACED', 'DEALER_NOTIFIED', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus),
      isActive: order.orderStatus === 'PLACED',
      icon: Package
    },
    {
      id: 'accepted',
      title: 'Dealer Accepted',
      desc: order.acceptedAt ? formatDate(order.acceptedAt) : 'Pending dealer pickup',
      isCompleted: ['ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus),
      isActive: order.orderStatus === 'ACCEPTED',
      icon: Clock
    },
    {
      id: 'dispatched',
      title: 'Dispatched & En Route',
      desc: order.outForDeliveryAt ? formatDate(order.outForDeliveryAt) : 'Royalty & Weighbridge attached',
      isCompleted: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus),
      isActive: order.orderStatus === 'OUT_FOR_DELIVERY',
      icon: Truck
    },
    {
      id: 'delivered',
      title: 'Delivered & OTP Verified',
      desc: order.deliveredAt ? formatDate(order.deliveredAt) : '6-digit OTP verification',
      isCompleted: order.orderStatus === 'DELIVERED',
      isActive: order.orderStatus === 'DELIVERED',
      icon: ShieldCheck
    }
  ];

  if (order.orderStatus === 'CANCELLED') {
    return (
      <div className="p-4 bg-rose-950/40 border border-rose-800/40 rounded-xl text-rose-300 text-sm flex items-center gap-3">
        <span className="p-2 rounded-lg bg-rose-900/60 font-bold">CANCELLED</span>
        <span>This order has been cancelled. If any refund is due, it will be credited within 3-5 banking days.</span>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0">
        {/* Connecting line for desktop */}
        <div className="hidden md:block absolute top-1/2 left-8 right-8 h-1 bg-slate-800 -translate-y-1/2 z-0" />

        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          return (
            <div key={step.id} className="relative z-10 flex md:flex-col items-center gap-3 md:text-center w-full md:w-1/4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                  step.isCompleted
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/40'
                    : step.isActive
                    ? 'bg-brand-500 border-brand-300 text-slate-950 animate-pulse'
                    : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                {step.isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : <StepIcon className="w-5 h-5" />}
              </div>

              <div>
                <h4
                  className={`text-sm font-semibold ${
                    step.isCompleted ? 'text-slate-100' : step.isActive ? 'text-brand-400' : 'text-slate-500'
                  }`}
                >
                  {step.title}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 max-w-[160px] md:mx-auto">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
