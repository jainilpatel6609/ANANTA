import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderService, paymentService } from '../../services';
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
  Printer,
  Copy,
  Check,
  BadgeCheck,
  Weight,
  CreditCard,
  Loader2,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrderDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [payingFinal, setPayingFinal] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('rzp_test_mock_key');

  const fetchOrder = async () => {
    try {
      const res = await orderService.getOrderById(id);
      if (res.data?.order) {
        setOrder(res.data.order);
      }
      if (res.data?.keyId) {
        setRazorpayKeyId(res.data.keyId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // Poll for updates so a customer who already has this page open sees stage
    // changes (e.g. dealer entering Total Weight, unlocking Final Payment) without
    // needing to manually refresh.
    const interval = setInterval(fetchOrder, 20000);
    return () => clearInterval(interval);
  }, [id]);

  // Final payment (Total Weight x Rate Per Ton) -- entirely separate from the upfront booking
  // payment above; becomes due once the dealer enters the weighed tonnage.
  const handleDemoFinalConfirm = async () => {
    setPayingFinal(true);
    try {
      await paymentService.devConfirmFinal(order._id);
      toast.success('🎉 Final payment confirmed (Demo Mode)! Your Dumper is dispatched.');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Final payment failed.');
    } finally {
      setPayingFinal(false);
    }
  };

  const handleRazorpayFinalCheckout = () => {
    if (!order?.finalRazorpayOrderId || !window.Razorpay) {
      toast.error('Razorpay SDK is not loaded. Please use Demo Payment mode for instant testing.');
      return;
    }

    const options = {
      key: razorpayKeyId,
      amount: Math.round(order.finalPaymentAmount * 100),
      currency: 'INR',
      name: 'ANANTA TRADERS',
      description: `Final Payment - Order #${order.orderNumber}`,
      order_id: order.finalRazorpayOrderId,
      prefill: {
        name: order.shippingDetails?.fullName || user?.name,
        contact: order.shippingDetails?.mobile || user?.mobile,
        email: user?.email || 'sales@anantatraders.com'
      },
      theme: { color: '#c9a227' },
      handler: async function (response) {
        try {
          toast.loading('Verifying secure transaction...', { id: 'final-pay' });
          await paymentService.verifyFinal({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            orderId: order._id
          });
          toast.success('Final payment verified! Your Dumper is dispatched.', { id: 'final-pay' });
          fetchOrder();
        } catch (err) {
          toast.error('Payment verification failed. Please contact support.', { id: 'final-pay' });
        }
      },
      modal: {
        ondismiss: function () {
          toast('Payment window dismissed. You can retry final payment anytime.');
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const copyOtpToClipboard = (otp) => {
    if (!otp) return;
    navigator.clipboard.writeText(otp);
    setCopiedOtp(true);
    toast.success('OTP copied to clipboard!');
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  if (loading) {
    return <LoadingSpinner message="Loading order details and live tracking..." />;
  }

  if (!order) {
    return (
      <div className="text-center py-16 space-y-4 max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xs">
        <h3 className="text-xl font-bold text-slate-900">Order not found</h3>
        <p className="text-xs text-slate-500">The requested order could not be located in your account.</p>
        <Link
          to="/user/orders"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs shadow-xs hover:bg-amber-400"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Orders</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16 select-none">
      {/* Top Bar - Mobile First */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/user/orders"
            className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center text-slate-700 transition-all active:scale-95 shrink-0"
            aria-label="Back to orders"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 font-display tracking-tight">
                Order #{order.orderNumber}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-wider">
                GATE PASS
              </span>
              <StatusBadge status={order.orderStatus} size="sm" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Placed on {formatDate(order.createdAt)}
              {order.dealerCodeSnapshot && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-700 font-bold">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Dealer Code: <span className="font-mono">{order.dealerCodeSnapshot}</span>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <Link
            to={`/user/orders/${order._id}/invoice`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Tax Invoice</span>
          </Link>
          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans font-bold">
              Total Amount
            </span>
            <span className="text-xl font-black text-slate-900">{formatINR(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Prominent Delivery Handover OTP Banner (if Out for delivery or OTP present) */}
      {(order.orderStatus === 'OUT_FOR_DELIVERY' || order.deliveryOtpDisplay) && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-300/80 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs uppercase tracking-wider border border-amber-200">
                <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                <span>Delivery Gate Pass OTP</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">
                Share this 6-digit code upon physical material delivery
              </h2>
              <p className="text-xs text-slate-600 max-w-xl font-medium">
                Inspect your material quality & verify quantity at your site before handing this code to driver{' '}
                <strong className="text-slate-900 font-bold">{order.driverName || 'on duty'}</strong>.
              </p>
            </div>

            {order.deliveryOtpDisplay ? (
              <div className="flex items-center gap-2.5">
                <div className="bg-slate-900 px-5 py-2.5 rounded-2xl border border-slate-800 shadow-md">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-amber-400 tracking-[0.25em]">
                    {order.deliveryOtpDisplay}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyOtpToClipboard(order.deliveryOtpDisplay)}
                  className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  title="Copy OTP"
                >
                  {copiedOtp ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            ) : (
              <div className="px-4 py-2.5 rounded-2xl bg-white border border-amber-200 text-xs text-amber-900 font-mono font-medium">
                OTP sent via WhatsApp ({order.userId?.whatsappNumber || order.userId?.mobile})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Tracking Timeline */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" />
            Live Dispatch Tracking
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Status: <span className="text-slate-900 font-black">{order.orderStatus}</span>
          </span>
        </div>
        <DeliveryTimeline order={order} />
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Driver & Delivery Information Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                Assigned Driver & Transport Vehicle
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                {isTractorOrder(order) ? `Tractor · ${formatOrderTransport(order)}` : order.vehicleType}
              </span>
            </div>

            {order.driverName ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center font-black text-base shrink-0">
                    {order.driverName.charAt(0)}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                      Assigned Driver
                    </span>
                    <h4 className="text-base font-black text-slate-900">{order.driverName}</h4>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                      Plate: {order.vehicleNumber}
                    </span>
                  </div>
                </div>

                {order.driverMobile && (
                  <a
                    href={`tel:${order.driverMobile}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs shadow-xs transition-all"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Driver ({order.driverMobile})</span>
                  </a>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 text-xs text-slate-500 flex items-center gap-3 border border-slate-200/80 font-medium">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  Dealer {order.dealerId?.companyName || 'partner'} is currently preparing the vehicle and assigning the fleet driver.
                </span>
              </div>
            )}
          </div>

          {/* Compliance & Weighbridge Documents - ONLY FOR DUMPER / TRUCK */}
          {order.transportType !== 'Tractor' &&
            order.vehicleTypeSnapshot !== 'TRACTOR' &&
            !order.tractorType &&
            !order.vehicleType?.toLowerCase().includes('patiya') && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileCheck className="w-4 h-4 text-amber-600" />
                  Verified Compliance Slips & Scale Proof
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* River Royalty Photo */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">River Royalty Slip</span>
                      {order.riverRoyaltyUrl ? (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending Upload</span>
                      )}
                    </div>
                    {order.riverRoyaltyUrl ? (
                      <div className="relative group rounded-xl overflow-hidden h-40 border border-slate-200">
                        <img
                          src={order.riverRoyaltyUrl}
                          alt="River Royalty Certificate"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <a
                          href={order.riverRoyaltyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity gap-1.5"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Document
                        </a>
                      </div>
                    ) : (
                      <div className="h-32 rounded-xl bg-white border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 text-center p-3 font-medium">
                        Dealer uploads verified Royalty transit pass prior to vehicle departure.
                      </div>
                    )}
                  </div>

                  {/* Waybridge Photo */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Certified Weighbridge Slip</span>
                      {order.waybridgePhotoUrl ? (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <Scale className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending Upload</span>
                      )}
                    </div>
                    {order.waybridgePhotoUrl ? (
                      <div className="relative group rounded-xl overflow-hidden h-40 border border-slate-200">
                        <img
                          src={order.waybridgePhotoUrl}
                          alt="Weighbridge Slip Photo"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <a
                          href={order.waybridgePhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity gap-1.5"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Scale Slip
                        </a>
                      </div>
                    ) : (
                      <div className="h-32 rounded-xl bg-white border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 text-center p-3 font-medium">
                        Dealer captures gross weight slip photo upon scale exit.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* Shipping Coordinates & Destination */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-3 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="w-4 h-4 text-amber-600" />
              Delivery Shipping Location
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              {order.shippingAddress}
            </p>
            {order.deliveryInstructions && (
              <p className="text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200/80 font-medium">
                Site Note: "{order.deliveryInstructions}"
              </p>
            )}
            <div className="text-[11px] text-slate-400 font-mono pt-1">
              GPS Coordinates: {order.latitude}, {order.longitude}
            </div>
          </div>
        </div>

        {/* Right Column: Prominent Financial Breakdown */}
        <div className="space-y-5">
          {/* Status summary Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Delivery Status
            </div>

            {order.orderStatus === 'DELIVERED' ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
                <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-sm font-black text-slate-900">Delivery Verified & Completed</div>
                <div className="text-xs text-slate-500">
                  Verified on {formatDate(order.deliveryVerifiedAt || order.deliveredAt)}
                </div>
              </div>
            ) : order.orderStatus === 'OUT_FOR_DELIVERY' ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-1.5">
                <Truck className="w-8 h-8 text-amber-600 mx-auto" />
                <div className="text-sm font-black text-slate-900">En Route to Site</div>
                <div className="text-xs text-slate-600">
                  Driver is on the way. Please have the unloading spot ready.
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1 text-center font-medium">
                <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p>Order is being processed by the regional dispatch terminal.</p>
              </div>
            )}
          </div>

          {/* Final Payment (Total Weight x Rate Per Ton) -- separate from the upfront booking
              payment above. Becomes due once the dealer enters the weighed tonnage. */}
          {order.fulfillmentStage === 'WEIGHT_ENTERED' && order.finalPaymentStatus !== 'PAID' && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/80 border border-amber-300/80 rounded-3xl p-5 sm:p-6 space-y-3.5 shadow-xs">
              <h3 className="font-black text-amber-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-amber-200/80 pb-3">
                <Weight className="w-4 h-4 text-amber-700" />
                Final Payment Due
              </h3>
              <div className="flex justify-between py-1 border-b border-amber-200/60 text-xs">
                <span className="text-amber-800">Total Weight:</span>
                <span className="font-mono font-bold text-slate-900">{order.totalWeight} Ton</span>
              </div>
              <div className="flex justify-between py-1 border-b border-amber-200/60 text-xs">
                <span className="text-amber-800">Rate Per Ton:</span>
                <span className="font-mono font-bold text-slate-900">{formatINR(order.pricePerTonSnapshot)}</span>
              </div>
              <div className="pt-1 flex justify-between items-baseline">
                <span className="text-sm font-black text-slate-900">Total Price:</span>
                <span className="text-2xl font-black text-amber-700 font-mono">{formatINR(order.finalPaymentAmount)}</span>
              </div>
              <p className="text-[11px] text-amber-800/80">
                Your Dumper will be dispatched as soon as this payment is completed.
              </p>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={payingFinal}
                  onClick={handleDemoFinalConfirm}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {payingFinal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>Confirm & Pay (Demo Mode)</span>
                </button>

                {window.Razorpay && order.finalRazorpayOrderId && (
                  <button
                    type="button"
                    disabled={payingFinal}
                    onClick={handleRazorpayFinalCheckout}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-400 font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay with Razorpay Gateway</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Invoice Breakdown */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-3 text-xs shadow-xs">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider text-amber-700 border-b border-slate-100 pb-3">
              Payment & Invoice
            </h3>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Material:</span>
              <span className="font-bold text-slate-900">{order.productNameSnapshot}</span>
            </div>
            {isTractorOrder(order) ? (
              <>
                {order.sandLocation ? (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Location:</span>
                    <span className="font-bold text-slate-900">{order.sandLocation}</span>
                  </div>
                ) : null}
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Transport:</span>
                  <span className="font-bold text-slate-900">Tractor</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tractor Type:</span>
                  <span className="font-bold text-slate-900">{order.tractorType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Number of Tractors:</span>
                  <span className="font-bold text-amber-700">{order.numberOfTractors || order.quantity}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Price Per Tractor:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatINR(order.pricePerTractorSnapshot ?? order.pricePerTonSnapshot)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Transport Price:</span>
                  <span className="font-mono font-bold text-slate-800">{formatINR(order.subtotal)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Quantity Dispatched:</span>
                  <span className="font-bold text-amber-700">{formatOrderQuantity(order)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Rate Per Ton (Snapshotted):</span>
                  <span className="font-mono font-bold text-slate-800">{formatINR(order.pricePerTonSnapshot)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Material Subtotal:</span>
                  <span className="font-mono font-bold text-slate-800">{formatINR(order.subtotal)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Freight Charge:</span>
                  <span className="font-mono font-bold text-slate-800">{formatINR(order.deliveryCharge)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">GST (5%):</span>
                  <span className="font-mono font-bold text-slate-800">{formatINR(order.tax)}</span>
                </div>
              </>
            )}
            <div className="pt-2 flex justify-between items-baseline font-bold text-sm text-slate-900">
              <span>Grand Total:</span>
              <span className="text-xl font-black text-amber-700 font-mono">{formatINR(order.totalAmount)}</span>
            </div>
            <div className="pt-1 text-[10px] text-slate-400 font-mono truncate">
              Payment ID: {order.paymentId || 'N/A'}
            </div>

            <Link
              to={`/user/orders/${order._id}/invoice`}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-400 hover:text-amber-300 font-bold text-xs shadow-xs transition-all mt-3 cursor-pointer"
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
