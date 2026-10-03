import React, { useState, useEffect } from 'react';
import { orderService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatINR, formatDate } from '../../utils/formatters';
import { Ban, Wallet, CheckCircle2, Clock, Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const resolutionBadge = (order) => {
  if (order.refundStatus === 'PROCESSED') {
    return { label: 'Refund Processed', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
  }
  if (order.refundStatus === 'REQUESTED') {
    return { label: 'Refund Requested', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
  }
  if (order.awaitingCustomerDealerChoice) {
    return { label: 'Awaiting Customer', className: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
  }
  if (order.assignedDealerId) {
    return { label: 'New Dealer Selected', className: 'bg-sky-500/10 text-sky-400 border-sky-500/30' };
  }
  return { label: 'Resolved', className: 'bg-slate-700/40 text-slate-400 border-slate-600/50' };
};

export default function DealerCancelledOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const loadOrders = async () => {
    try {
      const res = await orderService.getDealerCancelledOrders();
      if (res.data?.orders) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      toast.error('Failed to load dealer-cancelled orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleMarkProcessed = async (orderId) => {
    setProcessingId(orderId);
    try {
      const res = await orderService.markRefundProcessed(orderId);
      if (res.data?.order) {
        setOrders((prev) => prev.map((o) => (o._id === orderId ? res.data.order : o)));
        toast.success('Refund marked as processed.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update refund status.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dealer-cancelled orders..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-display">Dealer Cancelled Orders</h1>
        <p className="text-xs text-slate-400">
          Every order a dealer has declined, with their reason and how the customer resolved it.
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Ban}
          title="No dealer-cancelled orders"
          description="Orders declined by a dealer will appear here along with their reason."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {orders.map((order) => {
            const badge = resolutionBadge(order);
            return (
              <div key={order._id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-white text-sm">#{order.orderNumber}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Declined {formatDate(order.dealerRejectedAt)}
                    </p>
                  </div>
                  <span className="text-sm font-black font-mono text-amber-400">{formatINR(order.totalAmount)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider">Customer</span>
                    <div className="text-white font-bold">{order.userId?.name || 'N/A'}</div>
                    <div className="text-slate-400 font-mono">{order.userId?.mobile}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider">Declined By Dealer</span>
                    <div className="text-white font-bold">
                      {order.dealerRejectedBy?.companyName || order.dealerRejectedBy?.name || 'N/A'}
                    </div>
                    <div className="text-slate-400 font-mono">{order.dealerRejectedBy?.mobile}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider">Reason</span>
                    <div className="text-rose-300 font-medium">
                      "{order.dealerRejectionReason || 'No reason provided'}"
                    </div>
                  </div>
                </div>

                {order.assignedDealerId && !order.awaitingCustomerDealerChoice && order.refundStatus === 'NONE' && (
                  <div className="flex items-center gap-2 text-xs text-sky-300 bg-sky-500/5 border border-sky-500/20 rounded-xl p-3">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>
                      Customer selected a new dealer:{' '}
                      <strong>{order.assignedDealerId.companyName || order.assignedDealerId.name}</strong>
                    </span>
                  </div>
                )}

                {order.refundStatus === 'REQUESTED' && (
                  <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-xs text-amber-300">
                      <Wallet className="w-4 h-4 shrink-0" />
                      <span>Customer requested a refund of {formatINR(order.totalAmount)}.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMarkProcessed(order._id)}
                      disabled={processingId === order._id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50"
                    >
                      {processingId === order._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Mark Refund Processed</span>
                    </button>
                  </div>
                )}

                {order.refundStatus === 'PROCESSED' && (
                  <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Refund of {formatINR(order.totalAmount)} processed {formatDate(order.refundProcessedAt)}.</span>
                  </div>
                )}

                {order.awaitingCustomerDealerChoice && (
                  <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Waiting for the customer to pick a new dealer or request a refund.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
