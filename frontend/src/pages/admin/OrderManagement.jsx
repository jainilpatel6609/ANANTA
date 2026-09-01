import React, { useState, useEffect } from 'react';
import { orderService } from '../../services';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport, isTractorOrder } from '../../utils/formatters';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Eye,
  Truck,
  MapPin,
  FileCheck,
  Scale,
  Calendar,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadOrders = async () => {
    try {
      const res = await orderService.getAllAdmin({
        search: search || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        limit: 100
      });
      if (res.data?.orders) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      toast.error('Failed to load orders master');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOrders();
  };

  if (loading) {
    return <LoadingSpinner message="Querying all system orders..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">All Orders Master</h1>
          <p className="text-xs text-slate-400">
            Comprehensive audit database of all customer orders, pricing snapshots, and delivery records.
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-400 border border-slate-800 self-start"
        >
          Refresh Orders
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search Order ID, Driver, Address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="PLACED">Order Placed</option>
            <option value="ACCEPTED">Dealer Accepted</option>
            <option value="OUT_FOR_DELIVERY">Out For Delivery</option>
            <option value="DELIVERED">Delivered & Verified</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Categories</option>
            <option value="Sand">Sand</option>
            <option value="Aggregate">Aggregate</option>
            <option value="Grit">Grit</option>
          </select>
        </div>
      </div>

      {/* Orders Master Table */}
      {orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="No orders match the current filter and search criteria."
          icon={FileSpreadsheet}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Order ID</th>
                  <th className="px-4 py-3.5">Customer Details</th>
                  <th className="px-4 py-3.5">Material & Spec</th>
                  <th className="px-4 py-3.5">Tonnage & Fleet</th>
                  <th className="px-4 py-3.5">Assigned Dealer</th>
                  <th className="px-4 py-3.5">Total Paid</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-white">
                      #{order.orderNumber}
                      <div className="text-[10px] text-slate-500 font-sans">{formatDate(order.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white">{order.userId?.name || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{order.userId?.mobile}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-100">{order.productNameSnapshot}</div>
                      <div className="text-[10px] text-slate-400">
                        {order.aggregateType || order.sandLocation || order.category}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-amber-400 font-mono">{formatOrderQuantity(order)}</div>
                      <div className="text-[10px] text-slate-500">{formatOrderTransport(order)}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-300">
                        {order.dealerId?.companyName || order.dealerId?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-white">
                      {formatINR(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={order.orderStatus} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Inspector Modal */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={`Audit Order Inspector (Order #${selectedOrder?.orderNumber})`}
        maxWidth="max-w-3xl"
      >
        {selectedOrder && (
          <div className="space-y-6 text-xs text-slate-300">
            {/* Status & Timing Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-white text-base">#{selectedOrder.orderNumber}</span>
                <StatusBadge status={selectedOrder.orderStatus} />
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Payment ID: {selectedOrder.paymentId || 'N/A'}</span>
                <span className="font-bold text-white text-sm font-mono">{formatINR(selectedOrder.totalAmount)}</span>
              </div>
            </div>

            {/* Grid Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block">
                  Customer & Billing
                </span>
                <div>Name: <span className="font-semibold text-white">{selectedOrder.userId?.name}</span></div>
                <div>Mobile: <span className="font-mono text-slate-200">{selectedOrder.userId?.mobile}</span></div>
                <div>GSTIN: <span className="font-mono text-slate-200">{selectedOrder.userId?.gstNumber || 'Unregistered'}</span></div>
                <div>Category: <span className="text-slate-200">{selectedOrder.userId?.userType}</span></div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block">
                  Material & Snapshotted Pricing
                </span>
                <div>Material: <span className="font-semibold text-white">{selectedOrder.productNameSnapshot}</span></div>
                {isTractorOrder(selectedOrder) ? (
                  <>
                    <div>Tractor Type: <span className="font-semibold text-white">{selectedOrder.tractorType}</span></div>
                    <div>Tractors: <span className="font-bold text-amber-400 font-mono">{selectedOrder.numberOfTractors || selectedOrder.quantity}</span></div>
                    <div>Price Per Tractor: <span className="font-mono text-slate-200">{formatINR(selectedOrder.pricePerTractorSnapshot ?? selectedOrder.pricePerTonSnapshot)}</span></div>
                  </>
                ) : (
                  <>
                    <div>Rate Per Ton: <span className="font-mono text-slate-200">{formatINR(selectedOrder.pricePerTonSnapshot)}</span></div>
                    <div>Quantity: <span className="font-bold text-amber-400 font-mono">{selectedOrder.quantity} Tons</span></div>
                  </>
                )}
                <div>Subtotal: <span className="font-mono text-slate-200">{formatINR(selectedOrder.subtotal)}</span></div>
              </div>
            </div>

            {/* Driver & Dealer details */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block">
                Assigned Logistics Fleet & Driver
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>Dealer: <span className="font-semibold text-white block">{selectedOrder.dealerId?.companyName || 'Unassigned'}</span></div>
                <div>Driver: <span className="font-semibold text-white block">{selectedOrder.driverName || 'Pending'}</span></div>
                <div>Vehicle Plate: <span className="font-mono font-bold text-emerald-400 block uppercase">{selectedOrder.vehicleNumber || 'N/A'}</span></div>
              </div>
            </div>

            {/* Uploaded Documents */}
            <div className="space-y-2">
              <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block">
                Compliance Document Slips
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-200 block">River Royalty Certificate</span>
                  {selectedOrder.riverRoyaltyUrl ? (
                    <a
                      href={selectedOrder.riverRoyaltyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 font-bold text-xs flex items-center gap-1 hover:underline pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Uploaded Royalty Photo
                    </a>
                  ) : (
                    <span className="text-slate-500 text-[11px]">Not uploaded yet</span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-200 block">Certified Weighbridge Slip</span>
                  {selectedOrder.waybridgePhotoUrl ? (
                    <a
                      href={selectedOrder.waybridgePhotoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 font-bold text-xs flex items-center gap-1 hover:underline pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Uploaded Weighbridge Photo
                    </a>
                  ) : (
                    <span className="text-slate-500 text-[11px]">Not uploaded yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* Destination Coordinates */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block">
                Site Shipping Address
              </span>
              <p className="text-slate-200">{selectedOrder.shippingAddress}</p>
              <div className="text-[10px] text-slate-500 font-mono">
                GPS: {selectedOrder.latitude}, {selectedOrder.longitude}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
