import React, { useState, useEffect } from 'react';
import { orderService, deliveryService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import {
  Truck,
  ShieldCheck,
  KeyRound,
  MapPin,
  Phone,
  Navigation,
  Loader2,
  CheckCircle2,
  ExternalLink,
  User,
  RotateCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ActiveDeliveries() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // OTP Verification Modal State
  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const loadActive = async () => {
    try {
      const res = await orderService.getDealerDeliveries('OUT_FOR_DELIVERY');
      if (res.data?.orders) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      toast.error('Failed to load active deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActive();
  }, []);

  const openVerifyOtpModal = (order) => {
    setVerifyingOrder(order);
    setOtpInput('');
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput || otpInput.length !== 6) {
      toast.error('Please enter the exact 6-digit delivery OTP.');
      return;
    }

    setVerifying(true);
    try {
      await deliveryService.verifyOtp(verifyingOrder._id, otpInput.trim());
      toast.success(`Delivery verified successfully for #${verifyingOrder.orderNumber}! Order marked DELIVERED.`);
      setVerifyingOrder(null);
      loadActive();
    } catch (err) {
      toast.error(err.message || 'Incorrect delivery OTP');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Tracking active shipments..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white font-display">Active Deliveries</h1>
            {orders.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-black text-xs border border-blue-500/20">
                {orders.length} en route
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Vehicles currently en route to construction sites. Enter customer 6-digit OTP upon material unloading.
          </p>
        </div>
        <button
          type="button"
          onClick={loadActive}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-brand-400 active:scale-95 transition-all min-h-[40px] cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Live</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No active deliveries in transit"
          description="All dispatched orders have been verified and delivered. Check your Accepted Orders to assign drivers and dispatch new trucks."
          icon={Truck}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl relative overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black font-mono text-white">#{order.orderNumber}</span>
                  <StatusBadge status={order.orderStatus} />
                </div>
                <div className="text-xs text-amber-300 font-semibold flex items-center gap-1.5 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Dispatched: {formatDate(order.outForDeliveryAt || order.updatedAt)}</span>
                </div>
              </div>

              {/* Driver & Material summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">
                    Driver on Duty
                  </span>
                  <div className="text-sm font-black text-white">{order.driverName}</div>
                  <a
                    href={`tel:${order.driverMobile}`}
                    className="text-brand-400 font-bold flex items-center gap-1.5 font-mono hover:underline text-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{order.driverMobile}</span>
                  </a>
                  <div className="text-[11px] text-emerald-400 font-mono font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                    Plate: {order.vehicleNumber}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">
                    Dispatched Material
                  </span>
                  <div className="text-sm font-black text-white">{order.productNameSnapshot}</div>
                  <div className="text-amber-400 font-mono font-bold text-base">{formatOrderQuantity(order)}</div>
                  <div className="text-[11px] text-slate-400">{formatOrderTransport(order)}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">
                    Customer & Site Contact
                  </span>
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>{order.shippingDetails?.fullName || order.userId?.name}</span>
                  </div>
                  <a
                    href={`tel:${order.shippingDetails?.mobile || order.userId?.mobile}`}
                    className="text-slate-300 font-mono text-xs block hover:underline"
                  >
                    +91 {order.shippingDetails?.mobile || order.userId?.mobile}
                  </a>
                  <div className="text-[11px] text-slate-400">
                    {order.finalPaymentStatus === 'PAID' ? 'Order Total (Final)' : 'Order Total'}:{' '}
                    <strong className="text-white font-mono">
                      {formatINR(order.finalPaymentStatus === 'PAID' ? order.finalPaymentAmount : order.totalAmount)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Destination & Navigation Action */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1 flex-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-400" />
                    Site Destination
                  </span>
                  <p className="text-slate-200 font-medium leading-relaxed">{order.shippingAddress}</p>
                </div>

                {order.latitude && order.longitude && (
                  <a
                    href={`https://maps.google.com/?q=${order.latitude},${order.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-brand-400 shrink-0 active:scale-95 transition-all min-h-[44px]"
                  >
                    <Navigation className="w-4 h-4 text-amber-400" />
                    <span>Open in Maps</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}
              </div>

              {/* Action: Verify OTP */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => openVerifyOtpModal(order)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-xs sm:text-sm transition-all shadow-sm min-h-[44px] cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Enter Delivery OTP to Complete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OTP Verification Modal */}
      <Modal
        isOpen={Boolean(verifyingOrder)}
        onClose={() => setVerifyingOrder(null)}
        title={`Verify Delivery: #${verifyingOrder?.orderNumber}`}
        maxWidth="max-w-md"
      >
        {verifyingOrder && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 text-center">
            <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white font-display">Enter 6-Digit Delivery OTP</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Ask the site engineer or supervisor for the 6-digit OTP sent to their WhatsApp/mobile upon drop-off.
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                required
                placeholder="• • • • • •"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                className="w-52 text-center tracking-[0.5em] text-3xl font-black font-mono py-3.5 rounded-2xl bg-slate-950 border-2 border-emerald-500/40 text-emerald-400 focus:outline-none focus:border-emerald-400 mx-auto block shadow-inner"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setVerifyingOrder(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifying || otpInput.length !== 6}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Complete</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
