import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService, orderService, dealerUnavailableService } from '../../services';
import StatsCard from '../../components/StatsCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import OrderAlarmBanner from '../../components/OrderAlarmBanner';
import NotificationPermissionPrompt from '../../components/NotificationPermissionPrompt';
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
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  MapPin,
  Volume2,
  VolumeX,
  Activity,
  BadgeCheck,
  Ban
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
  const [dealerUnavailableReports, setDealerUnavailableReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const { isMuted, triggerAlarm, clearAlarm, toggleMute } = useAlarm();

  const loadData = async () => {
    try {
      const [statsRes, escRes, unavailableRes] = await Promise.all([
        adminService.getDashboardStats(),
        orderService.getAdminEscalations(),
        dealerUnavailableService.getAll('OPEN')
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
      if (unavailableRes.data?.reports) {
        setDealerUnavailableReports(unavailableRes.data.reports);
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

  const handleResolveDealerUnavailableReport = async (reportId) => {
    try {
      await dealerUnavailableService.resolve(reportId);
      toast.success('Report marked as resolved.');
      setDealerUnavailableReports((prev) => prev.filter((r) => r._id !== reportId));
    } catch (err) {
      toast.error('Failed to resolve report.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Aggregating executive command center metrics & escalation alerts..." />;
  }

  const { overview, todaySummary, recentOrders, categoryStats, statusCounts } = stats || {};
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

      {/* 3. Today's Operations Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Today's Active Orders"
          value={todaySummary?.active || 0}
          subtitle="Placed, accepted & out for delivery"
          icon={Activity}
          color="blue"
        />
        <StatsCard
          title="Total Orders"
          value={overview?.totalOrders || 0}
          subtitle="All-time lifecycle records"
          icon={Package}
          color="purple"
        />
        <StatsCard
          title="Today's Delivered Orders"
          value={todaySummary?.delivered || 0}
          subtitle="Completed with OTP today"
          icon={BadgeCheck}
          color="emerald"
        />
        <Link to="/dealer-cancelled-orders">
          <StatsCard
            title="Dealer Cancelled Orders"
            value={overview?.dealerCancelledOrders || 0}
            subtitle="Declined by a dealer, all-time"
            icon={Ban}
            color="rose"
          />
        </Link>
      </div>

      {/* Dealer Unavailable Reports -- customer-flagged checkout dead-ends: no dealer configured
          for a Material + Location + Wheel/Patiya combination. Purely informational, no order
          involved -- resolve once a dealer/rate is set up to cover the gap. */}
      {dealerUnavailableReports.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-black text-white">
                No-Dealer-Available Reports ({dealerUnavailableReports.length})
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {dealerUnavailableReports.map((report) => (
              <div
                key={report._id}
                className="p-5 rounded-3xl border border-sky-500/40 bg-slate-900 shadow-classic"
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-950/40 text-sky-300 border border-sky-800/40">
                      <AlertTriangle className="w-3.5 h-3.5 text-sky-400" />
                      No Dealer Available
                    </span>
                    <span className="text-xs font-medium text-slate-400 font-mono">
                      Reported: {formatDate(report.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleResolveDealerUnavailableReport(report._id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Resolved
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">
                      Customer
                    </span>
                    <div className="text-sm font-bold text-white">{report.customerName || 'Customer'}</div>
                    {report.customerMobile && <div className="text-slate-300 font-mono">{report.customerMobile}</div>}
                    <div className="text-slate-400">
                      {[report.deliveryArea, report.deliveryCity, report.deliveryState].filter(Boolean).join(', ') || 'Location not set'}
                      {report.pincode && <span className="font-mono text-amber-400"> ({report.pincode})</span>}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">
                      Material Specification
                    </span>
                    <div className="text-sm font-bold text-white">{report.productName || report.category}</div>
                    <div className="text-sky-400 font-medium">
                      {report.sourcingLocation ? `Origin: ${report.sourcingLocation}` : ''}
                      {report.aggregateType ? ` • Grade: ${report.aggregateType}` : ''}
                      {report.variantName ? ` • ${report.variantName}` : ''}
                    </div>
                    <div className="text-slate-400">
                      {report.vehicleType === 'DUMPER'
                        ? report.wheelCount
                          ? `${report.wheelCount} Wheel Dumper`
                          : 'Dumper'
                        : report.tractorType || 'Tractor'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">
                      Reason No Dealer Was Shown
                    </span>
                    <div className="text-slate-300">{report.reason || 'No matching dealer rate configured.'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          title="Delivered Orders"
          value={statusCounts?.DELIVERED || 0}
          subtitle="Completed with OTP, all-time"
          icon={BadgeCheck}
          color="emerald"
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

    </div>
  );
}
