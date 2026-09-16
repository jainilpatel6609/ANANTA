import React from 'react';
import { Volume2, VolumeX, BellRing, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OrderAlarmBanner({
  role = 'DEALER',
  count = 1,
  type = 'NEW_ORDER',
  latestOrder = null,
  isMuted = false,
  onToggleMute = () => {},
  onAcknowledge = null
}) {
  const isDealer = role === 'DEALER';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-red-500/40 p-4 sm:p-5 text-white shadow-classic my-3">
      {/* Subtle red tint glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-red-500/80" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side Info */}
        <div className="flex items-start gap-3.5 flex-1">
          <div className="p-2.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 shrink-0">
            {isDealer ? (
              <BellRing className="w-5 h-5" />
            ) : type === 'DEALER_DECLINED' ? (
              <ShieldAlert className="w-5 h-5 text-red-400" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[11px] font-semibold border border-red-500/30 uppercase tracking-wide">
                {isDealer
                  ? 'New Order Dispatch'
                  : type === 'DEALER_DECLINED'
                  ? 'Dealer Declined'
                  : 'Response Timeout'}
              </span>
              <span className="text-xs font-medium text-slate-400 font-mono">
                {count} {count === 1 ? 'Action Required' : 'Orders Need Attention'}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-snug">
              {isDealer ? (
                <>
                  New nearest delivery order assigned to your depot. Please respond within 15 minutes.
                  {latestOrder && (
                    <span className="block text-[11px] font-normal text-slate-400 mt-0.5 truncate">
                      #{latestOrder.orderNumber} • {latestOrder.productNameSnapshot} • PIN: {latestOrder.pincode}
                    </span>
                  )}
                </>
              ) : type === 'DEALER_DECLINED' ? (
                <>
                  A dealer has declined a customer order. Immediate re-routing required.
                  {latestOrder && (
                    <span className="block text-[11px] font-normal text-slate-400 mt-0.5 truncate">
                      #{latestOrder.orderNumber} • Declined by: {latestOrder.assignedDealerId?.companyName || latestOrder.assignedDealerId?.name || 'Assigned Dealer'}
                    </span>
                  )}
                </>
              ) : (
                <>
                  Dealer failed to respond within 15 minutes. Dispatch reassignment needed.
                  {latestOrder && (
                    <span className="block text-[11px] font-normal text-slate-400 mt-0.5 truncate">
                      #{latestOrder.orderNumber} • Assigned to: {latestOrder.assignedDealerId?.companyName || latestOrder.assignedDealerId?.name}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Side Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
          <button
            type="button"
            onClick={onToggleMute}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 border ${
              isMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                : 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25'
            }`}
            title={isMuted ? 'Unmute alarm audio' : 'Silence alarm sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'Muted' : 'Silence'}</span>
          </button>

          {isDealer ? (
            <Link
              to="/dealer/new-orders"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 min-h-[38px]"
            >
              <span>Review Order</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            onAcknowledge && latestOrder && (
              <button
                type="button"
                onClick={() => onAcknowledge(latestOrder._id)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 min-h-[38px]"
              >
                <span>Acknowledge</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
