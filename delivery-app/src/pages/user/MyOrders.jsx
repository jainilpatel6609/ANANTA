import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import { Package, Search, ArrowRight, Truck, Calendar, FileText, MapPin, PlusCircle } from 'lucide-react';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const res = await orderService.getMyOrders();
        if (res.data?.orders) {
          setOrders(res.data.orders);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Fetching material order history..." />;
  }

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.productNameSnapshot?.toLowerCase().includes(search.toLowerCase()) ||
      o.shippingAddress?.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && ['PLACED', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)) ||
      (statusFilter === 'DELIVERED' && o.orderStatus === 'DELIVERED') ||
      (statusFilter === 'PENDING' && o.orderStatus === 'PENDING_PAYMENT');

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
            My Material Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Track delivery progress, driver contacts, and gate pass OTPs
          </p>
        </div>

        <Link
          to="/user/create-order"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 text-white font-black text-xs transition-all shadow-md shadow-slate-900/25 active:scale-95 self-start"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>New Order</span>
        </Link>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search Order ID, material, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white font-medium transition-all"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: `All (${orders.length})` },
            {
              id: 'ACTIVE',
              label: `In Transit (${orders.filter((o) => ['PLACED', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)).length})`
            },
            {
              id: 'DELIVERED',
              label: `Delivered (${orders.filter((o) => o.orderStatus === 'DELIVERED').length})`
            },
            {
              id: 'PENDING',
              label: `Pending (${orders.filter((o) => o.orderStatus === 'PENDING_PAYMENT').length})`
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List Cards */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Try adjusting your filter or search query, or place a new order."
          actionText="Create Order"
          onAction={() => window.location.assign('/user/create-order')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredOrders.map((order) => (
            <div
              key={order._id}
              className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-3xl p-5 transition-all shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
            >
              <div className="space-y-2.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono font-black text-slate-900 text-sm">
                    #{order.orderNumber}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-wider">
                    GATE PASS
                  </span>
                  <StatusBadge status={order.orderStatus} size="sm" />
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(order.createdAt)}
                  </span>
                </div>

                <div>
                  <h3 className="font-black text-slate-900 text-base font-display">
                    {order.productNameSnapshot}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    <span className="text-amber-700 font-bold">{formatOrderQuantity(order)}</span> • {formatOrderTransport(order)}{' '}
                    {order.sandLocation ? `• Sand from ${order.sandLocation}` : ''}
                    {order.aggregateType ? `• Grade: ${order.aggregateType}` : ''}
                  </p>
                </div>

                <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate max-w-md font-medium">{order.shippingAddress}</span>
                </div>
              </div>

              {/* Right Side Info & Action Buttons */}
              <div className="flex items-center justify-between lg:justify-end gap-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                <div className="text-left lg:text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                    Total Amount
                  </span>
                  <span className="text-lg sm:text-xl font-black text-slate-900 font-mono">
                    {formatINR(order.totalAmount)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/user/orders/${order._id}/invoice`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200 transition-all active:scale-95 shadow-2xs"
                    title="Download / View Tax Invoice"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Invoice</span>
                  </Link>
                  <Link
                    to={`/user/orders/${order._id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white transition-all active:scale-95 shadow-xs"
                  >
                    <span>Track & OTP</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
