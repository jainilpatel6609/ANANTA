import React, { useState, useEffect } from 'react';
import { orderService, driverService } from '../../services';
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
  AlertTriangle,
  User,
  Phone,
  Zap,
  Navigation,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewOrders() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Accept & Assign Driver Modal State
  const [acceptingOrder, setAcceptingOrder] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);

  // Decline Modal State
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

  const loadData = async () => {
    try {
      const [ordersRes, driversRes] = await Promise.all([
        orderService.getDealerAvailable(),
        driverService.getDrivers().catch(() => ({ data: { drivers: [] } }))
      ]);

      if (ordersRes.data?.orders) {
        const orderList = ordersRes.data.orders;
        setOrders(orderList);

        const hasUrgentOrder = orderList.some(
          (o) => o.dealerAlarmActive || (o.dealerResponseStatus === 'PENDING' && o.assignedDealerId)
        );

        if (hasUrgentOrder) {
          triggerAlarm('DEALER');
        } else {
          clearAlarm();
        }
      }

      if (driversRes.data?.drivers) {
        setDrivers(driversRes.data.drivers);
      }
    } catch (err) {
      console.warn('Failed to load available orders:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000); // Polling every 8s
    return () => clearInterval(interval);
  }, []);

  // Open Accept & Assign Driver Modal
  const openAcceptModal = (order) => {
    setAcceptingOrder(order);
    setSelectedDriverId('');
    setDriverName('');
    setDriverMobile('');
    setVehicleNumber('');
  };

  // Handle Driver Select Dropdown
  const handleDriverSelect = (e) => {
    const dId = e.target.value;
    setSelectedDriverId(dId);

    if (!dId) {
      setDriverName('');
      setDriverMobile('');
      setVehicleNumber('');
      return;
    }

    const matched = drivers.find((d) => d._id === dId);
    if (matched) {
      setDriverName(matched.name);
      setDriverMobile(matched.mobile);
      setVehicleNumber(matched.vehicleNumber);
      toast.success(`Selected driver: ${matched.name} (${matched.vehicleNumber})`);
    }
  };

  // Submit Accept (with or without driver)
  const handleConfirmAccept = async (e, withDriver = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!acceptingOrder) return;

    let payload = {};

    if (withDriver) {
      if (!driverName.trim() || !driverMobile.trim() || !vehicleNumber.trim()) {
        toast.error('Driver name, 10-digit mobile, and vehicle plate number are required.');
        return;
      }

      const cleanMobile = driverMobile.replace(/\D/g, '').slice(-10);
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        toast.error('Please enter a valid 10-digit Indian mobile number for driver.');
        return;
      }

      payload = {
        driverId: selectedDriverId || undefined,
        driverName: driverName.trim(),
        driverMobile: cleanMobile,
        vehicleNumber: vehicleNumber.trim().toUpperCase()
      };
    }

    setIsSubmittingAccept(true);
    try {
      const res = await orderService.acceptOrder(acceptingOrder._id, payload);
      clearAlarm();

      if (withDriver) {
        toast.success(
          `✓ Order #${acceptingOrder.orderNumber} accepted & Driver ${driverName} assigned! Google Maps link sent to driver.`
        );
      } else {
        toast.success(`✓ Order #${acceptingOrder.orderNumber} accepted! You can assign a driver anytime from Accepted Orders.`);
      }

      setOrders((prev) => prev.filter((o) => o._id !== acceptingOrder._id));
      setAcceptingOrder(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not accept order.');
      loadData();
    } finally {
      setIsSubmittingAccept(false);
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
      clearAlarm();
      toast.success('Order declined. Super Admin has been immediately alerted for dispatch re-routing.');
      setOrders((prev) => prev.filter((o) => o._id !== rejectingOrder._id));
      setRejectingOrder(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to decline order');
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
      isExpired: diffSec === 0,
      formatted: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    };
  };

  if (loading) {
    return <LoadingSpinner message="Loading incoming customer orders..." />;
  }

  return (
    <div className="space-y-6">
      {/* Browser Notification Permissions Banner */}
      <NotificationPermissionPrompt />

      {/* Real-time Order Alarm Banner */}
      {isAlarming && (
        <OrderAlarmBanner
          title="⚠️ Urgent Dispatch Alert: Incoming Customer Order Assigned!"
          message="An order has been routed to your depot based on geographic proximity. A mandatory 15-minute response SLA is running."
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onDismiss={clearAlarm}
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
          onClick={loadData}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-brand-400 border border-slate-800 cursor-pointer"
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
                      Required Tractors / Quantity
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
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Decline Order</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openAcceptModal(order)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-brand-500/20 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept Order & Claim Dispatch</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ACCEPT & ASSIGN DRIVER MODAL ================= */}
      {acceptingOrder && (
        <Modal
          isOpen={!!acceptingOrder}
          onClose={() => setAcceptingOrder(null)}
          title={`Accept & Claim Dispatch: Order #${acceptingOrder.orderNumber}`}
        >
          <div className="space-y-5">
            {/* Order Brief */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-400">
                <span>Material: <strong className="text-white">{acceptingOrder.productNameSnapshot}</strong></span>
                <span className="text-amber-400 font-mono font-bold">{formatOrderQuantity(acceptingOrder)}</span>
              </div>
              <div className="text-slate-300 text-[11px] truncate">
                📍 Destination: {acceptingOrder.shippingAddress}
              </div>
            </div>

            {/* Driver Selection Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4" />
                  <span>Assign Fleet Driver for Delivery</span>
                </label>
                <span className="text-[10px] text-slate-400">SMS with GPS Link sent on submit</span>
              </div>

              {/* Saved Fleet Dropdown */}
              {drivers.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    Quick Select from Saved Driver Fleet:
                  </span>
                  <select
                    value={selectedDriverId}
                    onChange={handleDriverSelect}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="">-- Select saved driver or type details below --</option>
                    {drivers.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} (+91 {d.mobile}) — {d.vehicleNumber} ({d.vehicleType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Manual / Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Driver Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patel"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Driver 10-Digit Mobile *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="98XXXXXXXX"
                    value={driverMobile}
                    onChange={(e) => setDriverMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    placeholder="GJ-02-AB-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 uppercase font-mono font-bold"
                  />
                </div>
              </div>

              {/* Automated Google Maps Notification Notice */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2 text-xs text-slate-300">
                <Navigation className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Live Route Sharing:</strong> Driver will immediately receive an automated SMS with Customer Name, Site Address, and a **Direct Google Maps Navigation Link**!
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmittingAccept}
                onClick={(e) => handleConfirmAccept(e, false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Accept Order (Assign Driver Later)
              </button>

              <button
                type="button"
                disabled={isSubmittingAccept}
                onClick={(e) => handleConfirmAccept(e, true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-brand-500/20 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmittingAccept ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Assigning Driver & Accepting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Assign Driver for Dispatch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
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
