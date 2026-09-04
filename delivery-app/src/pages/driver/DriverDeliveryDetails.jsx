import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderService, deliveryService, driverService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Truck,
  MapPin,
  Phone,
  MessageSquare,
  Navigation,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  FileText,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Radio
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverDeliveryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [broadcastingGps, setBroadcastingGps] = useState(false);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrderById(id);
      if (res.data?.order) {
        setOrder(res.data.order);
      }
    } catch (err) {
      toast.error('Could not load delivery details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Handle Delivery OTP Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!deliveryOtp || deliveryOtp.trim().length !== 6) {
      toast.error('Please enter the valid 6-digit Delivery OTP provided by customer.');
      return;
    }

    try {
      setVerifyingOtp(true);
      await deliveryService.verifyOtp(id, deliveryOtp.trim());
      toast.success('🎉 Delivery OTP Verified! Order successfully completed.');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid Delivery OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Broadcast Live GPS Location to Customer
  const handleBroadcastGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setBroadcastingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude, heading, speed } = pos.coords;
          await driverService.updateDriverLocation(id, {
            latitude,
            longitude,
            heading: heading || 0,
            speed: speed || 0
          });
          toast.success('Live GPS coordinates broadcasted to customer!');
        } catch (err) {
          toast.error('Failed to update live GPS.');
        } finally {
          setBroadcastingGps(false);
        }
      },
      (err) => {
        toast.error(`GPS Error: ${err.message}`);
        setBroadcastingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (loading) return <LoadingSpinner />;
  if (!order) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        Order not found.
      </div>
    );
  }

  const mapUrl = order.latitude && order.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.shippingAddress || '')}`;

  const customerMobile = order.shippingDetails?.mobile || order.userId?.mobile;
  const customerName = order.shippingDetails?.fullName || order.userId?.name;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back Button */}
      <Link
        to="/driver/deliveries"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Tasks
      </Link>

      {/* Main Delivery Header Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-slate-400">#{order.orderNumber}</span>
            <h1 className="text-2xl font-black text-white font-display mt-0.5">
              {order.numberOfTractors || order.quantity} {order.transportType || order.vehicleType || 'Load(s)'} of {order.productNameSnapshot}
            </h1>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              order.orderStatus === 'DELIVERED'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {order.orderStatus.replace('_', ' ')}
          </span>
        </div>

        {/* Live Navigation Action */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Navigation className="w-4 h-4" />
            <span>Open Google Maps Navigation</span>
          </a>

          <button
            onClick={handleBroadcastGps}
            disabled={broadcastingGps}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Radio className={`w-4 h-4 text-emerald-400 ${broadcastingGps ? 'animate-pulse' : ''}`} />
            <span>{broadcastingGps ? 'Broadcasting...' : 'Broadcast Live GPS'}</span>
          </button>
        </div>
      </div>

      {/* Customer & Location Details */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-400" /> Destination Drop-Off
        </h2>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-sm text-slate-200 space-y-2">
          <p className="font-semibold text-white leading-relaxed">{order.shippingAddress}</p>
          {order.shippingDetails?.landmark && (
            <p className="text-xs text-amber-400/90">Landmark: {order.shippingDetails.landmark}</p>
          )}
          {order.deliveryInstructions && (
            <p className="text-xs text-slate-400 italic">Instructions: "{order.deliveryInstructions}"</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {customerMobile && (
            <>
              <a
                href={`tel:+91${customerMobile}`}
                className="flex-1 min-w-[140px] py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 text-emerald-400" /> Call ({customerName})
              </a>
              <a
                href={`https://wa.me/91${customerMobile}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-[140px] py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp
              </a>
            </>
          )}
        </div>
      </div>

      {/* Delivery OTP Verification Box */}
      {order.orderStatus !== 'DELIVERED' ? (
        <div className="bg-gradient-to-tr from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <KeyRound className="w-5 h-5" />
            <span>Customer Drop-off Verification</span>
          </div>
          <p className="text-xs text-slate-300">
            Ask customer for the 6-digit Delivery OTP once materials have been offloaded at the destination site.
          </p>

          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                required
                maxLength={6}
                value={deliveryOtp}
                onChange={(e) => setDeliveryOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit OTP"
                className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={verifyingOtp || deliveryOtp.length !== 6}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {verifyingOtp ? 'Verifying...' : 'Verify OTP & Complete'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-emerald-950/30 border border-emerald-500/30 p-6 rounded-2xl text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Delivery Completed & Verified</h3>
          <p className="text-xs text-emerald-300/80">
            Delivered on {new Date(order.deliveredAt || order.updatedAt).toLocaleString('en-IN')}
          </p>
        </div>
      )}

      {/* Weighbridge & River Royalty Photos (If Uploaded) */}
      {(order.riverRoyaltyUrl || order.waybridgePhotoUrl) && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" /> Dispatch Slips & Documents
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {order.riverRoyaltyUrl && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-2 font-semibold">River Royalty Slip</span>
                <img
                  src={order.riverRoyaltyUrl}
                  alt="River Royalty"
                  className="w-full h-40 object-cover rounded-lg"
                />
              </div>
            )}
            {order.waybridgePhotoUrl && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-2 font-semibold">Weighbridge Slip</span>
                <img
                  src={order.waybridgePhotoUrl}
                  alt="Weighbridge Slip"
                  className="w-full h-40 object-cover rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

