import React from 'react';
import { Volume2, VolumeX, BellRing, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OrderAlarmBanner({
  role = 'DEALER',
  count = 1,
  type = 'NEW_ORDER', // 'NEW_ORDER' | 'DEALER_DECLINED' | 'DEALER_TIMEOUT'
  latestOrder = null,
  isMuted = false,
  onToggleMute = () => {},
  onAcknowledge = null
}) {
  const isDealer = role === 'DEALER';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-4 text-white shadow-2xl animate-pulse border-2 border-red-400">
      {/* Background industrial diagonal stripes effect */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0.08)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.08)_50%,rgba(0,0,0,0.08)_75%,transparent_75%,transparent)] [background-size:24px_24px] pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Icon and Title */}
        <div className="flex items-start md:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white shadow-inner animate-bounce">
            {isDealer ? (
              <BellRing className="w-6 h-6" />
            ) : type === 'DEALER_DECLINED' ? (
              <ShieldAlert className="w-6 h-6 text-yellow-200" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white text-red-700 text-[10px] font-black uppercase tracking-wider shadow-sm">
                {isDealer
                  ? '🚨 URGENT: NEW ORDER ASSIGNED'
                  : type === 'DEALER_DECLINED'
                  ? '🚨 IMMEDIATE ESCALATION: DEALER DECLINED'
                  : '🚨 15-MIN TIMEOUT ESCALATION'}
              </span>
              <span className="text-xs font-bold text-red-100 font-mono">
                {count} {count === 1 ? 'Action Required' : 'Orders Need Attention'}
              </span>
            </div>

            <p className="text-sm font-black text-white mt-1 leading-snug">
              {isDealer ? (
                <>
                  New nearest delivery order assigned to your depot! Respond within 15 minutes.
                  {latestOrder && (
                    <span className="block text-xs font-semibold text-red-100 mt-0.5">
                      Order #{latestOrder.orderNumber} • {latestOrder.productNameSnapshot} • Delivery PIN: {latestOrder.pincode}
                    </span>
                  )}
                </>
              ) : type === 'DEALER_DECLINED' ? (
                <>
                  Dealer declined a customer order! Immediate Admin intervention required.
                  {latestOrder && (
                    <span className="block text-xs font-semibold text-red-100 mt-0.5">
                      Order #{latestOrder.orderNumber} • Declined by: {latestOrder.assignedDealerId?.companyName || latestOrder.assignedDealerId?.name || 'Assigned Dealer'}
                    </span>
                  )}
                </>
              ) : (
                <>
                  Dealer failed to respond within 15 minutes! Reassignment required.
                  {latestOrder && (
                    <span className="block text-xs font-semibold text-red-100 mt-0.5">
                      Order #{latestOrder.orderNumber} • Assigned to: {latestOrder.assignedDealerId?.companyName || latestOrder.assignedDealerId?.name}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Mute/Unmute Audio Button */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              isMuted
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-white text-red-700 hover:bg-red-50'
            }`}
            title={isMuted ? 'Unmute alarm audio' : 'Silence alarm sound'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>Audio Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 animate-ping" />
                <span>Silence Alarm</span>
              </>
            )}
          </button>

          {/* Quick Nav Button */}
          {isDealer ? (
            <Link
              to="/dealer/new-orders"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 text-xs font-black transition-all shadow-lg"
            >
              <span>View & Accept</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            onAcknowledge && latestOrder && (
              <button
                type="button"
                onClick={() => onAcknowledge(latestOrder._id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 text-xs font-black transition-all shadow-lg"
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

