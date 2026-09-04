import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { driverService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import {
  Truck,
  Navigation,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  ArrowRight,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await driverService.getMyDeliveries();
      if (res.data?.deliveries) {
        setDeliveries(res.data.deliveries);
      }
    } catch (err) {
      toast.error('Could not load deliveries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filtered = deliveries.filter((d) => {
    const matchesSearch =
      d.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.productNameSnapshot.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.shippingAddress || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && ['ACCEPTED', 'OUT_FOR_DELIVERY'].includes(d.orderStatus)) ||
      (statusFilter === 'DELIVERED' && d.orderStatus === 'DELIVERED');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white font-display">Assigned Deliveries</h1>
          <p className="text-xs text-slate-400 mt-1">View all active and historical material delivery assignments</p>
        </div>
        <button
          onClick={fetchTasks}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, material, or address..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {['ALL', 'ACTIVE', 'DELIVERED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery Cards */}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No Deliveries Found"
          description="You do not have any delivery assignments matching this filter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((order) => {
            const mapUrl = order.latitude && order.longitude
              ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.shippingAddress || '')}`;

            return (
              <div
                key={order._id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                        #{order.orderNumber}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1">
                        {order.numberOfTractors || order.quantity} {order.transportType || order.vehicleType || 'Load(s)'} of {order.productNameSnapshot}
                      </h3>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        order.orderStatus === 'DELIVERED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {order.orderStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4">
                    <div className="flex items-start gap-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{order.shippingAddress}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300 pt-2 border-t border-slate-800/60">
                      <span>Customer: <strong className="text-white">{order.shippingDetails?.fullName || order.userId?.name}</strong></span>
                      <a
                        href={`tel:+91${order.shippingDetails?.mobile || order.userId?.mobile}`}
                        className="text-emerald-400 font-mono font-bold flex items-center gap-1 hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Map
                  </a>
                  <Link
                    to={`/driver/deliveries/${order._id}`}
                    className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <span>View Task</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

