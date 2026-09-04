import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services';
import StatsCard from '../../components/StatsCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Building,
  ShieldCheck
} from 'lucide-react';

export default function UserDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
    return <LoadingSpinner message="Loading customer dashboard..." />;
  }

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => ['PENDING_PAYMENT', 'PLACED'].includes(o.orderStatus)).length;
  const inTransitOrders = orders.filter((o) => ['ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)).length;
  const deliveredOrders = orders.filter((o) => o.orderStatus === 'DELIVERED').length;
  const totalSpend = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-bold uppercase tracking-wider">
            <Building className="w-3.5 h-3.5" />
            {user?.userType || 'Customer'} Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {user?.companyName ? `${user.companyName} • ` : ''}Mobile: <span className="text-slate-200 font-mono">{user?.mobile}</span>
          </p>
        </div>

        <Link
          to="/user/create-order"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-brand-500/25 hover:scale-105"
        >
          <PlusCircle className="w-5 h-5" />
          Create New Material Order
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Orders"
          value={totalOrders}
          subtitle="All-time material bookings"
          icon={Package}
          color="brand"
        />
        <StatsCard
          title="In Transit / Accepted"
          value={inTransitOrders}
          subtitle="Fleet moving to your sites"
          icon={Truck}
          color="blue"
        />
        <StatsCard
          title="Delivered & Verified"
          value={deliveredOrders}
          subtitle="OTP verified on-site"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatsCard
          title="Total Supply Value"
          value={formatINR(totalSpend)}
          subtitle="Paid orders summary"
          icon={CreditCard}
          color="purple"
        />
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white font-display">Recent Material Orders</h3>
            <p className="text-xs text-slate-400">Track current dispatches and view weighbridge certificates</p>
          </div>
          {orders.length > 0 && (
            <Link
              to="/user/orders"
              className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              View All Orders ({orders.length}) &rarr;
            </Link>
          )}
        </div>

        {orders.length === 0 ? (
          <EmptyState
            title="No orders placed yet"
            description="Start by creating your first sand, aggregate, or grit order with automated weighbridge tracking."
            actionText="Create Material Order"
            onAction={() => window.location.assign('/user/create-order')}
          />
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Material & Grade</th>
                    <th className="px-4 py-3">Vehicle & Qty</th>
                    <th className="px-4 py-3">Shipping Location</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-white">
                        <Link to={`/user/orders/${order._id}`} className="hover:text-brand-400">
                          #{order.orderNumber}
                        </Link>
                        <div className="text-[10px] text-slate-500">{formatDate(order.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-100">{order.productNameSnapshot}</div>
                        <div className="text-[10px] text-slate-400">
                          {order.aggregateType || order.sandLocation || order.category}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-brand-400">{formatOrderQuantity(order)}</div>
                        <div className="text-[10px] text-slate-400">{formatOrderTransport(order)}</div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px] truncate text-slate-300">
                        {order.shippingAddress}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-100">
                        {formatINR(order.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={order.orderStatus} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/user/orders/${order._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                        >
                          Details
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
