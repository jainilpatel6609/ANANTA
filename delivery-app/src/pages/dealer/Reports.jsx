import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { orderService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatINR } from '../../utils/formatters';
import { savePdfCrossPlatform } from '../../utils/downloadPdf';
import { FileBarChart, Truck, Download, Loader2, Package, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';

const PERIODS = [
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' }
];

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      try {
        const res = await orderService.getDealerVehicleSalesReport(period);
        setVehicles(res.data?.vehicles || []);
      } catch (err) {
        toast.error('Failed to load sales report.');
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [period]);

  const totals = vehicles.reduce(
    (acc, v) => ({
      orders: acc.orders + (v.totalOrders || 0),
      tonnage: acc.tonnage + (v.totalTonnage || 0),
      sales: acc.sales + (v.totalSales || 0)
    }),
    { orders: 0, tonnage: 0, sales: 0 }
  );

  const handleDownloadPDF = async () => {
    if (!reportRef.current || vehicles.length === 0) return;
    setIsDownloading(true);
    toast.loading('Generating report PDF...', { id: 'report-pdf' });

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 900
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const periodLabel = PERIODS.find((p) => p.id === period)?.label.replace(/\s+/g, '_') || period;
      const result = await savePdfCrossPlatform(pdf, `ANANTA_Dumper_Sales_Report_${periodLabel}.pdf`);

      if (result === 'shared') {
        toast.success('Report PDF shared!', { id: 'report-pdf' });
      } else if (result === 'downloaded') {
        toast.success('Report PDF downloaded!', { id: 'report-pdf' });
      } else {
        toast.dismiss('report-pdf');
      }
    } catch (err) {
      console.error('Report PDF generation error:', err);
      toast.error('Failed to generate PDF.', { id: 'report-pdf' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display flex items-center gap-2.5">
            <FileBarChart className="w-6 h-6 text-amber-600" />
            Dumper Sales Report
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Delivered Dumper orders grouped by Vehicle Number, for the selected period.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={isDownloading || vehicles.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 min-h-[44px]"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>Download PDF</span>
        </button>
      </div>

      {/* Period Filter Tabs */}
      <div className="inline-flex items-center gap-1.5 p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
              period === p.id
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading sales report..." />
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No Dumper sales in this period"
          description="Delivered Dumper orders for the selected period will show up here, grouped by Vehicle Number."
          icon={FileBarChart}
        />
      ) : (
        <div ref={reportRef} className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 font-display">ANANTA TRADERS</h3>
              <p className="text-[11px] text-slate-500">Dumper Sales Report &mdash; {PERIODS.find((p) => p.id === period)?.label}</p>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Generated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* Summary Tiles */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              <Truck className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <div className="text-lg font-black text-slate-900">{vehicles.length}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dumpers</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              <Package className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <div className="text-lg font-black text-slate-900">{totals.orders}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Orders</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <IndianRupee className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <div className="text-lg font-black text-emerald-700">{formatINR(totals.sales)}</div>
              <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Total Sales</div>
            </div>
          </div>

          {/* Per-Vehicle Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2.5 pr-3 text-slate-500 font-bold uppercase text-[10px] tracking-wider">Vehicle Number</th>
                  <th className="py-2.5 pr-3 text-slate-500 font-bold uppercase text-[10px] tracking-wider">Driver</th>
                  <th className="py-2.5 pr-3 text-slate-500 font-bold uppercase text-[10px] tracking-wider text-right">Orders</th>
                  <th className="py-2.5 pr-3 text-slate-500 font-bold uppercase text-[10px] tracking-wider text-right">Tonnage</th>
                  <th className="py-2.5 text-slate-500 font-bold uppercase text-[10px] tracking-wider text-right">Sales</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.vehicleNumber} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-3 font-mono font-bold text-slate-900">{v.vehicleNumber}</td>
                    <td className="py-3 pr-3 text-slate-600">{v.driverName || '—'}</td>
                    <td className="py-3 pr-3 text-right text-slate-700 font-semibold">{v.totalOrders}</td>
                    <td className="py-3 pr-3 text-right text-slate-700 font-semibold">
                      {v.totalTonnage ? `${v.totalTonnage} Ton` : '—'}
                    </td>
                    <td className="py-3 text-right font-black text-amber-600 font-mono">{formatINR(v.totalSales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
