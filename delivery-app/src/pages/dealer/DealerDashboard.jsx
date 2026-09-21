import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services';
import StatsCard from '../../components/StatsCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import OrderAlarmBanner from '../../components/OrderAlarmBanner';
import NotificationPermissionPrompt from '../../components/NotificationPermissionPrompt';
import { useAlarm } from '../../hooks/useAlarm';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import {
  Inbox,
  CheckCircle,
  Truck,
  History,
  Coins,
  ArrowRight,
  ShieldCheck,
  Building2,
  Phone,
  KeyRound,
  ChevronRight
} from 'lucide-react';

export default function DealerDashboard() {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const { isMuted, triggerAlarm, clearAlarm, toggleMute } = useAlarm();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [availRes, myRes] = await Promise.all([
          orderService.getDealerAvailable(),
          orderService.getDealerDeliveries()
        ]);
        if (availRes.data?.orders) {
          const orders = availRes.data.orders;
          setAvailableOrders(orders);
          const urgentOrder = orders.find(
            (o) => o.dealerAlarmActive || (o.dealerResponseStatus === 'PENDING' && o.assignedDealerId)
          );
          if (urgentOrder) {
            triggerAlarm('DEALER');
          } else {
            clearAlarm();
          }
        }
        if (myRes.data?.orders) setMyDeliveries(myRes.data.orders);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dealer dispatch terminal..." />;
  }

  const acceptedCount = myDeliveries.filter((o) => o.orderStatus === 'ACCEPTED').length;
  const activeCount = myDeliveries.filter((o) => o.orderStatus === 'OUT_FOR_DELIVERY').length;
  const completedCount = myDeliveries.filter((o) => o.orderStatus === 'DELIVERED').length;
  const totalRevenue = myDeliveries
    .filter((o) => o.orderStatus === 'DELIVERED')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const urgentAssigned = availableOrders.filter((o) => o.dealerAlarmActive || o.assignedDealerId);

  return (
    <div className="space-y-6 pb-12">
      {/* Mobile Device Push Permission Prompt */}
      <NotificationPermissionPrompt role="DEALER" />

      {/* Urgent Dispatch Alarm Banner */}
      {urgentAssigned.length > 0 && (
        <OrderAlarmBanner
          role="DEALER"
          count={urgentAssigned.length}
          type="NEW_ORDER"
          latestOrder={urgentAssigned[0]}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      )}

      {/* Dealer Welcome Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-500/20">
            <Building2 className="w-3.5 h-3.5" />
            Dealer Logistics Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            {user?.companyName || user?.name}
          </h1>
          <p className="text-xs text-slate-400">
            Registered Mobile: <span className="text-slate-200 font-mono font-semibold">{user?.mobile}</span> • Depot:{' '}
            <span className="text-emerald-400 font-bold">{user?.pincode ? `PIN ${user.pincode}` : 'Active'}</span>
          </p>
        </div>

        {availableOrders.length > 0 && (
          <Link
            to="/dealer/new-orders"
            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-semibold text-sm transition-all shadow-sm min-h-[44px]"
          >
            <Inbox className="w-5 h-5" />
            <span>{availableOrders.length} New Orders in Pool</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Available Pool"
          value={availableOrders.length}
          subtitle="Awaiting acceptance"
          icon={Inbox}
          color="brand"
        />
        <StatsCard
          title="Accepted Orders"
          value={acceptedCount}
          subtitle="Assign driver & slips"
          icon={CheckCircle}
          color="purple"
        />
        <StatsCard
          title="Out For Delivery"
          value={activeCount}
          subtitle="En route • Awaiting OTP"
          icon={Truck}
          color="blue"
        />
        <StatsCard
          title="Completed"
          value={completedCount}
          subtitle="OTP verified on-site"
          icon={ShieldCheck}
          color="emerald"
        />
      </div>

      {/* Quick Action Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Orders Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm sm:text-base font-black text-white font-display flex items-center gap-2">
              <Inbox className="w-4 h-4 text-brand-400" />
              <span>New Order Pool</span>
            </h3>
            <Link to="/dealer/new-orders" className="text-xs font-bold text-brand-400 hover:underline flex items-center gap-1">
              <span>View All ({availableOrders.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {availableOrders.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No unassigned orders available. You will receive real-time notifications when customers place new orders.
            </div>
          ) : (
            <div className="space-y-3">
              {availableOrders.slice(0, 3).map((order) => (
                <div
                  key={order._id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-xs">#{order.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {formatINR(order.totalAmount)}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-200">
                      {formatOrderQuantity(order)} {order.productNameSnapshot}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">
                      {order.shippingAddress || (typeof order.distanceToDealer === 'number' ? `~${order.distanceToDealer} km away · address unlocks on accept` : 'Address unlocks on accept')}
                    </div>
                  </div>
                  <Link
                    to="/dealer/new-orders"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-semibold shrink-0 transition-all min-h-[38px]"
                  >
                    Accept Order
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Deliveries Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-white font-display flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-400" />
              <span>Active Shipments & Handover OTP</span>
            </h3>
            <Link to="/dealer/active" className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1">
              <span>Manage ({activeCount})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeCount === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No vehicles currently out for delivery. Check your accepted orders to assign drivers and dispatch.
            </div>
          ) : (
            <div className="space-y-3">
              {myDeliveries
                .filter((o) => o.orderStatus === 'OUT_FOR_DELIVERY')
                .slice(0, 3)
                .map((order) => (
                  <div
                    key={order._id}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1">
                      <span className="font-mono font-bold text-white text-xs">#{order.orderNumber}</span>
                      <div className="text-xs text-slate-200">
                        Driver: <strong className="text-amber-300">{order.driverName}</strong> ({order.vehicleNumber})
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{order.shippingAddress}</div>
                    </div>
                    <Link
                      to="/dealer/active"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shrink-0 transition-all min-h-[38px]"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Enter OTP</span>
                    </Link>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
