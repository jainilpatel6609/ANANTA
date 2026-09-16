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
  ShieldCheck,
  User,
  Building2,
  ChevronRight,
  RotateCw
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white font-display">All Orders Master</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-black text-xs border border-amber-500/20">
              {orders.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit database of all customer orders, pricing snapshots, and verified delivery records.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-amber-400 active:scale-95 transition-all min-h-[40px] cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search Order ID, Driver, Address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 min-h-[44px]"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500 min-h-[44px]"
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
            className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500 min-h-[44px]"
          >
            <option value="">All Categories</option>
            <option value="Sand">Sand</option>
            <option value="Aggregate">Aggregate</option>
            <option value="Grit">Grit</option>
          </select>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="No orders match the current filter and search criteria."
          icon={FileSpreadsheet}
        />
      ) : (
        <>
          {/* Mobile Stacked Cards (visible below md) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-white text-base">#{order.orderNumber}</span>
                    <span className="text-[10px] text-slate-500 block">{formatDate(order.createdAt)}</span>
                  </div>
                  <StatusBadge status={order.orderStatus} />
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-bold text-white">{order.userId?.name || 'N/A'} ({order.userId?.mobile})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Material:</span>
                    <span className="font-bold text-amber-400">{order.productNameSnapshot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quantity:</span>
                    <span className="font-mono text-slate-200">{formatOrderQuantity(order)} ({formatOrderTransport(order)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dealer:</span>
                    <span className="text-slate-300">{order.dealerId?.companyName || order.dealerId?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-800/60">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Total Amount:</span>
                    <span className="font-mono font-black text-white text-base">{formatINR(order.totalAmount)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(order)}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 active:scale-95 border border-slate-800 text-xs font-bold text-amber-400 transition-all min-h-[44px] cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Inspect Full Order & Documents</span>
                </button>
              </div>
            ))}
          </div>

          {/* Desktop Data Table (visible md and up) */}
          <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
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
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-200 transition-all cursor-pointer min-h-[36px]"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
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
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block">
                  Customer & Billing
                </span>
                <div>Name: <span className="font-semibold text-white">{selectedOrder.userId?.name}</span></div>
                <div>Mobile: <span className="font-mono text-slate-200">{selectedOrder.userId?.mobile}</span></div>
                <div>GSTIN: <span className="font-mono text-slate-200">{selectedOrder.userId?.gstNumber || 'Unregistered'}</span></div>
                <div>Category: <span className="text-slate-200">{selectedOrder.userId?.userType}</span></div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
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
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
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
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
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

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
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
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
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
