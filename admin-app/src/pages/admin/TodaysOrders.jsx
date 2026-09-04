import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import { Clock, Search, Truck, Phone, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';

export default function TodaysOrders() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const loadTodays = async () => {
    try {
      const res = await adminService.getDashboardStats();
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodays();
    const interval = setInterval(loadTodays, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Scanning today's active dispatch board..." />;
  }

  const { todayOrders = [], todaySummary = {} } = stats || {};

  const filteredOrders = todayOrders.filter((o) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ACTIVE') return ['PLACED', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.orderStatus);
    if (filterStatus === 'DELIVERED') return o.orderStatus === 'DELIVERED';
    return o.orderStatus === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Live Dispatch Board
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">Today's Orders Command Center</h1>
        </div>

        <button
          onClick={loadTodays}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-400 border border-slate-800 self-start"
        >
          Refresh Live
        </button>
      </div>

      {/* Today's KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Today</span>
          <span className="text-2xl font-black text-white font-mono">{todaySummary.total || 0}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-yellow-400 uppercase font-bold block">Pending</span>
          <span className="text-2xl font-black text-yellow-400 font-mono">{todaySummary.pending || 0}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-purple-400 uppercase font-bold block">Accepted</span>
          <span className="text-2xl font-black text-purple-400 font-mono">{todaySummary.accepted || 0}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-blue-400 uppercase font-bold block">Out For Delivery</span>
          <span className="text-2xl font-black text-blue-400 font-mono">{todaySummary.outForDelivery || 0}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-emerald-400 uppercase font-bold block">Delivered (OTP)</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">{todaySummary.delivered || 0}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'ACTIVE', 'DELIVERED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterStatus(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              filterStatus === tab
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab === 'ALL' ? `All Today (${todayOrders.length})` : tab}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders recorded for today"
          description="Orders placed during today's business cycle will populate here in real-time."
          icon={Clock}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order._id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-white text-base">#{order.orderNumber}</span>
                  <StatusBadge status={order.orderStatus} />
                </div>
                <div className="text-xs text-slate-400">{formatDate(order.createdAt)}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase text-[10px] font-bold">Customer</span>
                  <span className="font-bold text-white">{order.userId?.name}</span>
                  <span className="text-slate-400 font-mono block">{order.userId?.mobile}</span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase text-[10px] font-bold">Material & Payload</span>
                  <span className="font-bold text-slate-200">{order.productNameSnapshot}</span>
                  <span className="text-amber-400 font-bold block">{formatOrderQuantity(order)} ({formatOrderTransport(order)})</span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase text-[10px] font-bold">Assigned Dealer</span>
                  <span className="font-bold text-slate-200">
                    {order.dealerId?.companyName || order.dealerId?.name || 'Unassigned'}
                  </span>
                  {order.driverName && (
                    <span className="text-slate-400 block">
                      Driver: {order.driverName} ({order.vehicleNumber})
                    </span>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-slate-500 block uppercase text-[10px] font-bold">Total Amount</span>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    {formatINR(order.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 truncate max-w-lg">
                  <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span className="truncate">{order.shippingAddress}</span>
                </div>

                <Link
                  to={`/user/orders/${order._id}`}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs shrink-0"
                >
                  Full Inspector
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
