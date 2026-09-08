import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import DeliveryTimeline from '../../components/DeliveryTimeline';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport, isTractorOrder } from '../../utils/formatters';
import {
  Package,
  Truck,
  Phone,
  ShieldCheck,
  FileCheck,
  Scale,
  MapPin,
  Clock,
  KeyRound,
  ExternalLink,
  ArrowLeft,
  FileText,
  Printer
} from 'lucide-react';

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await orderService.getOrderById(id);
        if (res.data?.order) {
          setOrder(res.data.order);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading order details and live tracking..." />;
  }

  if (!order) {
    return (
      <div className="text-center py-16 space-y-4">
        <h3 className="text-xl font-bold text-white">Order not found</h3>
        <Link to="/user/orders" className="text-xs text-brand-400 hover:underline">
          &larr; Back to my orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/user/orders"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
                Order #{order.orderNumber}
              </h1>
              <StatusBadge status={order.orderStatus} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Placed on {formatDate(order.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/user/orders/${order._id}/invoice`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Official Tax Invoice</span>
          </Link>
          <div className="text-right font-mono">
            <span className="text-xs text-slate-400 uppercase tracking-wider block font-sans">Grand Total</span>
            <span className="text-2xl font-black text-brand-400">{formatINR(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Visual Tracking Timeline */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6">Live Dispatch Tracking</h3>
        <DeliveryTimeline order={order} />
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Driver & Delivery Information Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-400" />
                Assigned Driver & Transport Vehicle
              </h3>
              <span className="text-xs font-semibold text-slate-400">
                {isTractorOrder(order) ? `Tractor · ${formatOrderTransport(order)}` : order.vehicleType}
              </span>
            </div>

            {order.driverName ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Driver Name</span>
                  <span className="font-bold text-white text-sm">{order.driverName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Driver Contact</span>
                  <a
                    href={`tel:${order.driverMobile}`}
                    className="font-bold text-brand-400 text-sm flex items-center gap-1 font-mono hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {order.driverMobile}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Vehicle Plate No.</span>
                  <span className="font-bold text-emerald-400 text-sm font-mono uppercase">
                    {order.vehicleNumber}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 text-xs text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Dealer {order.dealerId?.companyName || 'partner'} is currently preparing the tipper and assigning the driver.
                </span>
              </div>
            )}

            {/* Customer Delivery OTP Display */}
            {order.orderStatus === 'OUT_FOR_DELIVERY' && order.deliveryOtpDisplay && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <KeyRound className="w-4 h-4" />
                    <span>Your 6-Digit Delivery OTP</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Share with driver upon material drop-off</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-black text-white tracking-widest bg-slate-950 px-4 py-1.5 rounded-lg border border-amber-500/40">
                    {order.deliveryOtpDisplay}
                  </span>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Provide this code to <strong>{order.driverName || 'the driver'}</strong> once the material is unloaded & inspected at your site.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Compliance & Weighbridge Documents - ONLY FOR DUMPER / TRUCK */}
          {order.transportType !== 'Tractor' &&
          order.vehicleTypeSnapshot !== 'TRACTOR' &&
          !order.tractorType &&
          !order.vehicleType?.toLowerCase().includes('patiya') && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <FileCheck className="w-4 h-4 text-brand-400" />
                Verified Compliance Slips & Photos
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* River Royalty Photo */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">River Royalty Slip</span>
                    {order.riverRoyaltyUrl ? (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Uploaded
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Pending Upload</span>
                    )}
                  </div>
                  {order.riverRoyaltyUrl ? (
                    <div className="relative group rounded-lg overflow-hidden h-36 border border-slate-800">
                      <img
                        src={order.riverRoyaltyUrl}
                        alt="River Royalty Certificate"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <a
                        href={order.riverRoyaltyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Full Certificate
                      </a>
                    </div>
                  ) : (
                    <div className="h-28 rounded-lg bg-slate-900 flex items-center justify-center text-xs text-slate-500 text-center p-3">
                      Dealer uploads verified Royalty transit pass prior to departure.
                    </div>
                  )}
                </div>

                {/* Waybridge Photo */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Certified Weighbridge Slip</span>
                    {order.waybridgePhotoUrl ? (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        Uploaded
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Pending Upload</span>
                    )}
                  </div>
                  {order.waybridgePhotoUrl ? (
                    <div className="relative group rounded-lg overflow-hidden h-36 border border-slate-800">
                      <img
                        src={order.waybridgePhotoUrl}
                        alt="Weighbridge Slip Photo"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <a
                        href={order.waybridgePhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Weighbridge Slip
                      </a>
                    </div>
                  ) : (
                    <div className="h-28 rounded-lg bg-slate-900 flex items-center justify-center text-xs text-slate-500 text-center p-3">
                      Dealer captures gross weight slip photo upon scale exit.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Shipping Coordinates & Destination */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <MapPin className="w-4 h-4 text-brand-400" />
              Delivery Shipping Location
            </h3>
            <p className="text-xs text-slate-200">{order.shippingAddress}</p>
            {order.deliveryInstructions && (
              <p className="text-xs text-brand-400 italic">
                Note: "{order.deliveryInstructions}"
              </p>
            )}
            <div className="text-[11px] text-slate-500 font-mono">
              GPS Coordinates: {order.latitude}, {order.longitude}
            </div>
          </div>
        </div>

        {/* Right Column: Prominent OTP & Financial Breakdown */}
        <div className="space-y-6">
          {/* OTP Verification Card for User */}
          <div className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border-2 border-brand-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
              <KeyRound className="w-4 h-4" />
              Site Handover OTP
            </div>

            {order.orderStatus === 'DELIVERED' ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-white">Delivery Verified & Completed</div>
                <div className="text-xs text-slate-400">
                  Verified on {formatDate(order.deliveryVerifiedAt || order.deliveredAt)}
                </div>
              </div>
            ) : order.orderStatus === 'OUT_FOR_DELIVERY' ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-brand-500/20 text-center space-y-2">
                <div className="text-xs text-slate-400">
                  Your 6-Digit Delivery OTP was sent to your registered WhatsApp ({order.userId?.whatsappNumber || order.userId?.mobile}).
                </div>
                <div className="text-xs font-semibold text-brand-400">
                  Share this OTP with driver {order.driverName} only after inspecting the material at site.
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 space-y-1">
                <p>
                  A cryptographically secure 6-digit delivery OTP will be generated automatically when the dealer dispatches the tipper.
                </p>
              </div>
            )}
          </div>

          {/* Invoice Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 text-xs">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider text-brand-400 border-b border-slate-800 pb-3">
              Payment & Invoice
            </h3>

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Material Snapshot:</span>
              <span className="font-semibold text-white">{order.productNameSnapshot}</span>
            </div>
            {isTractorOrder(order) ? (
              <>
                {order.sandLocation ? (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-semibold text-white">{order.sandLocation}</span>
                  </div>
                ) : null}
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Transport:</span>
                  <span className="font-semibold text-white">Tractor</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Tractor Type:</span>
                  <span className="font-semibold text-white">{order.tractorType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Number of Tractors:</span>
                  <span className="font-bold text-brand-400">{order.numberOfTractors || order.quantity}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Price Per Tractor:</span>
                  <span className="font-mono text-slate-200">{formatINR(order.pricePerTractorSnapshot ?? order.pricePerTonSnapshot)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Transport Price:</span>
                  <span className="font-mono text-slate-200">{formatINR(order.subtotal)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Quantity Dispatched:</span>
                  <span className="font-bold text-brand-400">{formatOrderQuantity(order)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Rate Per Ton (Snapshotted):</span>
                  <span className="font-mono text-slate-200">{formatINR(order.pricePerTonSnapshot)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Material Subtotal:</span>
                  <span className="font-mono text-slate-200">{formatINR(order.subtotal)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Freight Charge:</span>
                  <span className="font-mono text-slate-200">{formatINR(order.deliveryCharge)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">GST (5%):</span>
                  <span className="font-mono text-slate-200">{formatINR(order.tax)}</span>
                </div>
              </>
            )}
            <div className="pt-2 flex justify-between items-baseline font-bold text-sm text-white">
              <span>Total Paid:</span>
              <span className="text-xl font-black text-brand-400 font-mono">{formatINR(order.totalAmount)}</span>
            </div>
            <div className="pt-2 text-[10px] text-slate-500 font-mono">
              Payment ID: {order.paymentId || 'N/A'}
            </div>

            <Link
              to={`/user/orders/${order._id}/invoice`}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-bold text-xs border border-slate-700 shadow-sm transition-all mt-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download Tax Invoice (PDF)</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
