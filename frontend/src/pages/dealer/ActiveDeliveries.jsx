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
  ExternalLink
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">Active Deliveries</h1>
          <p className="text-xs text-slate-400">
            Vehicles currently en route to construction sites. Enter customer 6-digit OTP upon material unloading.
          </p>
        </div>
        <button
          onClick={loadActive}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-brand-400 border border-slate-800"
        >
          Refresh Live
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No active deliveries in transit"
          description="All dispatched orders have been verified and delivered."
          icon={Truck}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black font-mono text-white">#{order.orderNumber}</span>
                  <StatusBadge status={order.orderStatus} />
                </div>
                <div className="text-xs text-brand-400 font-semibold flex items-center gap-1.5">
                  <Truck className="w-4 h-4 animate-bounce" />
                  Dispatched on {formatDate(order.outForDeliveryAt)}
                </div>
              </div>

              {/* Driver & Material summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">
                    Driver on Duty
                  </span>
                  <div className="text-sm font-bold text-white">{order.driverName}</div>
                  <a
                    href={`tel:${order.driverMobile}`}
                    className="text-brand-400 font-bold flex items-center gap-1 font-mono hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {order.driverMobile}
                  </a>
                  <div className="text-[10px] text-slate-500 uppercase font-mono mt-1">{order.vehicleNumber}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">
                    Payload Dispatched
                  </span>
                  <div className="text-sm font-bold text-white">{order.productNameSnapshot}</div>
                  <div className="text-brand-400 font-mono font-bold text-base">{formatOrderQuantity(order)}</div>
                  <div className="text-[10px] text-slate-400">{formatOrderTransport(order)}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">
                    Customer Contact
                  </span>
                  <div className="text-sm font-bold text-white">{order.userId?.name}</div>
                  <a
                    href={`tel:${order.userId?.mobile}`}
                    className="text-slate-300 font-mono block hover:underline"
                  >
                    {order.userId?.mobile}
                  </a>
                </div>
              </div>

              {/* Destination & Navigation Action */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-brand-400" />
                    Site Destination
                  </span>
                  <span className="text-slate-200 font-medium">{order.shippingAddress}</span>
                </div>

                <a
                  href={`https://maps.google.com/?q=${order.latitude},${order.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-brand-400 shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Open in Google Maps
                </a>
              </div>

              {/* Action */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => openVerifyOtpModal(order)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20"
                >
                  <KeyRound className="w-5 h-5" />
                  Enter Customer Delivery OTP to Complete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OTP Modal */}
      <Modal
        isOpen={Boolean(verifyingOrder)}
        onClose={() => setVerifyingOrder(null)}
        title={`Verify Delivery OTP (Order #${verifyingOrder?.orderNumber})`}
        maxWidth="max-w-md"
      >
        {verifyingOrder && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Enter 6-Digit Delivery OTP</h3>
              <p className="text-xs text-slate-400">
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
                className="w-48 text-center tracking-[0.5em] text-2xl font-black font-mono py-3 rounded-xl bg-slate-950 border-2 border-slate-700 text-white focus:outline-none focus:border-emerald-500 mx-auto block"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setVerifyingOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifying || otpInput.length !== 6}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying OTP...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Verify & Mark Delivered
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
