import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService, orderService, dealerService } from '../../services';
import StatsCard from '../../components/StatsCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import OrderAlarmBanner from '../../components/OrderAlarmBanner';
import NotificationPermissionPrompt from '../../components/NotificationPermissionPrompt';
import Modal from '../../components/Modal';
import { useAlarm } from '../../hooks/useAlarm';
import { formatINR, formatDate, formatOrderQuantity, formatOrderTransport } from '../../utils/formatters';
import {
  ShieldAlert,
  Clock,
  Package,
  Building2,
  Users,
  Coins,
  Truck,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  XCircle,
  Phone,
  MessageSquare,
  MapPin,
  RefreshCw,
  Volume2,
  VolumeX,
  Loader2,
  UserCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reassignment Modal State
  const [reassigningOrder, setReassigningOrder] = useState(null);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [submittingReassign, setSubmittingReassign] = useState(false);

  const { isMuted, triggerAlarm, clearAlarm, toggleMute } = useAlarm();

  const loadData = async () => {
    try {
      const [statsRes, escRes, dealersRes] = await Promise.all([
        adminService.getDashboardStats(),
        orderService.getAdminEscalations(),
        dealerService.getAllDealers()
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (escRes.data?.escalations) {
        const list = escRes.data.escalations;
        setEscalations(list);

        const hasActiveAlarm = list.some((e) => e.adminAlarmActive);
        if (hasActiveAlarm) {
          triggerAlarm('ADMIN');
        } else {
          clearAlarm();
        }
      }
      if (dealersRes.data?.dealers) {
        setDealers(dealersRes.data.dealers.filter((d) => d.isActive && !d.isDeleted));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (orderId) => {
    try {
      await orderService.adminAcknowledge(orderId);
      toast.success('Escalation acknowledged. Alarm silenced.');
      setEscalations((prev) =>
        prev.map((e) => (e._id === orderId ? { ...e, adminAlarmActive: false } : e))
      );
      const remainingAlarms = escalations.filter((e) => e._id !== orderId && e.adminAlarmActive);
      if (remainingAlarms.length === 0) {
        clearAlarm();
      }
    } catch (err) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const openReassignModal = (order) => {
    setReassigningOrder(order);
    setSelectedDealerId('');
  };

  const handleConfirmReassign = async (e) => {
    e.preventDefault();
    if (!selectedDealerId || !reassigningOrder) {
      toast.error('Please select a target dealer for reassignment.');
      return;
    }

    setSubmittingReassign(true);
    try {
      await orderService.adminReassign(reassigningOrder._id, selectedDealerId);
      toast.success(`Order #${reassigningOrder.orderNumber} successfully reassigned to new dealer with a fresh 15-minute SLA timer.`);
      setReassigningOrder(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to reassign order');
    } finally {
      setSubmittingReassign(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Aggregating executive command center metrics & escalation alerts..." />;
  }

  const { overview, todaySummary, recentOrders, categoryStats } = stats || {};
  const activeAlarms = escalations.filter((e) => e.adminAlarmActive);

  const categoryChartData = (categoryStats || []).map((c) => ({
    name: c._id || 'Standard',
    tonnage: c.totalQuantity || 0,
    amount: c.totalAmount || 0
  }));

  return (
    <div className="space-y-8 pb-12">
      {/* Mobile Device Push Permission Prompt */}
      <NotificationPermissionPrompt role="ADMIN" />

      {/* 1. Alarm Alert Banner */}
      {activeAlarms.length > 0 && (
        <OrderAlarmBanner
          role="ADMIN"
          count={activeAlarms.length}
          type={activeAlarms[0].adminAlertType === 'DEALER_DECLINED' ? 'DEALER_DECLINED' : 'DEALER_TIMEOUT'}
          latestOrder={activeAlarms[0]}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onAcknowledge={handleAcknowledge}
        />
      )}

      {/* 2. Executive Command Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            Executive Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            ANANTA TRADERS Operational Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time multi-dealer logistics dispatch, SLA monitoring, and royalty compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/todays-orders"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all shadow-sm"
          >
            <Clock className="w-4 h-4" />
            Today's Dispatch Board ({todaySummary?.total || 0})
          </Link>
          <Link
            to="/admin/reports"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Reports & Exports
          </Link>
        </div>
      </div>

      {/* 3. Order Escalation & Rejection Alerts Section */}
      {escalations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white font-display">
                  Active Order Escalations & Rejections ({escalations.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Orders requiring Super Admin re-routing or dealer intervention.
                </p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Alerts
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {escalations.map((order) => {
              const isDeclined = order.dealerResponseStatus === 'REJECTED' || order.adminAlertType === 'DEALER_DECLINED';
              const assignedDealer = order.assignedDealerId || order.dealerRejectedBy;
              const customerName = order.shippingDetails?.fullName || order.userId?.name || 'Customer';
              const customerMobile = order.shippingDetails?.mobile || order.userId?.mobile || '';

              return (
                <div
                  key={order._id}
                  className={`p-5 rounded-3xl border transition-all ${
                    isDeclined
                      ? 'bg-slate-900 border-red-500/40 shadow-classic'
                      : 'bg-slate-900 border-amber-500/40 shadow-classic'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-base font-mono font-bold text-white">#{order.orderNumber}</span>

                      {/* Escalation Tag */}
                      {isDeclined ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-950/40 text-red-300 border border-red-800/40">
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                          Dealer Declined
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/40">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          15-Min Response Timeout
                        </span>
                      )}

                      <span className="text-xs font-medium text-slate-400 font-mono">
                        {order.dealerRejectedAt
                          ? `Declined: ${formatDate(order.dealerRejectedAt)}`
                          : `Assigned: ${formatDate(order.orderAssignedAt || order.createdAt)}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono text-amber-400">
                        {formatINR(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Body Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 py-4 text-xs">
                    {/* Customer Info */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                      <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">
                        Customer
                      </span>
                      <div className="text-sm font-bold text-white">{customerName}</div>
                      <div className="text-slate-400 font-mono">
                        PIN: <strong className="text-amber-400">{order.pincode}</strong>
                      </div>
                      {customerMobile && <div className="text-slate-300 font-mono">{customerMobile}</div>}
                    </div>

                    {/* Assigned / Declining Dealer */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                      <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">
                        {isDeclined ? 'Declined By Dealer' : 'Assigned Dealer (No Response)'}
                      </span>
                      <div className="text-sm font-bold text-white">
                        {assignedDealer ? (assignedDealer.companyName || assignedDealer.name) : 'Unassigned'}
                      </div>
                      {assignedDealer?.pincode && (
                        <div className="text-slate-400 font-mono">
                          Depot PIN: <strong className="text-amber-400">{assignedDealer.pincode}</strong>
                        </div>
                      )}
                      {assignedDealer?.mobile && (
                        <div className="text-slate-300 font-mono">{assignedDealer.mobile}</div>
                      )}
                    </div>

                    {/* Material & Transport */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                      <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">
                        Material Details
                      </span>
                      <div className="text-sm font-bold text-white">{order.productNameSnapshot}</div>
                      <div className="text-amber-400 font-medium">
                        {order.numberOfTractors || order.quantity} Tractor(s) ({order.tractorType || order.vehicleType})
                      </div>
                    </div>

                    {/* Rejection / Escalation Status */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                      <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">
                        Alert Reason & SLA
                      </span>
                      {isDeclined ? (
                        <div className="text-red-400 font-semibold">
                          "{order.dealerRejectionReason || 'Dealer clicked decline'}"
                        </div>
                      ) : (
                        <div className="text-amber-400 font-semibold">
                          Exceeded 15 minutes without response
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400">
                        {order.assignedDealerId
                          ? `Currently pending: ${order.assignedDealerId.companyName || order.assignedDealerId.name}`
                          : 'Awaiting manual reassignment'}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      {assignedDealer?.mobile && (
                        <>
                          <a
                            href={`tel:${assignedDealer.mobile}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Call Dealer</span>
                          </a>
                          <a
                            href={`https://wa.me/91${assignedDealer.mobile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      {order.adminAlarmActive && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(order._id)}
                          className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition-colors"
                        >
                          Silence Alarm
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openReassignModal(order)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Reassign Dealer</span>
                      </button>

                      <Link
                        to={`/user/orders/${order._id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white"
                      >
                        <span>View Order</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Global Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Gross Revenue"
          value={formatINR(overview?.totalRevenue || 0)}
          subtitle="All confirmed bookings"
          icon={Coins}
          color="brand"
        />
        <StatsCard
          title="Total Tonnage Dispatched"
          value={`${overview?.totalTonnage || 0} Tons`}
          subtitle="Sand, aggregate & grit"
          icon={Truck}
          color="blue"
        />
        <StatsCard
          title="Total Orders"
          value={overview?.totalOrders || 0}
          subtitle="Lifecycle records"
          icon={Package}
          color="purple"
        />
        <StatsCard
          title="Active Dealers"
          value={overview?.totalDealers || 0}
          subtitle="Logistics fleet partners"
          icon={Building2}
          color="emerald"
        />
        <StatsCard
          title="Registered Customers"
          value={overview?.totalUsers || 0}
          subtitle="Builders & contractors"
          icon={Users}
          color="brand"
        />
      </div>

      {/* Operational Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-white font-display">Tonnage by Material Category</h2>
              <p className="text-xs text-slate-400">Total volume dispatched across Gujarat</p>
            </div>
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff' }}
                  formatter={(val) => [`${val} Tons`, 'Dispatched']}
                />
                <Bar dataKey="tonnage" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-white font-display">Category Revenue Share</h2>
              <p className="text-xs text-slate-400">Total sales volume breakdown</p>
            </div>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={5}
                >
                  {categoryChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff' }}
                  formatter={(val) => [formatINR(val), 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Manual Reassign Modal */}
      {reassigningOrder && (
        <Modal
          isOpen={!!reassigningOrder}
          onClose={() => setReassigningOrder(null)}
          title={`Reassign Order #${reassigningOrder.orderNumber}`}
        >
          <form onSubmit={handleConfirmReassign} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Order Context</div>
              <div className="text-white font-bold">{reassigningOrder.productNameSnapshot}</div>
              <div className="text-slate-300">
                Destination: {reassigningOrder.shippingAddress} (PIN: <strong className="text-amber-400">{reassigningOrder.pincode}</strong>)
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Select Target Dealer Depot:</label>
              <select
                value={selectedDealerId}
                onChange={(e) => setSelectedDealerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              >
                <option value="">-- Choose active dealer depot --</option>
                {dealers.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.companyName || d.name} — PIN: {d.pincode} ({d.city || d.state}) — Mobile: {d.mobile}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              💡 Reassigning will restart a fresh <strong>15-minute SLA timer</strong> and trigger immediate notifications and alarms on the chosen dealer's dashboard.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setReassigningOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReassign || !selectedDealerId}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {submittingReassign ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Reassigning...
                  </>
                ) : (
                  'Confirm Reassignment'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
