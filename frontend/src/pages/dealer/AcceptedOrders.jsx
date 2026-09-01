import React, { useState, useEffect } from 'react';
import { orderService, deliveryService } from '../../services';
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
  Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AcceptedOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dispatch modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [royaltyFile, setRoyaltyFile] = useState(null);
  const [royaltyPreview, setRoyaltyPreview] = useState(null);
  const [waybridgeFile, setWaybridgeFile] = useState(null);
  const [waybridgePreview, setWaybridgePreview] = useState(null);
  const [dispatching, setDispatching] = useState(false);

  const loadAccepted = async () => {
    try {
      const res = await orderService.getDealerDeliveries('ACCEPTED');
      if (res.data?.orders) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      toast.error('Failed to load accepted orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccepted();
  }, []);

  const openDispatchModal = (order) => {
    setSelectedOrder(order);
    setDriverName(order.driverName || '');
    setDriverMobile(order.driverMobile || '');
    setVehicleNumber(order.vehicleNumber || '');
    setRoyaltyFile(null);
    setRoyaltyPreview(order.riverRoyaltyUrl || null);
    setWaybridgeFile(null);
    setWaybridgePreview(order.waybridgePhotoUrl || null);
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

    if (!royaltyFile && !selectedOrder.riverRoyaltyUrl) {
      toast.error('Please upload the River Royalty photo.');
      return;
    }

    if (!waybridgeFile && !selectedOrder.waybridgePhotoUrl) {
      toast.error('Please upload the Weighbridge slip photo.');
      return;
    }

    setDispatching(true);
    try {
      const formData = new FormData();
      formData.append('driverName', driverName.trim());
      formData.append('driverMobile', driverMobile.trim());
      formData.append('vehicleNumber', vehicleNumber.trim().toUpperCase());

      if (royaltyFile) {
        formData.append('riverRoyalty', royaltyFile);
      }
      if (waybridgeFile) {
        formData.append('waybridgePhoto', waybridgeFile);
      }

      await deliveryService.dispatchOrder(selectedOrder._id, formData);
      toast.success('Order dispatched! Customer notified and OTP generated.');
      setSelectedOrder(null);
      loadAccepted();
    } catch (err) {
      toast.error(err.message || 'Dispatch submission failed');
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading accepted orders..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">Accepted Orders</h1>
        <p className="text-xs text-slate-400">
          Orders accepted by your dealership awaiting driver details, river royalty, and weighbridge certificate upload.
        </p>
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
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black font-mono text-white">#{order.orderNumber}</span>
                  <StatusBadge status={order.orderStatus} />
                </div>
                <div className="text-xs text-slate-400">Accepted on {formatDate(order.acceptedAt)}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">
                    Material & Specification
                  </span>
                  <div className="text-sm font-bold text-white">{order.productNameSnapshot}</div>
                  <div className="text-brand-400 font-semibold">
                    {order.aggregateType || order.sandLocation || order.category}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">
                    Quantity & Tractor
                  </span>
                  <div className="text-sm font-bold text-brand-400 font-mono">{formatOrderQuantity(order)}</div>
                  <div className="text-slate-300 font-medium">{formatOrderTransport(order)}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-bold">
                    Customer Details
                  </span>
                  <div className="text-sm font-bold text-white">{order.userId?.name}</div>
                  <div className="text-slate-400">{order.userId?.mobile}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block">
                    Delivery Site Address
                  </span>
                  {order.pincode && (
                    <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 font-mono font-bold text-[10px] border border-brand-500/20">
                      PIN: {order.pincode}
                    </span>
                  )}
                </div>
                <div className="text-slate-200">{order.shippingAddress}</div>
                {order.shippingDetails?.fullName && (
                  <div className="text-slate-400 text-[11px]">
                    Site Contact: <span className="text-white font-medium">{order.shippingDetails.fullName}</span>
                    {order.shippingDetails.mobile && (
                      <span className="font-mono text-slate-300 ml-2">({order.shippingDetails.mobile})</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => openDispatchModal(order)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-brand-500/20"
                >
                  <Truck className="w-4 h-4" />
                  Assign Driver & Upload Weighbridge Slips
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Driver Dispatch & Upload Modal */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={`Dispatch Driver & Upload Slips (Order #${selectedOrder?.orderNumber})`}
        maxWidth="max-w-2xl"
      >
        {selectedOrder && (
          <form onSubmit={handleDispatchSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Driver Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile"
                  value={driverMobile}
                  onChange={(e) => setDriverMobile(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Vehicle Reg Plate No. *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GJ-01-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500 uppercase font-mono"
                />
              </div>
            </div>

            {/* Upload Area for Royalty & Weighbridge Photos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* River Royalty Upload */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-brand-400" />
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
                  <label className="border-2 border-dashed border-slate-800 hover:border-brand-500 rounded-xl h-32 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors bg-slate-900/40">
                    <UploadCloud className="w-6 h-6 text-brand-400 mb-1" />
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
                  <label className="border-2 border-dashed border-slate-800 hover:border-brand-500 rounded-xl h-32 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors bg-slate-900/40">
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

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dispatching}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-brand-500/20 disabled:opacity-50"
              >
                {dispatching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Dispatch...
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    Dispatch Material & Generate OTP
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
