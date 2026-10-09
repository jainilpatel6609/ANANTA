import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orderService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Search, ChevronRight } from 'lucide-react';

const VALID_STATUS_FILTERS = ['ALL', 'ACTIVE', 'DELIVERED', 'PENDING'];

export default function MyOrders() {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const onlyToday = searchParams.get('today') === '1' || searchParams.get('period') === 'today';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(
    VALID_STATUS_FILTERS.includes(initialStatus) ? initialStatus : 'ALL'
  );

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

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

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

    const matchToday = !onlyToday || (o.createdAt && new Date(o.createdAt) >= startOfToday);

    return matchSearch && matchStatus && matchToday;
  });

  return (
    <div className="space-y-3 sm:space-y-6 select-none max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-3xl font-black text-slate-900 font-display tracking-tight">
          My Material Orders
        </h1>
        <p className="text-[11px] sm:text-sm text-slate-500 font-medium">
          Track delivery progress, driver contacts, and gate pass OTPs
        </p>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-xs">
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
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
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
        <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
          {filteredOrders.map((order) => (
            <Link
              key={order._id}
              to={`/user/orders/${order._id}`}
              className="bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-md rounded-xl sm:rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4 transition-all shadow-xs flex items-center justify-between gap-3 active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
                  #{order.orderNumber}
                </span>
                {order.awaitingCustomerDealerChoice && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-wider animate-pulse">
                    Action Needed
                  </span>
                )}
                {order.refundStatus === 'REQUESTED' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-wider">
                    Refund Pending
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
