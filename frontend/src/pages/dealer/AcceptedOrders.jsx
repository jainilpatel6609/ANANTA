import React, { useState, useEffect } from 'react';
import { orderService, deliveryService, driverService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import {
  CheckCircle,
  Truck,
  UploadCloud,
  FileCheck,
  Scale,
  Phone,
  User,
  ArrowRight,
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  ExternalLink,
  MapPin,
  Users,
  Zap,
  CheckCircle2,
  Navigation
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AcceptedOrders() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dispatch modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [royaltyFile, setRoyaltyFile] = useState(null);
  const [royaltyPreview, setRoyaltyPreview] = useState(null);
  const [waybridgeFile, setWaybridgeFile] = useState(null);
  const [waybridgePreview, setWaybridgePreview] = useState(null);
  const [dispatching, setDispatching] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orderRes, driverRes] = await Promise.all([
        orderService.getDealerDeliveries('ACCEPTED'),
        driverService.getDrivers({ status: 'AVAILABLE' }).catch(() => ({ data: { drivers: [] } }))
      ]);

      if (orderRes.data?.orders) {
        setOrders(orderRes.data.orders);
      }
      if (driverRes.data?.drivers) {
        setDrivers(driverRes.data.drivers);
      }
    } catch (err) {
      toast.error('Failed to load accepted orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDispatchModal = (order) => {
    setSelectedOrder(order);
    setSelectedDriverId(order.driverId || '');
    setDriverName(order.driverName || '');
    setDriverMobile(order.driverMobile || '');
    setVehicleNumber(order.vehicleNumber || '');
    setRoyaltyFile(null);
    setRoyaltyPreview(order.riverRoyaltyUrl || null);
    setWaybridgeFile(null);
    setWaybridgePreview(order.waybridgePhotoUrl || null);
  };

  // Handle Driver Select Dropdown
  const handleDriverSelect = (e) => {
    const dId = e.target.value;
    setSelectedDriverId(dId);

    if (!dId) return;

    const matchedDriver = drivers.find((d) => d._id === dId);
    if (matchedDriver) {
      setDriverName(matchedDriver.name);
      setDriverMobile(matchedDriver.mobile);
      setVehicleNumber(matchedDriver.vehicleNumber);
      toast.success(`Selected driver ${matchedDriver.name} (${matchedDriver.vehicleNumber})`);
    }
  };

  const handleRoyaltyChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRoyaltyFile(file);
      setRoyaltyPreview(URL.createObjectURL(file));
    }
  };

  const handleWaybridgeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setWaybridgeFile(file);
      setWaybridgePreview(URL.createObjectURL(file));
    }
  };

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!driverName.trim() || !driverMobile.trim() || !vehicleNumber.trim()) {
      toast.error('Driver name, mobile number, and vehicle plate number are required.');
      return;
    }

    const cleanMobile = driverMobile.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      toast.error('Please enter a valid 10-digit Indian mobile number for driver.');
      return;
    }

    const isTractorOrder =
      selectedOrder?.transportType === 'Tractor' ||
      selectedOrder?.vehicleTypeSnapshot === 'TRACTOR' ||
      Boolean(selectedOrder?.tractorType) ||
      (selectedOrder?.vehicleType && selectedOrder.vehicleType.toLowerCase().includes('patiya'));

    if (!isTractorOrder) {
      if (!royaltyFile && !selectedOrder.riverRoyaltyUrl) {
        toast.error('Please upload the River Royalty photo for Dumper / Truck delivery.');
        return;
      }

      if (!waybridgeFile && !selectedOrder.waybridgePhotoUrl) {
        toast.error('Please upload the Weighbridge slip photo for Dumper / Truck delivery.');
        return;
      }
    }

    setDispatching(true);
    try {
      const formData = new FormData();
      if (selectedDriverId) {
        formData.append('driverId', selectedDriverId);
      }
      formData.append('driverName', driverName.trim());
      formData.append('driverMobile', cleanMobile);
      formData.append('vehicleNumber', vehicleNumber.trim().toUpperCase());

      if (royaltyFile) {
        formData.append('riverRoyalty', royaltyFile);
      }
      if (waybridgeFile) {
        formData.append('waybridgePhoto', waybridgeFile);
      }

      await deliveryService.dispatchOrder(selectedOrder._id, formData);
      toast.success('Order dispatched! Customer received OTP and Driver received Google Maps Live Navigation link.');
      setSelectedOrder(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Dispatch submission failed');
    } finally {
      setDispatching(false);
    }
  };

  // Helper to generate WhatsApp Task Share Link for Driver
  const getDriverWhatsAppUrl = (order, driverMob, driverNm) => {
    const mapUrl =
      order.latitude && order.longitude
        ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`
        : `https://maps.google.com`;

    const text = encodeURIComponent(
      `🚛 *ANANTA TRADERS DELIVERY TASK #${order.orderNumber}*\n` +
      `Hello ${driverNm || 'Driver'}, you have been assigned this delivery:\n\n` +
      `📦 *Material:* ${order.numberOfTractors || order.quantity} ${order.transportType} of ${order.productNameSnapshot} (${order.tractorType || order.vehicleType})\n` +
      `👤 *Customer:* ${order.shippingDetails?.fullName || order.userId?.name} (+91 ${order.shippingDetails?.mobile || order.userId?.mobile})\n` +
      `📍 *Site Address:* ${order.shippingAddress}\n` +
      (order.shippingDetails?.landmark ? `🏷️ *Landmark:* ${order.shippingDetails.landmark}\n` : '') +
      (order.deliveryInstructions ? `📝 *Driver Notes:* ${order.deliveryInstructions}\n` : '') +
      `\n🗺️ *Tap for Google Maps Live GPS Navigation:*\n${mapUrl}\n\n` +
      `🔑 *OTP:* Collect 6-Digit Delivery OTP from customer upon unloading.`
    );

    return `https://wa.me/91${driverMob.replace(/\D/g, '').slice(-10)}?text=${text}`;
  };

  if (loading) {
    return <LoadingSpinner message="Loading accepted orders..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">Accepted Orders</h1>
          <p className="text-xs text-slate-400">
            Orders accepted by your dealership. Assign your driver and upload river royalty & weighbridge certificate to dispatch.
          </p>
        </div>

        <a
          href="/dealer/drivers"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 transition-colors shrink-0"
        >
          <Users className="w-4 h-4" />
          <span>Manage Driver Fleet ({drivers.length})</span>
        </a>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No pending dispatches"
          description="You don't have any accepted orders waiting for driver assignment. Check the New Orders pool."
          actionText="View New Orders Pool"
          onAction={() => window.location.assign('/dealer/new-orders')}
          icon={CheckCircle}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {orders.map((order) => {
            const googleMapUrl =
              order.latitude && order.longitude
                ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`
                : `https://maps.google.com`;

            return (
              <div
                key={order._id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl relative overflow-hidden"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-white font-mono">#{order.orderNumber}</span>
                      <StatusBadge status={order.orderStatus} />
                    </div>
                    <span className="text-xs text-slate-400 block">Accepted: {formatDate(order.acceptedAt || order.updatedAt)}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block uppercase font-bold text-[10px] tracking-wider">
                      Order Value
                    </span>
                    <span className="text-lg font-black text-amber-400 font-mono">{formatINR(order.totalAmount)}</span>
                  </div>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  {/* Material & Fleet */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wider">
                      Material Specification
                    </span>
                    <div className="font-bold text-white text-sm">{order.productNameSnapshot}</div>
                    <div className="text-amber-400 font-medium">
                      {order.transportType} ({order.tractorType || order.vehicleType}) • {formatOrderQuantity(order)}
                    </div>
                    {order.sandLocation && (
                      <div className="text-slate-400 text-[11px]">Source: {order.sandLocation}</div>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wider">
                      Customer & Site Contact
                    </span>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>{order.shippingDetails?.fullName || order.userId?.name}</span>
                    </div>
                    <div className="text-slate-300 font-mono flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+91 {order.shippingDetails?.mobile || order.userId?.mobile}</span>
                    </div>
                  </div>

                  {/* Destination & Live Google Map Link */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wider flex items-center justify-between">
                      <span>Delivery Site</span>
                      <a
                        href={googleMapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 normal-case font-semibold"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Open Map</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </span>
                    <div className="text-slate-300 leading-snug line-clamp-2">{order.shippingAddress}</div>
                    {order.shippingDetails?.landmark && (
                      <div className="text-slate-400 text-[11px]">Landmark: {order.shippingDetails.landmark}</div>
                    )}
                  </div>
                </div>

                {/* Driver Status Banner if Assigned */}
                {order.driverName && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-200">
                        Assigned Driver: <strong className="text-white">{order.driverName}</strong> (+91 {order.driverMobile}) • Plate: <strong className="font-mono text-amber-400">{order.vehicleNumber}</strong>
                      </span>
                    </div>

                    <a
                      href={getDriverWhatsAppUrl(order, order.driverMobile, order.driverName)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs transition-colors shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Share on WhatsApp</span>
                    </a>
                  </div>
                )}

                {/* Action Button: Open Dispatch Modal */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => openDispatchModal(order)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Assign Driver & Dispatch Material</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= DISPATCH & DRIVER ASSIGNMENT MODAL ================= */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={`Dispatch Material: Order #${selectedOrder?.orderNumber}`}
      >
        {selectedOrder && (
          <form onSubmit={handleDispatchSubmit} className="space-y-5">
            {/* Quick Driver Fleet Selector */}
            {drivers.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick Select from Saved Driver Fleet</span>
                </label>
                <select
                  value={selectedDriverId}
                  onChange={handleDriverSelect}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose a driver or type manually below --</option>
                  {drivers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} (+91 {d.mobile}) — {d.vehicleNumber} ({d.vehicleType})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Driver Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Driver Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Driver Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile"
                  value={driverMobile}
                  onChange={(e) => setDriverMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Vehicle Plate Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GJ-02-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 uppercase font-mono font-bold"
                />
              </div>
            </div>

            {/* Notification Notice Banner */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
              <Navigation className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Automated SMS & Live Navigation:</strong> When you dispatch, Driver will instantly receive an SMS with Customer Name, Site Address, and a **Direct Google Maps Navigation Link**!
              </div>
            </div>

            {/* Upload Area for Royalty & Weighbridge Photos - ONLY FOR DUMPER / TRUCK */}
            {selectedOrder?.transportType !== 'Tractor' &&
            selectedOrder?.vehicleTypeSnapshot !== 'TRACTOR' &&
            !selectedOrder?.tractorType &&
            !selectedOrder?.vehicleType?.toLowerCase().includes('patiya') ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* River Royalty Upload */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-amber-400" />
                      River Royalty Photo *
                    </span>
                  </div>

                  {royaltyPreview ? (
                    <div className="relative rounded-xl overflow-hidden h-32 border border-slate-800">
                      <img src={royaltyPreview} alt="Royalty Preview" className="w-full h-full object-cover" />
                      <label className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-xs font-bold text-white cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                        Change Photo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleRoyaltyChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-800 hover:border-amber-500 rounded-xl h-32 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors bg-slate-900/40">
                      <UploadCloud className="w-6 h-6 text-amber-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-300">Upload Royalty Slip</span>
                      <span className="text-[10px] text-slate-500">JPG, PNG, WEBP max 5MB</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleRoyaltyChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Waybridge Photo Upload */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-emerald-400" />
                      Weighbridge Slip Photo *
                    </span>
                  </div>

                  {waybridgePreview ? (
                    <div className="relative rounded-xl overflow-hidden h-32 border border-slate-800">
                      <img src={waybridgePreview} alt="Weighbridge Preview" className="w-full h-full object-cover" />
                      <label className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-xs font-bold text-white cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                        Change Photo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleWaybridgeChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-800 hover:border-amber-500 rounded-xl h-32 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors bg-slate-900/40">
                      <UploadCloud className="w-6 h-6 text-emerald-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-300">Upload Weighbridge Slip</span>
                      <span className="text-[10px] text-slate-500">JPG, PNG, WEBP max 5MB</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleWaybridgeChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Tractor Delivery:</strong> Direct dispatch with fixed trolley rate. River Royalty & Weighbridge certificate are not required for Tractor.
                </span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              {driverMobile && (
                <a
                  href={getDriverWhatsAppUrl(selectedOrder, driverMobile, driverName)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send on WhatsApp</span>
                </a>
              )}

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {dispatching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>Dispatch & Send Map to Driver</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
