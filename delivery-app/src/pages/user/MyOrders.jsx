import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import { Package, Search, Filter, ArrowRight, Truck, Calendar, FileText } from 'lucide-react';

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
    return <LoadingSpinner message="Fetching order history..." />;
  }

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.productNameSnapshot.toLowerCase().includes(search.toLowerCase()) ||
      o.shippingAddress.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && ['PLACED', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)) ||
      (statusFilter === 'DELIVERED' && o.orderStatus === 'DELIVERED') ||
      (statusFilter === 'PENDING' && o.orderStatus === 'PENDING_PAYMENT');

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">My Material Orders</h1>
          <p className="text-xs text-slate-400">Track dispatch progress, driver contacts, and delivery OTPs</p>
        </div>

        <Link
          to="/user/create-order"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-brand-500/20 self-start"
        >
          <Package className="w-4 h-4" />
          Create New Order
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by Order ID, material, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: `All (${orders.length})` },
            { id: 'ACTIVE', label: `In Transit (${orders.filter((o) => ['PLACED', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)).length})` },
            { id: 'DELIVERED', label: `Delivered (${orders.filter((o) => o.orderStatus === 'DELIVERED').length})` },
            { id: 'PENDING', label: `Pending (${orders.filter((o) => o.orderStatus === 'PENDING_PAYMENT').length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-brand-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Try adjusting your filter or search query, or place a new order."
          actionText="Create Order"
          onAction={() => window.location.assign('/user/create-order')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order._id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition-all shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono font-bold text-white text-base">#{order.orderNumber}</span>
                  <StatusBadge status={order.orderStatus} />
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(order.createdAt)}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{order.productNameSnapshot}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatOrderQuantity(order)} • {formatOrderTransport(order)}{' '}
                    {order.sandLocation ? `• Sand from ${order.sandLocation}` : ''}
                    {order.aggregateType ? `• Grade: ${order.aggregateType}` : ''}
                  </p>
                </div>

                <div className="text-xs text-slate-300 flex items-center gap-1.5">
                  <span className="text-slate-500">Destination:</span>
                  <span className="truncate max-w-md">{order.shippingAddress}</span>
                </div>
              </div>

              {/* Right side info & Action */}
              <div className="flex items-center justify-between lg:justify-end gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                <div className="text-left lg:text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Amount</span>
                  <span className="text-xl font-black text-brand-400 font-mono">
                    {formatINR(order.totalAmount)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/user/orders/${order._id}/invoice`}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-400 border border-amber-500/30 transition-colors"
                    title="Download / View Tax Invoice"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Invoice</span>
                  </Link>
                  <Link
                    to={`/user/orders/${order._id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-100 transition-colors border border-slate-700"
                  >
                    View Details & OTP
                    <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
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
