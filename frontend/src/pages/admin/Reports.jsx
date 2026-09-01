import React, { useState, useEffect } from 'react';
import { adminService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatINR } from '../../utils/formatters';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  TrendingUp,
  FileText,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Reports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await adminService.getReports(selectedMonth, selectedYear);
      if (res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      toast.error('Failed to aggregate reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedMonth, selectedYear]);

  const handleExportCSV = () => {
    window.open(adminService.exportUrl('csv'), '_blank');
  };

  const handleExportExcel = () => {
    window.open(adminService.exportUrl('xlsx'), '_blank');
  };

  if (loading) {
    return <LoadingSpinner message="Calculating financial metrics & dealer performance..." />;
  }

  const { monthlyStats = [], dealerPerformance = [] } = reportData || {};

  const monthlyTotalRevenue = monthlyStats.reduce((sum, d) => sum + (d.totalRevenue || 0), 0);
  const monthlyTotalOrders = monthlyStats.reduce((sum, d) => sum + (d.totalOrders || 0), 0);
  const monthlyTotalTonnage = monthlyStats.reduce((sum, d) => sum + (d.totalQuantity || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">Business Intelligence & Reports</h1>
          <p className="text-xs text-slate-400">
            Export monthly sales statements, mineral dispatch logs, and dealer fulfillment ratings.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-md shadow-emerald-900/30"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Month & Year Selectors */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Report Cycle:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
          >
            {[
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ].map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-slate-400 block">Monthly Revenue</span>
            <span className="text-lg font-black text-amber-400 font-mono">{formatINR(monthlyTotalRevenue)}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Monthly Tonnage</span>
            <span className="text-lg font-black text-white font-mono">{monthlyTotalTonnage} Tons</span>
          </div>
          <div>
            <span className="text-slate-400 block">Total Orders</span>
            <span className="text-lg font-black text-white font-mono">{monthlyTotalOrders}</span>
          </div>
        </div>
      </div>

      {/* Dealer Performance Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white font-display">Dealer Network Performance Matrix</h3>
            <p className="text-xs text-slate-400">Track delivery completion rates, rejected orders, and revenue generated per partner</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Dealer Partner</th>
                <th className="px-4 py-3.5">Assigned Dispatches</th>
                <th className="px-4 py-3.5">Delivered (OTP)</th>
                <th className="px-4 py-3.5">Completion Rate</th>
                <th className="px-4 py-3.5">Total Tonnage</th>
                <th className="px-4 py-3.5 text-right">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dealerPerformance.map((d) => (
                <tr key={d.dealerId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-white">
                    {d.companyName || d.dealerName}
                    <div className="text-[10px] text-slate-500 font-normal">{d.mobile}</div>
                  </td>
                  <td className="px-4 py-3.5 font-mono">{d.assignedOrders}</td>
                  <td className="px-4 py-3.5 font-mono text-emerald-400 font-bold">{d.deliveredOrders}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                      {Math.round(d.completionRate)}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-amber-400">{d.totalTonnage} Tons</td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-white text-sm">
                    {formatINR(d.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
