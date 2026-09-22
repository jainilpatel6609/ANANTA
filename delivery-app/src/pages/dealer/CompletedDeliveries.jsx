import React, { useState, useEffect } from 'react';
import { orderService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import { ShieldCheck, Calendar, Search, Truck, ExternalLink, Package } from 'lucide-react';

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
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.productNameSnapshot?.toLowerCase().includes(search.toLowerCase()) ||
    o.driverName?.toLowerCase().includes(search.toLowerCase()) ||
    o.shippingAddress?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white font-display">Completed Deliveries</h1>
            {orders.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-black text-xs border border-emerald-500/20">
                {orders.length} verified
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical log of all successfully delivered & OTP verified construction mineral dispatches.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search completed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 min-h-[44px]"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No completed deliveries found"
          description={search ? "No archived orders match your search query." : "Completed deliveries with verified OTPs will be archived here."}
          icon={ShieldCheck}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order._id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-white text-base">#{order.orderNumber}</span>
                  <StatusBadge status={order.orderStatus} />
                </div>
                <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified: {formatDate(order.deliveryVerifiedAt || order.deliveredAt)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Material & Tonnage</span>
                  <span className="font-bold text-white text-sm block">{order.productNameSnapshot}</span>
                  <span className="text-brand-400 font-medium block">{formatOrderQuantity(order)} ({formatOrderTransport(order)})</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Driver & Fleet</span>
                  <span className="font-bold text-slate-200 block text-sm">{order.driverName || 'Self Dispatch'}</span>
                  <span className="text-emerald-400 font-mono font-bold uppercase text-[11px] block">{order.vehicleNumber}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1 sm:col-span-1">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Delivery Site</span>
                  <span className="text-slate-300 leading-snug line-clamp-2 block">{order.shippingAddress}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1 text-left sm:text-right flex flex-col justify-center">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                    {order.finalPaymentStatus === 'PAID' ? 'Order Value (Final)' : 'Order Value'}
                  </span>
                  <span className="font-black text-brand-400 font-mono text-lg block">
                    {formatINR(order.finalPaymentStatus === 'PAID' ? order.finalPaymentAmount : order.totalAmount)}
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
