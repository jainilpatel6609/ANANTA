import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import DeliveryTimeline from '../../components/DeliveryTimeline';
import { formatOrderQuantity, formatDate, formatINR } from '../../utils/formatters';
import {
  Truck,
  PlusCircle,
  ArrowRight,
  CreditCard,
  Building,
  CheckCircle2,
  CheckCircle,
  Clock,
  Sparkles,
  Target,
  FileText,
  PhoneCall,
  ShieldCheck,
  X,
  Copy,
  Check,
  RefreshCw,
  Scale,
  ExternalLink,
  History,
  MapPin
} from 'lucide-react';

export default function UserDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(null);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackOrderId, setTrackOrderId] = useState(null);
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [challanOrderId, setChallanOrderId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyPeriod, setHistoryPeriod] = useState('ALL');
  const [historySite, setHistorySite] = useState('ALL');

  const fetchOrders = async () => {
    try {
      const res = await orderService.getMyOrders();
      if (res.data?.orders) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error('Failed to load user orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  if (loading) {
    return <LoadingSpinner message="Loading contractor portal..." />;
  }

  // Pending/Ongoing/Delivered counts reset every day -- never all-time totals.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o) => o.createdAt && new Date(o.createdAt) >= startOfToday);

  // Counts mirror MyOrders' tab filters exactly (PENDING / ACTIVE) so the numbers shown here
  // match what the customer sees after tapping through to that filtered list.
  const displayPending = todayOrders.filter((o) => o.orderStatus === 'PENDING_PAYMENT').length;
  const displayInTransit = todayOrders.filter((o) => ['PLACED', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)).length;
  const displayDelivered = todayOrders.filter((o) => o.orderStatus === 'DELIVERED').length;

  // Every order currently out for delivery with a live Gate Pass OTP -- not just one, so a
  // customer running multiple dispatches at once sees each order's own code against its number.
  const activeOtpOrders = orders.filter((o) => o.orderStatus === 'OUT_FOR_DELIVERY' && o.deliveryOtpDisplay);

  const handleCopyOtp = (otp, orderId) => {
    if (!otp) return;
    navigator.clipboard.writeText(otp);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  // Orders currently in the delivery pipeline -- these are the only ones worth live-tracking.
  const activeTrackOrders = orders.filter((o) => ['PLACED', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.orderStatus));
  const trackOrder = activeTrackOrders.find((o) => o._id === trackOrderId) || null;

  const openTrackModal = () => {
    setTrackOrderId(null);
    setShowTrackModal(true);
  };

  // Orders that actually have a weighbridge slip photo uploaded by the dealer.
  const challanOrders = orders.filter((o) => o.waybridgePhotoUrl);
  const challanOrder = challanOrders.find((o) => o._id === challanOrderId) || null;

  const openChallanModal = () => {
    setChallanOrderId(null);
    setShowChallanModal(true);
  };

  // Order History: completed order invoices, filterable by Today / This Month / Site.
  // Site location = the exact site/society/plot name the customer typed at checkout
  // (shippingDetails.addressLine1, the first segment of the full shipping address) --
  // not the broad city, since multiple deliveries can share a city but differ by site.
  const getOrderSite = (o) =>
    o.shippingDetails?.addressLine1?.trim() ||
    o.shippingAddress?.split(',')[0]?.trim() ||
    o.shippingDetails?.city ||
    'Other';

  const deliveredOrders = orders.filter((o) => o.orderStatus === 'DELIVERED');
  const siteOptions = Array.from(new Set(deliveredOrders.map((o) => getOrderSite(o)))).sort();

  const historyStartOfToday = new Date();
  historyStartOfToday.setHours(0, 0, 0, 0);
  const historyStartOfMonth = new Date(historyStartOfToday.getFullYear(), historyStartOfToday.getMonth(), 1);

  const historyOrders = deliveredOrders
    .filter((o) => {
      if (historyPeriod === 'ALL') return true;
      const ref = new Date(o.deliveryVerifiedAt || o.deliveredAt || o.createdAt);
      return historyPeriod === 'TODAY' ? ref >= historyStartOfToday : ref >= historyStartOfMonth;
    })
    .filter((o) => historySite === 'ALL' || getOrderSite(o) === historySite)
    .sort((a, b) => new Date(b.deliveredAt || b.createdAt) - new Date(a.deliveredAt || a.createdAt));

  const openHistoryModal = () => {
    setHistoryPeriod('ALL');
    setHistorySite('ALL');
    setShowHistoryModal(true);
  };

  // Extract first name for greeting
  const firstName = user?.name ? user.name.split(' ')[0] : 'Partner';

  return (
    <div className="space-y-3 sm:space-y-6 select-none max-w-5xl mx-auto">
      {/* 1. HERO BANNER CARD (Exact Dark Navy Card matching screenshot) */}
      <div className="bg-slate-950 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 relative overflow-hidden shadow-xl border border-amber-500/30">
        {/* Glow & subtle truck background watermark */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -right-8 opacity-5 pointer-events-none text-white">
          <Truck className="w-56 h-56" />
        </div>

        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3.5 relative z-10">
          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[9px] sm:text-[11px] font-medium backdrop-blur-sm shadow-xs">
            <span className="text-amber-400">👷</span>
            <span>Site Verified Partner</span>
          </div>
        </div>

        {/* Greeting Title */}
        <div className="relative z-10 mb-3 sm:mb-5">
          <h1 className="text-lg sm:text-3xl font-extrabold text-white tracking-tight font-display">
            Welcome back, <span className="text-amber-400">{firstName}!</span>
          </h1>
          <p className="text-[11px] sm:text-sm text-slate-400 mt-0.5 sm:mt-1 font-medium">
            Site deliveries & weighbridge slips update live
          </p>
        </div>

        {/* Action Button: New Order */}
        <div className="flex items-center gap-2 sm:gap-2.5 relative z-10">
          <Link
            to="/user/create-order"
            className="flex-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-[11px] sm:text-sm shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all tracking-wide uppercase min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>NEW MATERIAL ORDER</span>
          </Link>
        </div>
      </div>

      {/* 2. QUICK OPERATIONS (2x2 Grid, No Scroll) */}
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
          QUICK OPERATIONS
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {/* 1. Verify Delivery OTP */}
          <button
            type="button"
            onClick={() => setShowOtpModal(true)}
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-400/80 hover:shadow-md transition-all text-left min-w-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">Verify Delivery OTP</div>
              <div className="text-[10px] text-slate-500 font-medium truncate">Confirm receipt</div>
            </div>
          </button>

          {/* 2. Track Vehicle */}
          <button
            type="button"
            onClick={openTrackModal}
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-sky-400/80 hover:shadow-md transition-all min-w-0 text-left"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">Track Vehicle</div>
              <div className="text-[10px] text-slate-500 font-medium truncate">Live GPS telemetry</div>
            </div>
          </button>

          {/* 3. Challan Slips */}
          <button
            type="button"
            onClick={openChallanModal}
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-purple-400/80 hover:shadow-md transition-all min-w-0 text-left"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">Challan Slips</div>
              <div className="text-[10px] text-slate-500 font-medium truncate">Weighbridge slip photo</div>
            </div>
          </button>

          {/* 4. Dispatch Support */}
          <a
            href="tel:9327807331"
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-400/80 hover:shadow-md transition-all min-w-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">Dispatch Support</div>
              <div className="text-[10px] text-slate-500 font-medium truncate">24x7 control room</div>
            </div>
          </a>

          {/* 5. Order History */}
          <button
            type="button"
            onClick={openHistoryModal}
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-400/80 hover:shadow-md transition-all min-w-0 text-left"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">Order History</div>
              <div className="text-[10px] text-slate-500 font-medium truncate">Completed order invoices</div>
            </div>
          </button>
        </div>
      </div>

      {/* 3. ORDER STATUS OVERVIEW */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 font-display tracking-tight">
              Order Status Overview
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
              Consolidated site delivery ledger
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-[10px] sm:text-xs font-bold shrink-0">
            Today
          </span>
        </div>

        {/* Stat columns */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Link
            to="/user/orders?status=PENDING&period=today"
            className="flex flex-col items-center text-center gap-1 p-2.5 sm:p-3 rounded-2xl bg-rose-50/50 border border-rose-100 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-rose-600 border border-rose-200 flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-700 font-bold mt-1">Pending</span>
            <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight">
              {displayPending}
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Confirmation</span>
          </Link>

          <Link
            to="/user/orders?status=ACTIVE&period=today"
            className="flex flex-col items-center text-center gap-1 p-2.5 sm:p-3 rounded-2xl bg-sky-50/50 border border-sky-100 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-sky-600 border border-sky-200 flex items-center justify-center shadow-xs">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-700 font-bold mt-1">Ongoing</span>
            <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight">
              {displayInTransit}
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">In Transit</span>
          </Link>

          <Link
            to="/user/orders?status=DELIVERED&period=today"
            className="flex flex-col items-center text-center gap-1 p-2.5 sm:p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-700 font-bold mt-1">Delivered</span>
            <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight">
              {displayDelivered}
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Ready Slip</span>
          </Link>
        </div>

        {/* Sync status footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>All weighbridge channels synchronized</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-600 hover:text-amber-700 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4. DELIVERY OTP MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 font-display">Delivery Gate Pass OTP</h3>
                <p className="text-xs text-slate-500">Provide to driver upon unloading</p>
              </div>
            </div>

            {activeOtpOrders.length > 0 ? (
              <>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {activeOtpOrders.map((o) => (
                    <div key={o._id} className="bg-slate-900 text-white rounded-2xl p-5 text-center space-y-2">
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                        #{o.orderNumber}
                      </div>
                      <div className="text-3xl font-mono font-black text-amber-400 tracking-[0.3em]">
                        {o.deliveryOtpDisplay}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyOtp(o.deliveryOtpDisplay, o._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors"
                      >
                        {copiedOrderId === o._id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
                  💡 <span className="font-semibold text-slate-700">Security Note:</span> Share this OTP with the driver only after the dump truck has reached your site and the weighbridge slip is inspected.
                </div>
              </>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-100">
                <p className="text-sm font-bold text-slate-700">No active delivery right now</p>
                <p className="text-xs text-slate-500 mt-1">Your Gate Pass OTP will appear here once a dispatch is out for delivery.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs active:scale-98 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 5. TRACK VEHICLE MODAL -- pick an active order, then see only its live tracking */}
      {showTrackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 relative max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowTrackModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            {!trackOrder ? (
              <>
                <div className="flex items-center gap-3 pr-8">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 font-display">Track Vehicle</h3>
                    <p className="text-xs text-slate-500">Select an active order to track</p>
                  </div>
                </div>

                {activeTrackOrders.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-100">
                    <p className="text-sm font-bold text-slate-700">No active orders right now</p>
                    <p className="text-xs text-slate-500 mt-1">Once an order is placed and dispatched, you can track it here.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeTrackOrders.map((o) => (
                      <button
                        key={o._id}
                        type="button"
                        onClick={() => setTrackOrderId(o._id)}
                        className="w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all text-left"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-slate-900">#{o.orderNumber}</span>
                            <StatusBadge status={o.orderStatus} size="sm" />
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {o.productNameSnapshot} • {formatOrderQuantity(o)}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setTrackOrderId(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Back to active orders</span>
                </button>

                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-600" />
                    <span>Live Dispatch Tracking — #{trackOrder.orderNumber}</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-mono shrink-0">
                    Status: <span className="text-slate-900 font-black">{trackOrder.orderStatus}</span>
                  </span>
                </div>

                <DeliveryTimeline order={trackOrder} />
              </>
            )}
          </div>
        </div>
      )}

      {/* 6. CHALLAN SLIPS MODAL -- pick an order, then see only its weighbridge slip photo */}
      {showChallanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 relative max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowChallanModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            {!challanOrder ? (
              <>
                <div className="flex items-center gap-3 pr-8">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 font-display">Challan Slips</h3>
                    <p className="text-xs text-slate-500">Select an order to view its weighbridge slip</p>
                  </div>
                </div>

                {challanOrders.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-100">
                    <p className="text-sm font-bold text-slate-700">No weighbridge slips yet</p>
                    <p className="text-xs text-slate-500 mt-1">Once a dealer uploads a weighbridge slip for your order, it'll appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {challanOrders.map((o) => (
                      <button
                        key={o._id}
                        type="button"
                        onClick={() => setChallanOrderId(o._id)}
                        className="w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all text-left"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-slate-900">#{o.orderNumber}</span>
                            <StatusBadge status={o.orderStatus} size="sm" />
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {o.productNameSnapshot} • {formatOrderQuantity(o)}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setChallanOrderId(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Back to orders</span>
                </button>

                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-600" />
                    <span>Weighbridge Slip — #{challanOrder.orderNumber}</span>
                  </h3>
                  {challanOrder.totalWeight && (
                    <span className="text-xs text-slate-500 font-mono shrink-0">
                      <span className="text-slate-900 font-black">{challanOrder.totalWeight} Ton</span>
                    </span>
                  )}
                </div>

                <div className="relative group rounded-2xl overflow-hidden border border-slate-200">
                  <img
                    src={challanOrder.waybridgePhotoUrl}
                    alt="Weighbridge Slip Photo"
                    className="w-full max-h-96 object-contain bg-slate-50"
                  />
                  <a
                    href={challanOrder.waybridgePhotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full Size
                  </a>
                </div>

                <a
                  href={challanOrder.waybridgePhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs active:scale-98 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open / Download</span>
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* 7. ORDER HISTORY MODAL -- completed order invoices, filterable by Today/Month/Site */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 relative max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 font-display">Order History</h3>
                <p className="text-xs text-slate-500">Completed order invoices</p>
              </div>
            </div>

            {/* Period Filter */}
            <div className="inline-flex items-center bg-slate-100 rounded-full p-0.5 text-[10px] sm:text-xs font-bold w-full">
              {[
                { id: 'ALL', label: 'All Time' },
                { id: 'MONTH', label: 'This Month' },
                { id: 'TODAY', label: 'Today' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setHistoryPeriod(p.id)}
                  className={`flex-1 px-3 py-1.5 rounded-full transition-all ${
                    historyPeriod === p.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Site Filter */}
            {siteOptions.length > 0 && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <select
                  value={historySite}
                  onChange={(e) => setHistorySite(e.target.value)}
                  className="app-select w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="ALL">All Site Locations</option>
                  {siteOptions.map((site) => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Invoice List */}
            {historyOrders.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-100">
                <p className="text-sm font-bold text-slate-700">No completed orders found</p>
                <p className="text-xs text-slate-500 mt-1">Try a different filter, or check back once a delivery is completed.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {historyOrders.map((o) => (
                  <Link
                    key={o._id}
                    to={`/user/orders/${o._id}/invoice`}
                    onClick={() => setShowHistoryModal(false)}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-xs text-slate-900">#{o.orderNumber}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(o.deliveredAt || o.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        {o.productNameSnapshot} • {getOrderSite(o)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-slate-900 font-mono">{formatINR(o.totalAmount)}</span>
                      <FileText className="w-4 h-4 text-indigo-500" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
