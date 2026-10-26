import React, { useState, useEffect } from 'react';
import { dealerUnavailableService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatDate } from '../../utils/formatters';
import { MapPin, AlertTriangle, CheckCircle2, Filter, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const statusBadge = (status) =>
  status === 'RESOLVED'
    ? { label: 'Resolved', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
    : { label: 'Need to Resolve', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };

// Customer-flagged checkout dead-ends: no dealer configured for a Material + Location +
// Wheel/Patiya combination. Purely informational, no order involved -- resolve once a
// dealer/rate is set up to cover the gap.
export default function NoDealerAvailableReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await dealerUnavailableService.getAll(statusFilter !== 'ALL' ? statusFilter : undefined);
      if (res.data?.reports) {
        setReports(res.data.reports);
      }
    } catch (err) {
      toast.error('Failed to load no-dealer-available reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleResolve = async (reportId) => {
    setResolvingId(reportId);
    try {
      await dealerUnavailableService.resolve(reportId);
      toast.success('Report marked as resolved.');
      // Keep history visible rather than yanking the row -- just reflect the new status, and let
      // the active status filter (if any) decide whether to re-query it out on next load.
      if (statusFilter === 'OPEN') {
        setReports((prev) => prev.filter((r) => r._id !== reportId));
      } else {
        setReports((prev) =>
          prev.map((r) => (r._id === reportId ? { ...r, status: 'RESOLVED', resolvedAt: new Date().toISOString() } : r))
        );
      }
    } catch (err) {
      toast.error('Failed to resolve report.');
    } finally {
      setResolvingId(null);
    }
  };

  const hasActiveFilter = statusFilter !== 'ALL';

  if (loading) {
    return <LoadingSpinner message="Loading no-dealer-available reports..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-display flex items-center gap-2.5">
          <MapPin className="w-6 h-6 text-sky-400" />
          No-Dealer-Available Reports
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Customers who hit a checkout dead-end -- no dealer configured for their Material + Location +
          Wheel/Patiya combination. Resolve once a dealer/rate is set up to cover the gap.
        </p>
      </div>

      {/* Filter bar -- status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 sm:mb-0 sm:mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="app-select px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All</option>
            <option value="OPEN">Need to Resolve</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
          >
            Clear
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No reports"
          description={
            hasActiveFilter
              ? 'No reports match this filter.'
              : "When a customer can't find a dealer during checkout and taps 'Notify Admin', it'll show up here."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => {
            const badge = statusBadge(report.status);
            const isOpen = report.status !== 'RESOLVED';
            return (
              <div key={report._id} className="p-5 rounded-3xl border border-sky-500/40 bg-slate-900 shadow-classic">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-950/40 text-sky-300 border border-sky-800/40">
                      <AlertTriangle className="w-3.5 h-3.5 text-sky-400" />
                      No Dealer Available
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs font-medium text-slate-400 font-mono">
                      Reported: {formatDate(report.createdAt)}
                    </span>
                    {!isOpen && report.resolvedAt && (
                      <span className="text-xs font-medium text-emerald-400 font-mono">
                        Resolved: {formatDate(report.resolvedAt)}
                      </span>
                    )}
                  </div>
                  {isOpen && (
                    <button
                      onClick={() => handleResolve(report._id)}
                      disabled={resolvingId === report._id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {resolvingId === report._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Mark Resolved
                    </button>
                  )}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
