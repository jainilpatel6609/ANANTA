import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderService, deliveryService } from '../../services';
import { stopNativeLiveLocation } from '../../utils/nativeBridge';
import LoadingSpinner from '../../components/LoadingSpinner';
import LiveCameraModal from '../../components/LiveCameraModal';
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
  Camera,
  SkipForward,
  Clock,
  Weight
} from 'lucide-react';
import toast from 'react-hot-toast';

// The 5 required photos for the Dumper fulfillment flow, in the order they're captured.
const REQUIRED_PHOTO_SLOTS = [
  { key: 'weightBridgeSlip', label: 'Weight Bridge Slip' },
  { key: 'weightBridgeDisplay', label: 'Weight Bridge Display' },
  { key: 'dumperTop', label: 'Dumper Top' },
  { key: 'dumperFront', label: 'Dumper Front' },
  { key: 'dumperRear', label: 'Dumper Rear' }
];

export default function DriverDeliveryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Dumper fulfillment flow (River Royalty -> Stock Yard -> 5 Required Photos)
  const [activeCameraTarget, setActiveCameraTarget] = useState(null); // which photo slot is being captured
  const [uploadingStage, setUploadingStage] = useState(false);
  const [requiredPhotos, setRequiredPhotos] = useState({}); // { [slotKey]: { file, preview } } -- staged locally until all 5 are submitted together

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrderById(id);
      const orderData = res.data?.order || res.data || res.order;
      if (orderData) {
        setOrder(orderData);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not load delivery details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Delivery completed: stop the Android app's continuous live-location sharing (no-op in a browser).
  useEffect(() => {
    if (order?.orderStatus === 'DELIVERED') stopNativeLiveLocation();
  }, [order?.orderStatus]);

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

  // River Royalty photo captured -> upload immediately (optional -- capture or skip)
  const handleRiverRoyaltyCapture = async (blob) => {
    setActiveCameraTarget(null);
    setUploadingStage(true);
    try {
      await deliveryService.uploadRiverRoyalty(id, blob);
      toast.success('River Royalty photo uploaded!');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload River Royalty photo.');
    } finally {
      setUploadingStage(false);
    }
  };

  // Plant Stock Yard Royalty photo captured -> upload immediately (required)
  const handleStockYardCapture = async (blob) => {
    setActiveCameraTarget(null);
    setUploadingStage(true);
    try {
      await deliveryService.uploadStockYardRoyalty(id, blob);
      toast.success('Plant Stock Yard Royalty photo uploaded!');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploadingStage(false);
    }
  };

  // Explicit skip -- no file sent
  const handleSkipRiverRoyalty = async () => {
    setUploadingStage(true);
    try {
      await deliveryService.uploadRiverRoyalty(id, null);
      toast.success('River Royalty step skipped.');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to skip this step.');
    } finally {
      setUploadingStage(false);
    }
  };

  // One of the 5 required photos captured -> stage it locally (all 5 submit together)
  const handleRequiredPhotoCapture = (blob, dataUrl) => {
    setRequiredPhotos((prev) => ({ ...prev, [activeCameraTarget]: { file: blob, preview: dataUrl } }));
    setActiveCameraTarget(null);
  };

  const handleSubmitRequiredPhotos = async () => {
    const missing = REQUIRED_PHOTO_SLOTS.filter((slot) => !requiredPhotos[slot.key]);
    if (missing.length > 0) {
      toast.error(`Please capture all 5 photos first. Missing: ${missing.map((s) => s.label).join(', ')}.`);
      return;
    }

    setUploadingStage(true);
    try {
      await deliveryService.uploadRequiredPhotos(id, {
        weightBridgeSlip: requiredPhotos.weightBridgeSlip.file,
        weightBridgeDisplay: requiredPhotos.weightBridgeDisplay.file,
        dumperTop: requiredPhotos.dumperTop.file,
        dumperFront: requiredPhotos.dumperFront.file,
        dumperRear: requiredPhotos.dumperRear.file
      });
      toast.success('All required photos submitted! Dealer has been notified.');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit photos.');
    } finally {
      setUploadingStage(false);
    }
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

  // Dumper orders go through the royalty/weighbridge/weight/final-payment steps below before
  // Delivery OTP even exists (orderStatus stays ACCEPTED throughout). Tractor orders never set
  // fulfillmentStage, so they skip straight to the existing OTP box exactly as before.
  const isDumper = order.vehicleTypeSnapshot === 'DUMPER';
  const showFulfillmentFlow = isDumper && order.orderStatus === 'ACCEPTED';

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

      {/* Dumper Fulfillment Flow: River Royalty -> Stock Yard -> 5 Required Photos */}
      {showFulfillmentFlow && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" /> Dispatch Checklist
          </h2>

          {/* Step 1: River Royalty */}
          {['DRIVER_ASSIGNED', 'LOCATION_SHARED'].includes(order.fulfillmentStage) && (
            <div className="p-4 bg-slate-950/60 rounded-xl border border-amber-500/30 space-y-3">
              <p className="text-sm text-slate-200 font-semibold">Step 1: River Royalty photo</p>
              <p className="text-xs text-slate-400">Optional -- capture a photo, or skip this step.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveCameraTarget('riverRoyalty')}
                  disabled={uploadingStage}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Photo</span>
                </button>
                <button
                  onClick={handleSkipRiverRoyalty}
                  disabled={uploadingStage}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Skip This Step</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Plant Stock Yard Royalty (required photo) */}
          {order.fulfillmentStage === 'RIVER_ROYALTY_DONE' && (
            <div className="p-4 bg-slate-950/60 rounded-xl border border-amber-500/30 space-y-3">
              <p className="text-sm text-slate-200 font-semibold">Step 2: Plant Stock Yard Royalty photo</p>
              <button
                onClick={() => setActiveCameraTarget('stockYard')}
                disabled={uploadingStage}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Stock Yard Royalty Photo</span>
              </button>
            </div>
          )}

          {/* Step 3: The 5 required photos, staged locally then submitted together */}
          {order.fulfillmentStage === 'STOCK_YARD_DONE' && (
            <div className="p-4 bg-slate-950/60 rounded-xl border border-amber-500/30 space-y-3">
              <p className="text-sm text-slate-200 font-semibold">Step 3: Required photos (camera only)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {REQUIRED_PHOTO_SLOTS.map((slot) => (
                  <button
                    key={slot.key}
                    type="button"
                    onClick={() => setActiveCameraTarget(slot.key)}
                    disabled={uploadingStage}
                    className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 p-2 text-center transition-all disabled:opacity-50 ${
                      requiredPhotos[slot.key]
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-dashed border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    {requiredPhotos[slot.key] ? (
                      <img src={requiredPhotos[slot.key].preview} alt={slot.label} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-slate-500" />
                        <span className="text-[10px] text-slate-400 font-semibold leading-tight">{slot.label}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSubmitRequiredPhotos}
                disabled={uploadingStage || REQUIRED_PHOTO_SLOTS.some((s) => !requiredPhotos[s.key])}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{uploadingStage ? 'Submitting...' : 'Submit All 5 Photos'}</span>
              </button>
            </div>
          )}

          {/* Step 4: waiting on the dealer to review photos and enter Total Weight */}
          {order.fulfillmentStage === 'PHOTOS_SUBMITTED' && (
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-sm text-slate-300">Photos submitted. Waiting for the dealer to review and enter the Total Weight.</p>
            </div>
          )}

          {/* Step 5: waiting on customer's final payment */}
          {order.fulfillmentStage === 'WEIGHT_ENTERED' && (
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-3">
              <Weight className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-sm text-slate-300">
                Total Weight: {order.totalWeight} Ton. Waiting for the customer to complete the final payment before dispatch.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Delivery OTP Verification Box (hidden while the Dumper fulfillment flow above is active --
          there is no OTP to verify yet at that point) */}
      {!showFulfillmentFlow && (
        order.orderStatus !== 'DELIVERED' ? (
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
        )
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

      {/* Shared live-camera capture modal for every Dumper fulfillment photo step above --
          camera-only, no gallery picker (see LiveCameraModal itself). */}
      <LiveCameraModal
        isOpen={!!activeCameraTarget}
        onClose={() => setActiveCameraTarget(null)}
        facingMode="environment"
        title={
          activeCameraTarget === 'riverRoyalty'
            ? 'River Royalty Photo'
            : activeCameraTarget === 'stockYard'
            ? 'Plant Stock Yard Royalty Photo'
            : REQUIRED_PHOTO_SLOTS.find((s) => s.key === activeCameraTarget)?.label || 'Capture Photo'
        }
        helperText="Camera capture only -- gallery selection is not allowed for this document."
        onCapture={(blob, dataUrl) => {
          if (activeCameraTarget === 'riverRoyalty') {
            handleRiverRoyaltyCapture(blob);
          } else if (activeCameraTarget === 'stockYard') {
            handleStockYardCapture(blob);
          } else {
            handleRequiredPhotoCapture(blob, dataUrl);
          }
        }}
      />
    </div>
  );
}

