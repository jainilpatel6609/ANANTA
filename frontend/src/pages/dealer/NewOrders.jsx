import React, { useState, useEffect } from 'react';
import { orderService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import OrderAlarmBanner from '../../components/OrderAlarmBanner';
import NotificationPermissionPrompt from '../../components/NotificationPermissionPrompt';
import Modal from '../../components/Modal';
import { useAlarm } from '../../hooks/useAlarm';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  MapPin,
  Truck,
  Scale,
  Calendar,
  AlertCircle,
  Loader2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);
  const [now, setNow] = useState(Date.now());

  const { isAlarming, isMuted, triggerAlarm, clearAlarm, toggleMute } = useAlarm();

  // Tick for countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadOrders = async () => {
    try {
      const res = await orderService.getDealerAvailable();
      if (res.data?.orders) {
        const orderList = res.data.orders;
        setOrders(orderList);

        // Check if any order is assigned specifically to this dealer and has active alarm / pending response
        const hasUrgentOrder = orderList.some(
          (o) => o.dealerAlarmActive || (o.dealerResponseStatus === 'PENDING' && o.assignedDealerId)
        );

        if (hasUrgentOrder) {
          triggerAlarm('DEALER');
        } else {
          clearAlarm();
        }
      }
    } catch (err) {
      console.warn('Failed to load available orders:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 8000); // Polling every 8s
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (orderId) => {
    setAcceptingId(orderId);
    try {
      await orderService.acceptOrder(orderId);
      clearAlarm(); // Stop Dealer Alarm
      toast.success('Order accepted successfully! You can now assign driver and royalty documents.');
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (err) {
      toast.error(err.message || 'Could not accept order (already claimed or reassigned)');
      loadOrders();
    } finally {
      setAcceptingId(null);
    }
  };

  const openRejectModal = (order) => {
    setRejectingOrder(order);
    setRejectReason('');
  };

  const handleConfirmDecline = async (e) => {
    e.preventDefault();
    if (!rejectingOrder) return;

    setSubmittingReject(true);
    try {
      await orderService.declineOrder(rejectingOrder._id, rejectReason || 'Depot capacity full / Unavailable');
      clearAlarm(); // Stop Dealer Alarm
      toast.success('Order declined. Super Admin has been immediately alerted for dispatch re-routing.');
      setOrders((prev) => prev.filter((o) => o._id !== rejectingOrder._id));
      setRejectingOrder(null);
    } catch (err) {
      toast.error(err.message || 'Failed to decline order');
    } finally {
      setSubmittingReject(false);
    }
  };

  // Helper: calculate remaining seconds from 15-min SLA deadline
  const getRemainingTime = (order) => {
    if (!order.dealerResponseDeadline && !order.orderAssignedAt) return null;
    const deadlineMs = order.dealerResponseDeadline
      ? new Date(order.dealerResponseDeadline).getTime()
      : new Date(order.orderAssignedAt).getTime() + 15 * 60 * 1000;

    const diffSec = Math.max(0, Math.floor((deadlineMs - now) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return {
      diffSec,
      formatted: `${mins}:${secs < 10 ? '0' : ''}${secs}`,
      isExpired: diffSec === 0
    };
  };

  if (loading) {
    return <LoadingSpinner message="Scanning nearest available delivery dispatches..." />;
  }

  const assignedOrders = orders.filter((o) => o.dealerAlarmActive || o.assignedDealerId);

  return (
    <div className="space-y-6">
      {/* Mobile Device Push Permission Prompt */}
      <NotificationPermissionPrompt role="DEALER" />

      {/* 1. Alarm Banner when urgent orders exist */}
      {assignedOrders.length > 0 && (
        <OrderAlarmBanner
          role="DEALER"
          count={assignedOrders.length}
          type="NEW_ORDER"
          latestOrder={assignedOrders[0]}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">New Available Orders</h1>
          <p className="text-xs text-slate-400">
            Open pool of confirmed customer orders. Nearest depot assignments include a mandatory 15-minute response SLA.
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-brand-400 border border-slate-800"
        >
          Refresh Pool
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No available orders in pool"
          description="All incoming customer orders are currently assigned. New dispatches will automatically trigger your alarm in real-time."
          icon={Inbox}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {orders.map((order) => {
            const timeInfo = getRemainingTime(order);
            const isAssignedToMe = !!order.assignedDealerId;

            return (
              <div
                key={order._id}
                className={`bg-slate-900 border rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl transition-all ${
                  isAssignedToMe
                    ? 'border-amber-500/50 bg-gradient-to-b from-slate-900 to-slate-950 shadow-amber-500/5'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black font-mono text-white">#{order.orderNumber}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Payment Verified & Placed
                    </span>
                    {isAssignedToMe && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 uppercase tracking-wider animate-pulse">
                        ⭐ Nearest Assigned Depot
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Live 15-Minute Response SLA Countdown */}
                    {timeInfo && (
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black ${
                          timeInfo.diffSec <= 180
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-ping'
                            : timeInfo.diffSec <= 600
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {timeInfo.isExpired ? '15-Min SLA Expired' : `SLA: ${timeInfo.formatted} left`}
                        </span>
                      </div>
                    )}

                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(order.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Order Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">
                      Material Specification
                    </span>
                    <div className="text-base font-bold text-white">{order.productNameSnapshot}</div>
                    <div className="text-brand-400 font-semibold">
                      {order.category}{' '}
                      {order.sandLocation ? `• Origin: ${order.sandLocation}` : ''}
                      {order.aggregateType ? `• Grade: ${order.aggregateType}` : ''}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">
                      Required Tractors
                    </span>
                    <div className="text-base font-bold text-brand-400 font-mono">{formatOrderQuantity(order)}</div>
                    <div className="text-slate-300 font-medium">{formatOrderTransport(order)}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">
                      Order Value (Paid)
                    </span>
                    <div className="text-base font-bold text-white font-mono">{formatINR(order.totalAmount)}</div>
                    <div className="text-slate-400 text-[11px]">Direct Razorpay Settlement</div>
                  </div>
                </div>

                {/* Shipping Drop-off & Nearest Dealer Distance */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <MapPin className="w-3.5 h-3.5 text-brand-400" />
                      Site Delivery Destination
                    </div>
                    <div className="flex items-center gap-2">
                      {order.pincode && (
                        <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 font-mono font-bold text-[10px] border border-brand-500/20">
                          PIN: {order.pincode}
                        </span>
                      )}
                      {typeof order.distanceToDealer === 'number' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/20">
                          📍 ~{order.distanceToDealer} km from your depot
                        </span>
                      ) : typeof order.dealerDistanceKm === 'number' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/20">
                          📍 ~{order.dealerDistanceKm} km from your depot
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-slate-200 font-medium">{order.shippingAddress}</div>
                  {order.shippingDetails?.fullName && (
                    <div className="text-slate-400 text-[11px]">
                      Recipient: <span className="text-white font-medium">{order.shippingDetails.fullName}</span>
                      {order.shippingDetails.mobile && (
                        <span className="font-mono text-slate-300 ml-2">({order.shippingDetails.mobile})</span>
                      )}
                    </div>
                  )}
                  {order.deliveryInstructions && (
                    <div className="text-brand-400 italic text-[11px]">
                      Instructions: "{order.deliveryInstructions}"
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => openRejectModal(order)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-300 text-xs font-bold transition-all"
                  >
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Decline Order</span>
                  </button>

                  <button
                    type="button"
                    disabled={acceptingId === order._id}
                    onClick={() => handleAccept(order._id)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    {acceptingId === order._id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Locking Order...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Accept Order & Claim Dispatch
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decline Confirmation Modal */}
      {rejectingOrder && (
        <Modal
          isOpen={!!rejectingOrder}
          onClose={() => setRejectingOrder(null)}
          title="Decline Customer Order"
        >
          <form onSubmit={handleConfirmDecline} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Immediate Super Admin Alert Notice
              </div>
              <p className="text-[11px] text-slate-300">
                Declining this order will immediately notify the Super Admin and re-route the delivery to the next nearest regional depot.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Reason for Declining (Optional):
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Depot aggregate stock currently depleted, tractors booked on prior dispatch, etc."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Keep in Pool
              </button>
              <button
                type="submit"
                disabled={submittingReject}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30"
              >
                {submittingReject ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Declining...
                  </>
                ) : (
                  'Confirm Decline & Alert Admin'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
