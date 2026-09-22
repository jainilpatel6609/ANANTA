import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { orderService } from '../../services';
import { numberToWordsIndian } from '../../utils/numberToWords';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import {
  Download,
  Printer,
  ArrowLeft,
  Truck,
  CheckCircle2,
  Share2,
  Loader2,
  FileText,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrderInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const invoiceRef = useRef(null);

  useEffect(() => {
    // Check if redirected immediately after payment
    const params = new URLSearchParams(location.search);
    if (location.state?.justCreated || location.state?.justPaid || params.get('justPaid') === 'true') {
      setJustPaid(true);
    }

    const fetchOrder = async () => {
      try {
        const res = await orderService.getOrderById(id);
        const orderData = res.data?.order || res.data;
        setOrder(orderData);

        // Generate high-resolution local QR code
        if (orderData) {
          const invNo = orderData.invoiceNumber || ('AN/SL/26-27/' + (orderData.orderNumber ? orderData.orderNumber.replace(/^[^\d]*/, '') : '234'));
          const upiUrl = 'upi://pay?pa=anantatraders.ibz2@icici&pn=ANANTA%20TRADERS&am=' + (orderData.totalAmount || 0) + '&cu=INR&tn=Invoice%20' + invNo;
          try {
            const qrUrl = await QRCode.toDataURL(upiUrl, { width: 160, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
            setQrCodeUrl(qrUrl);
          } catch (qrErr) {
            console.warn('QR Code generation notice:', qrErr);
          }
        }
      } catch (err) {
        toast.error('Failed to load invoice details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrder();
    }
  }, [id, location]);

  // 1-Click Direct PDF Download using html2canvas & jsPDF
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !order) return;
    setIsDownloading(true);
    toast.loading('Generating Official Tax Invoice PDF...', { id: 'pdf-gen' });

    try {
      const element = invoiceRef.current;
      
      // Capture element canvas at 2x scale for crisp 300 DPI vector-like clarity
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

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight), undefined, 'FAST');
      
      const safeNo = (order.invoiceNumber || order.orderNumber || 'Invoice').replace(/[/\\:]/g, '_');
      pdf.save('ANANTA_TRADERS_' + safeNo + '.pdf');
      
      toast.success('🎉 Invoice PDF downloaded directly!', { id: 'pdf-gen' });
    } catch (err) {
      console.error('PDF Generation Error:', err);
      toast.error('Direct PDF generation error. Opening print preview...', { id: 'pdf-gen' });
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'ANANTA TRADERS Tax Invoice - #' + (order?.orderNumber || ''),
          text: 'Tax Invoice for order #' + (order?.orderNumber || '') + ' - Amount: ₹' + (order?.totalAmount?.toLocaleString('en-IN') || ''),
          url: window.location.href
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Invoice link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-400">Generating Official Tax Invoice...</p>
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
          <h2 className="text-xl font-bold">Invoice Not Found</h2>
          <p className="text-xs text-slate-400">The requested invoice could not be located or access is restricted.</p>
          <button
            onClick={() => navigate('/user/orders')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
          >
            Back to My Orders
          </button>
        </div>
      </div>
    );
  }

  // Format Dates
  const invoiceDateObj = order.invoiceDate ? new Date(order.invoiceDate) : order.createdAt ? new Date(order.createdAt) : new Date();
  const formattedInvoiceDate = invoiceDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  const dueDateObj = order.deliveryDate ? new Date(order.deliveryDate) : new Date(invoiceDateObj.getTime() + 7 * 24 * 60 * 60 * 1000);
  const formattedDueDate = dueDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Invoice Number Format (e.g. AN/SL/26-27/234)
  const invoiceNo = order.invoiceNumber || ('AN/SL/26-27/' + (order.orderNumber ? order.orderNumber.replace(/^[^\d]*/, '') : '234'));

  // HSN Code Determination
  const categoryLower = (order.category || '').toLowerCase();
  let hsnCode = '25051011'; // River Sand Default
  if (categoryLower.includes('aggregate')) {
    hsnCode = '25171010';
  } else if (categoryLower.includes('grit')) {
    hsnCode = '25059000';
  }

  // Quantities and Unit Computations
  const totalAmount = order.totalAmount || 0;
  const isPaid = order.paymentStatus === 'PAID';
  const receivedAmount = isPaid ? totalAmount : 0;

  // GST 5% Split: Taxable = Total / 1.05, CGST = 2.5%, SGST = 2.5%
  const taxableAmount = Math.round((totalAmount / 1.05) * 100) / 100;
  const totalTax = Math.round((totalAmount - taxableAmount) * 100) / 100;
  const cgstAmount = Math.round((totalTax / 2) * 100) / 100;
  const sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;

  const qtyDisplay = order.transportType === 'Tractor'
    ? (order.numberOfTractors || order.quantity || 1) + ' TRACTOR'
    : (order.approximateTon || order.quantity || 41.67) + ' TON';

  const qtyNumeric = order.transportType === 'Tractor'
    ? (order.numberOfTractors || order.quantity || 1)
    : (order.approximateTon || order.quantity || 41.67);

  const ratePerUnit = qtyNumeric > 0 ? (taxableAmount / qtyNumeric).toFixed(2) : taxableAmount.toFixed(2);

  // Customer / Party Details
  const customerName = order.shippingDetails?.fullName || order.userId?.name || 'SANKALP VENTURE LLP';
  const customerMobile = order.shippingDetails?.mobile || order.userId?.mobile || '9925619793';
  const customerAddress1 = order.shippingDetails?.addressLine1 || order.shippingAddress || 'SUR NO 207/20 FP 27 12, SANKALP HOUSE';
  const customerArea = order.shippingDetails?.area || order.deliveryArea || '';
  const customerCity = order.shippingDetails?.city || order.deliveryCity || 'Ahmedabad';
  const customerState = order.shippingDetails?.state || order.deliveryState || 'Gujarat';
  const customerPincode = order.pincode || order.shippingDetails?.pincode || '380054';

  const siteAreaPart = customerArea ? customerArea + ', ' : '';
  const siteAddress = order.shippingAddress || (customerAddress1 + ', ' + siteAreaPart + customerCity + ', ' + customerState + ' - ' + customerPincode);
  const siteShort = customerArea || customerCity || 'HIGH STREET';

  const amountInWords = numberToWordsIndian(totalAmount);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-3 sm:px-6 selection:bg-slate-900 selection:text-white">
      {/* Dynamic Print Stylesheet to enforce A4, Vector Crispness & Hide Chrome Controls */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 6mm 6mm 6mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Top Action & Navigation Controls (Hidden in Print) */}
      <div className="max-w-4xl mx-auto space-y-4 no-print mb-6">
        {/* Payment Confirmation Banner (if just completed) */}
        {justPaid && (
          <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-in fade-in duration-300">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white font-display flex items-center gap-2">
                  <span>Payment Confirmed!</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">Order Dispatched</span>
                </h3>
                <p className="text-xs text-emerald-300/90 font-medium mt-0.5">
                  Order #{order.orderNumber} is confirmed & assigned to nearest depot for dispatch.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                to={'/user/orders/' + order._id}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                Track Live Delivery
              </Link>
            </div>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/user/orders')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>My Orders</span>
            </button>
            <Link
              to={'/user/orders/' + order._id}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Live GPS Status</span>
            </Link>
          </div>

          {/* Download & Print Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
              title="Share invoice link"
            >
              <Share2 className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
              title="Print Invoice"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* DIRECT PDF DOWNLOAD BUTTON (PRIMARY) */}
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-800 text-white text-xs font-black shadow-lg shadow-slate-900/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Downloading PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white stroke-[2.5]" />
                  <span>Direct Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================= OFFICIAL TAX INVOICE CARD (EXACT A4 TEMPLATE) ================= */}
      <div className="max-w-4xl mx-auto overflow-x-auto pb-6">
        <div
          ref={invoiceRef}
          className="print-container w-full min-w-[720px] max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl p-8 sm:p-10 shadow-2xl border border-slate-200 space-y-5 font-sans"
        >
          {/* Top Badges */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider font-mono">
              TAX INVOICE
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5 rounded-md border border-slate-300">
              ORIGINAL FOR RECIPIENT
            </span>
          </div>

          {/* Company Header */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-indigo-950 font-display">
              ANANTA TRADERS
            </h1>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              shop no 10 Love kush tower, Near Udgam school, Thalej, Ahmedabad , Gujarat, 380054
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-800 pt-0.5 font-medium">
              <span>Mobile: <strong className="font-mono">9974240461</strong></span>
              <span>GSTIN: <strong className="font-mono">24BNFPP3477F1ZW</strong></span>
              <span>PAN Number: <strong className="font-mono">BNFPP3477F</strong></span>
            </div>
            <p className="text-xs text-slate-700 font-medium">
              Email: <span className="font-mono">anantatraders19422@gmail.com</span>
            </p>
          </div>

          {/* Invoice Metadata Ribbon */}
          <div className="bg-slate-100 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 border border-slate-200">
            <div>
              Invoice No.: <strong className="font-mono text-slate-950 font-bold">{invoiceNo}</strong>
            </div>
            <div>
              Invoice Date: <strong className="font-mono text-slate-950 font-bold">{formattedInvoiceDate}</strong>
            </div>
            <div>
              Due Date: <strong className="font-mono text-slate-950 font-bold">{formattedDueDate}</strong>
            </div>
          </div>

          {/* 2-Column Party Details (BILL TO & SHIP TO) */}
          <div className="grid grid-cols-2 gap-6 pt-1 text-xs">
            {/* BILL TO */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                BILL TO
              </h4>
              <div className="font-black text-slate-950 text-sm">
                {customerName}
              </div>
              <p className="text-slate-700 leading-relaxed">
                {customerAddress1}
                {customerArea ? ', ' + customerArea : ''}
                <br />
                {customerCity}, {customerState}, {customerPincode}
              </p>
              <div className="pt-1 space-y-0.5 text-slate-800">
                <div>Mobile: <span className="font-mono font-bold">{customerMobile}</span></div>
                <div>GSTIN: <span className="font-mono">24ACZFS2243J1ZN</span></div>
                <div>PAN Number: <span className="font-mono">ACZFS2243J</span></div>
                <div>Place of Supply: <span className="font-semibold text-slate-950">Gujarat</span></div>
              </div>
            </div>

            {/* SHIP TO */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                SHIP TO
              </h4>
              <div className="font-black text-slate-950 text-sm">
                {customerName}
              </div>
              <p className="text-slate-700 leading-relaxed">
                {siteAddress}
              </p>
            </div>
          </div>

          {/* ================= ITEMS TABLE ================= */}
          <div className="border border-slate-300 rounded-xl overflow-hidden mt-3">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">ITEMS</th>
                  <th className="py-2.5 px-3">HSN</th>
                  <th className="py-2.5 px-3">SITE</th>
                  <th className="py-2.5 px-3 text-right">QTY.</th>
                  <th className="py-2.5 px-3 text-right">RATE</th>
                  <th className="py-2.5 px-3 text-right">TAX</th>
                  <th className="py-2.5 px-3 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                <tr>
                  <td className="py-3 px-3 font-bold text-slate-950">
                    {order.productNameSnapshot || 'FILTER SAND PATAN'}
                  </td>
                  <td className="py-3 px-3 font-mono">{hsnCode}</td>
                  <td className="py-3 px-3 uppercase text-slate-700">{siteShort}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold">{qtyDisplay}</td>
                  <td className="py-3 px-3 text-right font-mono">{ratePerUnit}</td>
                  <td className="py-3 px-3 text-right font-mono">
                    {totalTax.toFixed(2)}
                    <span className="block text-[10px] text-slate-500 font-normal">(5%)</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-950">
                    {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
              {/* Subtotal Row */}
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 uppercase tracking-wider">
                    SUBTOTAL
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">{qtyNumeric}</td>
                  <td className="py-2.5 px-3 text-right"></td>
                  <td className="py-2.5 px-3 text-right font-mono">₹ {totalTax.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950">
                    ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom Split (Bank Details, QR Code & Tax Calculations) */}
          <div className="grid grid-cols-2 gap-8 pt-3 border-t border-slate-200">
            {/* Left Column: Bank Details, QR & Terms */}
            <div className="space-y-4 text-xs">
              {/* Bank Details */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  BANK DETAILS
                </h4>
                <div className="grid grid-cols-3 gap-1 text-slate-700">
                  <span className="text-slate-500">Name:</span>
                  <span className="col-span-2 font-bold text-slate-900">ANANTA TRADERS</span>
                  <span className="text-slate-500">IFSC Code:</span>
                  <span className="col-span-2 font-mono font-bold text-slate-900">ICIC0007704</span>
                  <span className="text-slate-500">Account No:</span>
                  <span className="col-span-2 font-mono font-bold text-slate-900">770405000567</span>
                  <span className="text-slate-500">Bank:</span>
                  <span className="col-span-2 text-slate-900">ICICI Bank, JAGATPUR</span>
                </div>
              </div>

              {/* Payment QR Code */}
              <div className="flex items-start gap-4 pt-1">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    PAYMENT QR CODE
                  </h4>
                  <p className="text-[10px] text-slate-500">UPI ID:</p>
                  <p className="text-xs font-mono font-bold text-indigo-900">anantatraders.ibz2@icici</p>
                  <div className="flex items-center gap-1.5 pt-1 text-[9px] font-bold text-slate-600">
                    <span className="text-indigo-600">PhonePe</span>
                    <span>•</span>
                    <span className="text-blue-600">GPay</span>
                    <span>•</span>
                    <span className="text-cyan-600">Paytm</span>
                    <span>•</span>
                    <span className="text-orange-600">UPI</span>
                  </div>
                </div>
                {qrCodeUrl && (
                  <div className="w-20 h-20 p-1 bg-white border border-slate-300 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <img
                      src={qrCodeUrl}
                      alt="UPI Payment QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-1 pt-1 text-[11px] text-slate-600">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  TERMS AND CONDITIONS
                </h4>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Goods once sold will not be taken back or exchanged</li>
                  <li>All disputes are subject to [AHMEDABAD] jurisdiction only</li>
                </ol>
              </div>
            </div>

            {/* Right Column: Tax Breakdown, Amount in Words & Authorised Signatory */}
            <div className="space-y-4 text-xs">
              {/* Calculation Rows */}
              <div className="space-y-1.5 border-b border-slate-200 pb-3">
                <div className="flex justify-between items-center text-slate-700">
                  <span>Taxable Amount</span>
                  <span className="font-mono font-semibold">
                    ₹ {taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>CGST @2.5%</span>
                  <span className="font-mono font-semibold">
                    ₹ {cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>SGST @2.5%</span>
                  <span className="font-mono font-semibold">
                    ₹ {sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-950 font-bold border-t border-slate-200 pt-1.5 text-sm">
                  <span>Total Amount</span>
                  <span className="font-mono font-black text-indigo-950">
                    ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700 pt-0.5">
                  <span>Received Amount</span>
                  <span className="font-mono font-semibold">
                    ₹ {receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Total Amount in Words */}
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                  Total Amount (in words)
                </span>
                <p className="text-xs font-semibold text-slate-900 leading-snug">
                  {amountInWords}
                </p>
              </div>

              {/* Signature Box */}
              <div className="pt-4 text-right space-y-1">
                <div className="inline-block text-center space-y-1">
                  <div className="w-36 h-12 flex items-center justify-center font-serif text-2xl font-black italic tracking-widest text-indigo-950 border-b border-slate-400 mx-auto select-none opacity-90">
                    Ashishpatel
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-800">
                    AUTHORISED SIGNATORY FOR<br />
                    <span className="text-indigo-950 font-black">ANANTA TRADERS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
