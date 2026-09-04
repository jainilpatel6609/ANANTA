import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { driverService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Truck,
  Navigation,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  ArrowRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverDashboard() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await driverService.getMyDeliveries();
      if (res.data?.deliveries) {
        setDeliveries(res.data.deliveries);
      }
    } catch (err) {
      toast.error('Could not load assigned deliveries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const activeDeliveries = deliveries.filter((d) => ['ACCEPTED', 'OUT_FOR_DELIVERY'].includes(d.orderStatus));
  const completedDeliveries = deliveries.filter((d) => d.orderStatus === 'DELIVERED');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-2">
            Active Fleet Driver
          </span>
          <h1 className="text-2xl font-black text-white font-display">
            Welcome, {user?.name || 'Driver'}! 🚛
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Vehicle Registration: <span className="font-mono text-emerald-400 font-bold">{user?.vehicleNumber}</span>
          </p>
        </div>

        <button
          onClick={fetchTasks}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
        >
          Refresh Tasks
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono">{activeDeliveries.length}</div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Tasks</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono">{completedDeliveries.length}</div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completed</div>
            </div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono">{deliveries.length}</div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Orders</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Tasks Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-400" />
            Active Delivery Tasks
          </h2>
          <Link to="/driver/deliveries" className="text-xs text-emerald-400 hover:underline font-semibold">
            View All ({deliveries.length})
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : activeDeliveries.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400/60 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">All Clear! No Active Tasks</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You are currently caught up with all assigned material dispatches.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeDeliveries.map((order) => {
              const mapUrl = order.latitude && order.longitude
                ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.shippingAddress || '')}`;

              return (
                <div
                  key={order._id}
                  className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                          #{order.orderNumber}
                        </span>
                        <h3 className="text-base font-black text-white mt-1">
                          {order.numberOfTractors || order.quantity} {order.transportType || order.vehicleType || 'Load(s)'} — {order.productNameSnapshot}
                        </h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
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
                          <Phone className="w-3.5 h-3.5" /> Call Customer
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Live Map Route
                    </a>
                    <Link
                      to={`/driver/deliveries/${order._id}`}
                      className="flex-1 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      <span>Task Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

