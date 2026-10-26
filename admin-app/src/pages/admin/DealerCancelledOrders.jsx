import React, { useState, useEffect } from 'react';
import { orderService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatINR, formatDate, formatShortDate, formatOrderQuantity, formatOrderTransport, isTractorOrder } from '../../utils/formatters';
import { Ban, Wallet, CheckCircle2, Clock, Building2, Loader2, ChevronDown, Filter, Package, Truck, Calendar } from 'lucide-react';
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

// Orders cancelled before this field existed have no dealerCancellationType on record -- they
// were all explicit declines (the 15-minute auto-timeout auto-cancel behavior is new), so that's
// the safe fallback for them.
const cancellationTypeBadge = (order) => {
  if (order.dealerCancellationType === 'AUTO_TIMEOUT') {
    return { label: 'Auto Cancel', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
  }
  return { label: 'Dealer Cancelled', className: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
};

export default function DealerCancelledOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [typeFilter, setTypeFilter] = useState('ALL');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await orderService.getDealerCancelledOrders({
        type: typeFilter !== 'ALL' ? typeFilter : undefined
      });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

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

  const clearFilters = () => {
    setTypeFilter('ALL');
  };

  const hasActiveFilters = typeFilter !== 'ALL';

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-display">Dealer Cancelled Orders</h1>
        <p className="text-xs text-slate-400">
          Every order a dealer declined or never responded to within 15 minutes, with the reason and how the customer resolved it.
        </p>
      </div>

      {/* Filter bar -- cancellation type */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 sm:mb-0 sm:mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="app-select px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All</option>
            <option value="DEALER_DECLINED">Dealer Cancelled</option>
            <option value="AUTO_TIMEOUT">Auto Cancel</option>
          </select>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading dealer-cancelled orders..." />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Ban}
          title="No dealer-cancelled orders"
          description={hasActiveFilters ? 'No orders match these filters.' : 'Orders declined or auto-cancelled will appear here along with the reason.'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {orders.map((order) => {
            const badge = resolutionBadge(order);
            const typeBadge = cancellationTypeBadge(order);
            const isExpanded = expandedId === order._id;

            return (
              <div key={order._id} className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
                {/* Collapsed row -- order number + key info, click to expand full details */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : order._id)}
                  className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
                    <span className="font-mono font-black text-white text-sm">#{order.orderNumber}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${typeBadge.className}`}>
                      {typeBadge.label}
                    </span>
                    <span className={`hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="text-[11px] text-slate-500">{formatDate(order.dealerRejectedAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black font-mono text-amber-400">{formatINR(order.totalAmount)}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-3.5 border-t border-slate-800/80 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                        <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider">Customer</span>
                        <div className="text-white font-bold">{order.userId?.name || 'N/A'}</div>
                        <div className="text-slate-400 font-mono">{order.userId?.mobile}</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                        <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider">
                          {order.dealerCancellationType === 'AUTO_TIMEOUT' ? 'Assigned Dealer (No Response)' : 'Declined By Dealer'}
                        </span>
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
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                        <span className="text-slate-500 flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider">
                          <Package className="w-3 h-3" /> Material
                        </span>
                        <div className="text-white font-bold">{order.productNameSnapshot || order.category || 'N/A'}</div>
                        <div className="text-slate-400">
                          {order.sandLocation ? `Origin: ${order.sandLocation}` : ''}
                          {order.aggregateType ? `Grade: ${order.aggregateType}` : ''}
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                        <span className="text-slate-500 flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider">
                          <Truck className="w-3 h-3" /> {isTractorOrder(order) ? 'Tractor' : 'Wheels'}
                        </span>
                        <div className="text-white font-bold">
                          {isTractorOrder(order)
                            ? formatOrderQuantity(order)
                            : order.wheelCountSnapshot
                            ? `${order.wheelCountSnapshot} Wheel Dumper`
                            : order.vehicleType || 'N/A'}
                        </div>
                        <div className="text-slate-400">{formatOrderTransport(order)}</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                        <span className="text-slate-500 flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider">
                          <Calendar className="w-3 h-3" /> Delivery Date
                        </span>
                        <div className="text-white font-bold">
                          {order.deliveryDate ? formatShortDate(order.deliveryDate) : 'Not scheduled'}
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
