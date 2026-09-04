import React, { useState, useEffect } from 'react';
import { orderService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import {
  Truck,
  Phone,
  ShieldCheck,
  FileCheck,
  Scale,
  MapPin,
  ExternalLink,
  Search,
  Navigation
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeliveryMonitoring() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadDeliveries = async () => {
    try {
      const res = await orderService.getAllAdmin({ limit: 100 });
      if (res.data?.orders) {
        // Filter orders that have been accepted or dispatched
        const active = res.data.orders.filter((o) =>
          ['ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.orderStatus)
        );
        setOrders(active);
      }
    } catch (err) {
      toast.error('Failed to load delivery radar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
    const interval = setInterval(loadDeliveries, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Scanning live logistics fleet radar..." />;
  }

  const filteredOrders = orders.filter((o) =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.driverName?.toLowerCase().includes(search.toLowerCase()) ||
    o.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.shippingAddress.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Truck className="w-3.5 h-3.5" />
            Fleet Dispatch Radar
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">Delivery Oversight & Monitoring</h1>
        </div>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search Driver, Plate, Order..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Delivery Radar Grid */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No active fleet deliveries"
          description="Dispatches will appear here once dealers assign drivers and transit permits."
          icon={Truck}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredOrders.map((order) => (
            <div
              key={order._id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl hover:border-slate-700 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-white text-base">#{order.orderNumber}</span>
                  <StatusBadge status={order.orderStatus} />
                </div>
                <div className="text-xs text-slate-400">
                  Customer: <span className="font-semibold text-white">{order.userId?.name}</span> ({order.userId?.mobile})
                </div>
              </div>

              {/* Specs & Driver */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block uppercase text-[10px] font-bold">Fleet Partner</span>
                  <span className="font-bold text-white text-sm">{order.dealerId?.companyName || order.dealerId?.name || 'Unassigned'}</span>
                  <span className="text-slate-400 block font-mono">{order.dealerId?.mobile}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block uppercase text-[10px] font-bold">Driver Assigned</span>
                  <span className="font-bold text-white text-sm">{order.driverName || 'Pending'}</span>
                  {order.driverMobile ? (
                    <a href={`tel:${order.driverMobile}`} className="text-amber-400 font-bold block font-mono">
                      {order.driverMobile}
                    </a>
                  ) : (
                    <span className="text-slate-500 block">No phone</span>
                  )}
                  <span className="text-emerald-400 font-mono font-bold uppercase block text-[11px]">
                    {order.vehicleNumber || 'No Plate'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block uppercase text-[10px] font-bold">Payload</span>
                  <span className="font-bold text-slate-200">{order.productNameSnapshot}</span>
                  <span className="text-amber-400 font-bold font-mono block">{formatOrderQuantity(order)}</span>
                  <span className="text-[10px] text-slate-500">{formatOrderTransport(order)}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-slate-500 block uppercase text-[10px] font-bold">Compliance Documents</span>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span>Royalty:</span>
                      {order.riverRoyaltyUrl ? (
                        <a href={order.riverRoyaltyUrl} target="_blank" rel="noreferrer" className="text-amber-400 font-bold hover:underline flex items-center gap-0.5">
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500">Missing</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Weighbridge:</span>
                      {order.waybridgePhotoUrl ? (
                        <a href={order.waybridgePhotoUrl} target="_blank" rel="noreferrer" className="text-emerald-400 font-bold hover:underline flex items-center gap-0.5">
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500">Missing</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Destination */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-slate-200">{order.shippingAddress}</span>
                </div>

                <a
                  href={`https://maps.google.com/?q=${order.latitude},${order.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-400 shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Drop Point GPS
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
