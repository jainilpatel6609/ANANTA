import React, { useState, useEffect } from 'react';
import { orderService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import { ShieldCheck, Calendar, Search, Truck, ExternalLink } from 'lucide-react';

export default function CompletedDeliveries() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadCompleted = async () => {
      try {
        const res = await orderService.getDealerDeliveries('DELIVERED');
        if (res.data?.orders) {
          setOrders(res.data.orders);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadCompleted();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading completed deliveries..." />;
  }

  const filteredOrders = orders.filter((o) =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.productNameSnapshot.toLowerCase().includes(search.toLowerCase()) ||
    o.driverName?.toLowerCase().includes(search.toLowerCase()) ||
    o.shippingAddress.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">Completed Deliveries Archive</h1>
          <p className="text-xs text-slate-400">
            Historical log of all successfully delivered & OTP verified construction mineral dispatches.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search completed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No completed deliveries"
          description="Completed deliveries with verified OTPs will be archived here."
          icon={ShieldCheck}
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
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified on {formatDate(order.deliveryVerifiedAt || order.deliveredAt)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Material & Tonnage</span>
                  <span className="font-bold text-white text-sm">{order.productNameSnapshot}</span>
                  <span className="text-brand-400 block">{formatOrderQuantity(order)} ({formatOrderTransport(order)})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Driver & Vehicle</span>
                  <span className="font-semibold text-slate-200">{order.driverName}</span>
                  <span className="text-slate-400 block font-mono uppercase">{order.vehicleNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Delivery Site</span>
                  <span className="text-slate-300 line-clamp-2">{order.shippingAddress}</span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-slate-500 block">Value</span>
                  <span className="font-black text-brand-400 font-mono text-base">
                    {formatINR(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
