import React, { useState, useEffect, useMemo } from 'react';
import { orderService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import {
  formatINR,
  formatDate,
  formatOrderQuantity,
  formatOrderTransport,
  isTractorOrder,
  getOrderGrandTotal
} from '../../utils/formatters';
import { ORDER_STATUS_CONFIG } from '../../utils/constants';
import { ListOrdered, Search, ChevronDown, Calendar, User, Truck, Package, Wallet } from 'lucide-react';

const DATE_FILTERS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' }
];

const STATUS_OPTIONS = ['PLACED', 'DEALER_NOTIFIED', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

const isWithinDateFilter = (dateStr, filterKey) => {
  if (filterKey === 'all' || !dateStr) return true;
  const date = new Date(dateStr);
  const now = new Date();

  if (filterKey === 'today') {
    return date.toDateString() === now.toDateString();
  }
  if (filterKey === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return date >= weekAgo && date <= now;
  }
  if (filterKey === 'month') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }
  if (filterKey === 'year') {
    return date.getFullYear() === now.getFullYear();
  }
  return true;
};

export default function DealerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const res = await orderService.getDealerDeliveries();
        setOrders(res.data?.orders || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        !search ||
        o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        o.productNameSnapshot?.toLowerCase().includes(search.toLowerCase()) ||
        o.userId?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || o.orderStatus === statusFilter;
      const matchesDate = isWithinDateFilter(o.createdAt, dateFilter);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, search, statusFilter, dateFilter]);

  if (loading) {
    return <LoadingSpinner message="Loading your orders..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Orders</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-black text-xs border border-amber-200">
            {filteredOrders.length} of {orders.length}
          </span>
        </div>
        <p className="text-xs text-slate-500">Every order ever assigned to you, with full filtering and details.</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search Order No., Material, Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 min-h-[44px]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 min-h-[44px] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_CONFIG[s]?.label || s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setDateFilter(f.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilter === f.key
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="No orders match your current search/filter combination."
          icon={ListOrdered}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order._id;
            return (
              <div
                key={order._id}
                className="bg-white border border-slate-200/80 hover:border-slate-300 transition-all rounded-2xl p-4 sm:p-5 shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                  className="w-full flex flex-wrap items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900 text-sm">#{order.orderNumber}</span>
                    <StatusBadge status={order.orderStatus} size="sm" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(order.createdAt)}
                    </span>
                    <span className="font-mono font-black text-amber-600 text-sm">
                      {formatINR(getOrderGrandTotal(order))}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mt-4 pt-4 border-t border-slate-100">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-slate-500 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                        <Package className="w-3 h-3" /> Material
                      </span>
                      <span className="font-bold text-slate-900 text-sm block">{order.productNameSnapshot}</span>
                      <span className="text-amber-600 font-medium block">
                        {formatOrderQuantity(order)} ({formatOrderTransport(order)})
                      </span>
                      {order.category === 'Sand' && order.vehicleOptionSnapshot ? (
                        <span className="text-slate-500 block">{order.vehicleOptionSnapshot}</span>
                      ) : null}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-slate-500 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                        <User className="w-3 h-3" /> Customer
                      </span>
                      <span className="font-bold text-slate-900 text-sm block">{order.userId?.name || 'Customer'}</span>
                      <span className="text-slate-600 font-mono block">{order.userId?.mobile || order.userId?.whatsappNumber || '—'}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-slate-500 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                        <Truck className="w-3 h-3" /> Driver & Fleet
                      </span>
                      <span className="font-bold text-slate-700 text-sm block">{order.driverName || 'Not Assigned Yet'}</span>
                      {order.vehicleNumber && (
                        <span className="text-emerald-600 font-mono font-bold uppercase text-[11px] block">{order.vehicleNumber}</span>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-slate-500 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                        <Wallet className="w-3 h-3" /> Payment
                      </span>
                      <span className="font-bold text-slate-900 text-sm block">{formatINR(getOrderGrandTotal(order))}</span>
                      <span className="text-slate-500 block">
                        Upfront: {order.paymentStatus}
                        {!isTractorOrder(order) && order.fulfillmentStage && order.fulfillmentStage !== 'PAYMENT_CONFIRMED'
                          ? ` • Final: ${order.finalPaymentStatus}`
                          : ''}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 sm:col-span-2 lg:col-span-2">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Delivery Site</span>
                      <span className="text-slate-700 leading-snug block">{order.shippingAddress}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 sm:col-span-2 lg:col-span-2">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Order Timeline</span>
                      <span className="text-slate-700 block">Placed: {formatDate(order.createdAt)}</span>
                      {order.deliveredAt && <span className="text-slate-700 block">Delivered: {formatDate(order.deliveredAt)}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
