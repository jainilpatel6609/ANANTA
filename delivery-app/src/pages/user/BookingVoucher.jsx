import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { orderService } from '../../services';
import { numberToWordsIndian } from '../../utils/numberToWords';
import { savePdfCrossPlatform } from '../../utils/downloadPdf';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Download,
  ArrowLeft,
  Truck,
  CheckCircle2,
  Loader2,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

// Shown right after a Dumper order's upfront "booking" payment. Deliberately NOT a tax invoice
// (no GST/HSN/tax columns, no "TAX INVOICE" label) -- just a plain receipt confirming the flat
// booking amount was received, per the customer's explicit ask. The real GST tax invoice (see
// OrderInvoice.jsx) only appears once the final weight-based payment is also complete. This page
// also doubles as the post-payment "Thanks" landing screen.
export default function BookingVoucher() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const voucherRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.state?.justCreated || location.state?.justPaid || params.get('justPaid') === 'true') {
      setJustPaid(true);
    }

    const fetchOrder = async () => {
      try {
        const res = await orderService.getOrderById(id);
        setOrder(res.data?.order || res.data);
      } catch (err) {
        toast.error('Failed to load booking details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id, location]);

  const handleDownloadPDF = async () => {
    if (!voucherRef.current || !order) return;
    setIsDownloading(true);
    toast.loading('Generating Payment Voucher PDF...', { id: 'voucher-pdf' });

    try {
      const canvas = await html2canvas(voucherRef.current, {
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
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');

      const safeNo = (order.orderNumber || 'Booking').replace(/[/\\:]/g, '_');
      const result = await savePdfCrossPlatform(pdf, 'ANANTA_TRADERS_Payment_Voucher_' + safeNo + '.pdf');

      toast.success(
        result === 'opened' ? '🎉 Payment Voucher downloading…' : '🎉 Payment Voucher downloaded!',
        { id: 'voucher-pdf' }
      );
    } catch (err) {
      console.error('Voucher PDF Generation Error:', err);
      toast.error('Could not generate the voucher PDF. Please try again.', { id: 'voucher-pdf' });
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-400">Loading your payment voucher...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Order Not Found</h2>
          <button
            onClick={() => navigate('/user/orders')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
          >
            Back to My Orders
          </button>
        </div>
      </div>
    );
  }

  const bookingAmount = order.bookingAmountSnapshot || order.totalAmount || 0;
  const bookingDateObj = order.createdAt ? new Date(order.createdAt) : new Date();
  const formattedBookingDate = bookingDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const customerName = order.shippingDetails?.fullName || order.userId?.name || 'Customer';
  const customerMobile = order.shippingDetails?.mobile || order.userId?.mobile || '';
  const customerAddress1 = order.shippingDetails?.addressLine1 || '';
  const customerArea = order.shippingDetails?.area || '';
  const customerCity = order.shippingDetails?.city || order.deliveryCity || '';
  const customerState = order.shippingDetails?.state || order.deliveryState || 'Gujarat';
  const customerPincode = order.pincode || order.shippingDetails?.pincode || '';
  const shipToAddress = order.shippingAddress ||
    [customerAddress1, customerArea, customerCity, customerState, customerPincode].filter(Boolean).join(', ');

  const amountInWords = numberToWordsIndian(bookingAmount);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-3 sm:px-6 selection:bg-amber-500 selection:text-slate-950">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 6mm; }
          body { background: #ffffff !important; color: #000000 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto space-y-4 no-print mb-6">
        {justPaid && (
          <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-in fade-in duration-300">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white font-display">
                  Thanks for your payment!
                </h3>
                <p className="text-xs text-emerald-300/90 font-medium mt-0.5">
                  Order #{order.orderNumber} is booked. Your ₹{bookingAmount.toLocaleString('en-IN')} booking amount is confirmed.
                </p>
              </div>
            </div>
            <Link
              to={'/user/orders/' + order._id}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              Track Live Delivery
            </Link>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-lg">
          <button
            type="button"
            onClick={() => navigate('/user/orders')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>My Orders</span>
          </button>

          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>Download Voucher PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-6">
        <div
          ref={voucherRef}
          className="w-full bg-white text-slate-900 rounded-2xl p-8 sm:p-10 shadow-2xl border border-slate-200 space-y-6 font-sans"
        >
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-indigo-950 font-display">
              ANANTA TRADERS
            </h1>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              shop no 10 Love kush tower, Near Udgam school, Thalej, Ahmedabad, Gujarat, 380054
            </p>
            <p className="text-xs text-slate-700 font-medium">Mobile: <strong className="font-mono">9974240461</strong></p>
          </div>

          <div className="flex items-center justify-center">
            <span className="text-sm font-black text-indigo-900 uppercase tracking-widest border-2 border-indigo-900 rounded-xl px-5 py-2">
              Payment Voucher
            </span>
          </div>

          <div className="bg-slate-100 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-y-1 text-xs font-semibold text-slate-800 border border-slate-200">
            <div>Order No.: <strong className="font-mono text-slate-950">#{order.orderNumber}</strong></div>
            <div>Date: <strong className="font-mono text-slate-950">{formattedBookingDate}</strong></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Customer Details</h4>
              <div className="font-black text-slate-950 text-sm">{customerName}</div>
              {customerMobile && <div className="text-slate-700">Mobile: <span className="font-mono font-bold">{customerMobile}</span></div>}
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Shipping Details</h4>
              <p className="text-slate-700 leading-relaxed">{shipToAddress}</p>
            </div>
          </div>

          <div className="border border-slate-300 rounded-xl p-5 flex items-center justify-between bg-slate-50">
            <span className="text-sm font-bold text-slate-900">Booking Amount Received</span>
            <span className="text-2xl font-black text-indigo-950 font-mono">
              ₹ {bookingAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
              Amount (in words)
            </span>
            <p className="text-xs font-semibold text-slate-900 leading-snug">{amountInWords}</p>
          </div>

          <p className="text-[10px] text-slate-500 italic text-center pt-2">
            This is a system-generated payment voucher acknowledging receipt of the booking
            amount, and is not a tax invoice.
          </p>
        </div>
      </div>
    </div>
  );
}
