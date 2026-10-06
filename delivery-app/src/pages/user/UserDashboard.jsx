import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import {
  Package,
  Truck,
  PlusCircle,
  ArrowRight,
  CreditCard,
  Building,
  CheckCircle2,
  CheckCircle,
  Clock,
  Sparkles,
  MapPin,
  ChevronRight,
  ShoppingCart,
  Target,
  FileText,
  PhoneCall,
  Navigation,
  ShieldCheck,
  KeyRound,
  X,
  Copy,
  Check
} from 'lucide-react';

export default function UserDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);

  useEffect(() => {
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
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading contractor portal..." />;
  }

  // Real metrics only -- new customers with no orders yet must see zeros, not demo data.
  const displayTotalOrders = orders.length;
  const displayPending = orders.filter((o) => ['PENDING_PAYMENT', 'PLACED'].includes(o.orderStatus)).length;
  const displayInTransit = orders.filter((o) => ['ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)).length;
  const displayDelivered = orders.filter((o) => o.orderStatus === 'DELIVERED').length;

  const activeOrder = orders.find((o) => ['ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.orderStatus));
  const displayOrders = orders.slice(0, 5);
  const currentOtp = activeOrder?.deliveryOtp || null;

  const handleCopyOtp = () => {
    if (!currentOtp) return;
    navigator.clipboard.writeText(currentOtp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
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

      {/* 2. QUICK OPERATIONS (Horizontal Swipeable Row) */}
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
          QUICK OPERATIONS
        </div>
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* 1. Order Material */}
          <Link
            to="/user/create-order"
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-400/80 hover:shadow-md transition-all shrink-0 min-w-[150px] sm:min-w-[170px]"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Order Material</div>
              <div className="text-[10px] text-slate-500 font-medium">Sand & aggregate</div>
            </div>
          </Link>

          {/* 2. Verify Delivery OTP */}
          <button
            type="button"
            onClick={() => setShowOtpModal(true)}
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-400/80 hover:shadow-md transition-all shrink-0 min-w-[155px] sm:min-w-[175px] text-left"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Verify Delivery OTP</div>
              <div className="text-[10px] text-slate-500 font-medium">Confirm receipt</div>
            </div>
          </button>

          {/* 3. Track Vehicle */}
          <Link
            to="/user/orders"
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-sky-400/80 hover:shadow-md transition-all shrink-0 min-w-[145px] sm:min-w-[165px]"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Track Vehicle</div>
              <div className="text-[10px] text-slate-500 font-medium">Live GPS telemetry</div>
            </div>
          </Link>

          {/* 4. Challan Slips */}
          <Link
            to="/user/orders"
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-purple-400/80 hover:shadow-md transition-all shrink-0 min-w-[145px] sm:min-w-[165px]"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Challan Slips</div>
              <div className="text-[10px] text-slate-500 font-medium">Weighbridge PDF</div>
            </div>
          </Link>

          {/* 5. Dispatch Support */}
          <a
            href="tel:9800001111"
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-400/80 hover:shadow-md transition-all shrink-0 min-w-[145px] sm:min-w-[165px]"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Dispatch Support</div>
              <div className="text-[10px] text-slate-500 font-medium">24x7 control room</div>
            </div>
          </a>
        </div>
      </div>

      {/* 3. ORDER STATUS OVERVIEW (Pill Row) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
        <div className="grid grid-cols-3 divide-x divide-slate-200">
          <div className="flex flex-col items-center text-center gap-1.5 px-1">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">Pending Order</span>
            <span className="text-base sm:text-xl font-black text-slate-900 font-mono tracking-tight">
              {displayPending}
            </span>
          </div>

          <div className="flex flex-col items-center text-center gap-1.5 px-1">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">Ongoing Order</span>
            <span className="text-base sm:text-xl font-black text-slate-900 font-mono tracking-tight">
              {displayInTransit}
            </span>
          </div>

          <div className="flex flex-col items-center text-center gap-1.5 px-1">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">Delivered Order</span>
            <span className="text-base sm:text-xl font-black text-slate-900 font-mono tracking-tight">
              {displayDelivered}
            </span>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE DISPATCH TRACKER (Exact Order Card Matching Screenshot) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-black text-slate-900 font-display tracking-tight">
              Active Dispatch Tracker
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Real-time fleet location & gate pass
            </p>
          </div>
          <Link
            to="/user/orders"
            className="text-xs font-black text-amber-600 hover:text-amber-700 flex items-center gap-0.5 active:scale-95 transition-all"
          >
            <span>View All ({displayTotalOrders})</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>

        {/* Order Cards */}
        <div className="space-y-3">
          {displayOrders.length === 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs text-center space-y-2">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No orders yet</p>
              <p className="text-xs text-slate-500">Place your first material order to see it tracked here.</p>
            </div>
          )}
          {displayOrders.map((order) => {
            const orderLink = `/user/orders/${order._id}`;

            return (
              <div
                key={order._id}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3"
              >
                {/* Card Top Row: Order ID, Gate Pass Pill, Status, Date */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs sm:text-sm text-slate-900">
                      #{order.orderNumber}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-wider">
                      GATE PASS
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.orderStatus} size="sm" />
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Material & Specs */}
                <div className="flex items-start justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                      <Truck className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-slate-900 truncate font-display">
                        {order.productNameSnapshot}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {formatOrderTransport(order)} • {formatOrderQuantity(order)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm sm:text-base font-black text-slate-900 font-mono">
                      {formatINR(order.totalAmount)}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold uppercase">
                      {order.paymentStatus || 'PAID'}
                    </div>
                  </div>
                </div>

                {/* Delivery Site Address */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100/80">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate font-medium">{order.shippingAddress}</span>
                </div>

                {/* Action Buttons: Track Fleet GPS + Gate Pass OTP */}
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    to={orderLink}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs active:scale-95 transition-all"
                  >
                    <Navigation className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Track Fleet GPS</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setShowOtpModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 active:scale-95 transition-all shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Gate Pass OTP</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. DELIVERY OTP MODAL */}
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

            {currentOtp ? (
              <>
                <div className="bg-slate-900 text-white rounded-2xl p-5 text-center space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    VERIFICATION CODE
                  </div>
                  <div className="text-3xl font-mono font-black text-amber-400 tracking-[0.3em]">
                    {currentOtp}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyOtp}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors"
                  >
                    {copiedOtp ? (
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
    </div>
  );
}
