import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { orderService } from '../../services';
import { numberToWordsIndian } from '../../utils/numberToWords';
import { savePdfCrossPlatform } from '../../utils/downloadPdf';
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

// One complete GST tax-invoice block (header, parties, items, tax breakdown). Rendered twice on
// the same page -- once for the dealer's Material Invoice, once for Ananta's Service Charge
// Invoice -- so the two "FROM" parties, their GSTINs, and their amounts are never mixed up.
function InvoiceSection({
  badgeLabel,
  sellerName,
  sellerAddress,
  sellerMobile,
  sellerGstin,
  sellerPan,
  sellerEmail,
  invoiceNo,
  invoiceDate,
  dueDate,
  buyerName,
  buyerAddressLine1,
  buyerArea,
  buyerCity,
  buyerState,
  buyerPincode,
  buyerMobile,
  buyerGstin,
  shipToAddress,
  itemName,
  hsnCode,
  site,
  qtyDisplay,
  qtyNumeric,
  ratePerUnit,
  taxPercent,
  taxAmount,
  amount,
  taxableAmount,
  cgstAmount,
  sgstAmount,
  receivedAmount,
  amountInWords,
  showPaymentInfo,
  qrCodeUrl,
  showSignature
}) {
  const halfTaxPercent = taxPercent / 2;

  return (
    <div className="space-y-5">
      {/* Top Badges */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider font-mono">
          TAX INVOICE
        </span>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5 rounded-md border border-slate-300">
          {badgeLabel}
        </span>
      </div>

      {/* Seller Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-indigo-950 font-display">
          {sellerName}
        </h1>
        {sellerAddress && <p className="text-xs text-slate-700 leading-relaxed font-medium">{sellerAddress}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-800 pt-0.5 font-medium">
          {sellerMobile && <span>Mobile: <strong className="font-mono">{sellerMobile}</strong></span>}
          <span>GSTIN: <strong className="font-mono">{sellerGstin || 'Unregistered Dealer'}</strong></span>
          {sellerPan && <span>PAN Number: <strong className="font-mono">{sellerPan}</strong></span>}
        </div>
        {sellerEmail && (
          <p className="text-xs text-slate-700 font-medium">
            Email: <span className="font-mono">{sellerEmail}</span>
          </p>
        )}
      </div>

      {/* Invoice Metadata Ribbon */}
      <div className="bg-slate-100 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 border border-slate-200">
        <div>
          Invoice No.: <strong className="font-mono text-slate-950 font-bold">{invoiceNo}</strong>
        </div>
        <div>
          Invoice Date: <strong className="font-mono text-slate-950 font-bold">{invoiceDate}</strong>
        </div>
        <div>
          Due Date: <strong className="font-mono text-slate-950 font-bold">{dueDate}</strong>
        </div>
      </div>

      {/* 2-Column Party Details (BILL TO & SHIP TO) */}
      <div className="grid grid-cols-2 gap-6 pt-1 text-xs">
        <div className="space-y-1.5">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">BILL TO</h4>
          <div className="font-black text-slate-950 text-sm">{buyerName}</div>
          <p className="text-slate-700 leading-relaxed">
            {buyerAddressLine1}
            {buyerArea ? ', ' + buyerArea : ''}
            <br />
            {[buyerCity, buyerState, buyerPincode].filter(Boolean).join(', ')}
          </p>
          <div className="pt-1 space-y-0.5 text-slate-800">
            {buyerMobile && <div>Mobile: <span className="font-mono font-bold">{buyerMobile}</span></div>}
            <div>GSTIN: <span className="font-mono">{buyerGstin || 'Unregistered'}</span></div>
            <div>Place of Supply: <span className="font-semibold text-slate-950">{buyerState}</span></div>
          </div>
        </div>

        <div className="space-y-1.5">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">SHIP TO</h4>
          <div className="font-black text-slate-950 text-sm">{buyerName}</div>
          <p className="text-slate-700 leading-relaxed">{shipToAddress}</p>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="border border-slate-300 rounded-xl overflow-hidden mt-3">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3">ITEMS</th>
              <th className="py-2.5 px-3">HSN/SAC</th>
              <th className="py-2.5 px-3">SITE</th>
              <th className="py-2.5 px-3 text-right">QTY.</th>
              <th className="py-2.5 px-3 text-right">RATE</th>
              <th className="py-2.5 px-3 text-right">TAX</th>
              <th className="py-2.5 px-3 text-right">AMOUNT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
            <tr>
              <td className="py-3 px-3 font-bold text-slate-950">{itemName}</td>
              <td className="py-3 px-3 font-mono">{hsnCode}</td>
              <td className="py-3 px-3 uppercase text-slate-700">{site}</td>
              <td className="py-3 px-3 text-right font-mono font-bold">{qtyDisplay}</td>
              <td className="py-3 px-3 text-right font-mono">{ratePerUnit}</td>
              <td className="py-3 px-3 text-right font-mono">
                {taxAmount.toFixed(2)}
                <span className="block text-[10px] text-slate-500 font-normal">({taxPercent}%)</span>
              </td>
              <td className="py-3 px-3 text-right font-mono font-bold text-slate-950">
                {amount.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
            <tr>
              <td colSpan={3} className="py-2.5 px-3 uppercase tracking-wider">SUBTOTAL</td>
              <td className="py-2.5 px-3 text-right font-mono font-bold">{qtyNumeric}</td>
              <td className="py-2.5 px-3 text-right"></td>
              <td className="py-2.5 px-3 text-right font-mono">₹ {taxAmount.toFixed(2)}</td>
              <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950">
                ₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bottom Split */}
      <div className="grid grid-cols-2 gap-8 pt-3 border-t border-slate-200">
        <div className="space-y-4 text-xs">
          {showPaymentInfo && (
            <>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">BANK DETAILS</h4>
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

              <div className="flex items-start gap-4 pt-1">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">PAYMENT QR CODE</h4>
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
                    <img src={qrCodeUrl} alt="UPI Payment QR Code" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="space-y-1 pt-1 text-[11px] text-slate-600">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">TERMS AND CONDITIONS</h4>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Goods once sold will not be taken back or exchanged</li>
              <li>All disputes are subject to [AHMEDABAD] jurisdiction only</li>
            </ol>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-1.5 border-b border-slate-200 pb-3">
            <div className="flex justify-between items-center text-slate-700">
              <span>Taxable Amount</span>
              <span className="font-mono font-semibold">
                ₹ {taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span>CGST @{halfTaxPercent}%</span>
              <span className="font-mono font-semibold">
                ₹ {cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span>SGST @{halfTaxPercent}%</span>
              <span className="font-mono font-semibold">
                ₹ {sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-950 font-bold border-t border-slate-200 pt-1.5 text-sm">
              <span>Total Amount</span>
              <span className="font-mono font-black text-indigo-950">
                ₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-700 pt-0.5">
              <span>Received Amount</span>
              <span className="font-mono font-semibold">
                ₹ {receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
              Total Amount (in words)
            </span>
            <p className="text-xs font-semibold text-slate-900 leading-snug">{amountInWords}</p>
          </div>

          <div className="pt-4 text-right space-y-1">
            {showSignature ? (
              <div className="inline-block text-center space-y-1">
                <div className="w-36 h-12 flex items-center justify-center font-serif text-2xl font-black italic tracking-widest text-indigo-950 border-b border-slate-400 mx-auto select-none opacity-90">
                  Ashishpatel
                </div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-800">
                  AUTHORISED SIGNATORY FOR<br />
                  <span className="text-indigo-950 font-black">ANANTA TRADERS</span>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 italic">
                This is a system-generated invoice issued on behalf of the selling dealer.
                No signature required.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  // Ananta's real, Zoho-issued "Service Charge" invoice (18% GST, Ananta's own GSTIN) -- created
  // lazily the moment this page is viewed for a PAID order, never at payment-confirmation time.
  // null until it resolves; the invoice below falls back to a locally-formatted placeholder
  // number in the meantime so the PDF never looks broken.
  const [serviceChargeInfo, setServiceChargeInfo] = useState(null);
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

        // Lazily issue (or retrieve the already-issued) Zoho Service Charge invoice -- only once
        // the order is actually PAID, and only on this view, never automatically at payment time.
        // Dumper orders settle by real weighed tonnage AFTER the upfront payment (see
        // enterTotalWeight), so the real total is only known once that final payment is also
        // PAID -- issuing the Zoho invoice any earlier would permanently lock in the wrong
        // (booking-token) amount. Fails soft: the rest of the invoice still renders even if Zoho
        // is briefly unavailable.
        const isTractorOrder = orderData?.transportType === 'Tractor' || orderData?.vehicleTypeSnapshot === 'TRACTOR';
        const readyForServiceChargeInvoice = orderData?.paymentStatus === 'PAID'
          && (isTractorOrder || orderData?.finalPaymentStatus === 'PAID');
        if (readyForServiceChargeInvoice) {
          orderService
            .getServiceChargeInvoice(id)
            .then((scRes) => setServiceChargeInfo(scRes.data))
            .catch((scErr) => {
              console.warn('Service charge invoice notice:', scErr);
              toast.error('Could not generate the service charge invoice right now. The material invoice is still shown below.');
            });
        }

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

  // 1-Click Direct PDF Download using html2canvas & jsPDF. Renders BOTH invoice blocks (Material
  // + Service Charge) itself, one consistent visual style -- the real Zoho invoice record still
  // gets created in the background (for Ananta's own GST accounting under its own GSTIN), but its
  // invoice NUMBER is embedded here rather than merging Zoho's own separately-styled PDF, since
  // the Material Invoice can never legally come from Zoho itself (one Zoho org = one fixed GSTIN,
  // never the selling dealer's) -- keeping both invoices in the same rendered style avoids an
  // visually-jarring mismatch between them.
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !order) return;
    setIsDownloading(true);
    toast.loading('Generating Official Tax Invoice PDF...', { id: 'pdf-gen' });

    try {
      // The Service Charge section's Qty/Rate/Amount (and its real Zoho invoice number) are
      // derived from serviceChargeInfo once it loads -- a fast click right after the page mounts
      // can otherwise capture the on-screen invoice BEFORE that background fetch resolves. Make
      // sure it's loaded first.
      if (!serviceChargeInfo && order.paymentStatus === 'PAID' && !pendingFinalSettlement) {
        const scRes = await orderService.getServiceChargeInvoice(order._id);
        setServiceChargeInfo(scRes.data);
        // Give React a chance to commit that state update to the DOM before html2canvas reads it.
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }

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

      // Two stacked invoices (Material + Service Charge) are almost always taller than one A4
      // page -- slice the tall image across as many pages as needed instead of silently clipping
      // anything past page 1.
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const safeNo = (order.invoiceNumber || order.orderNumber || 'Invoice').replace(/[/\\:]/g, '_');
      const result = await savePdfCrossPlatform(pdf, 'ANANTA_TRADERS_' + safeNo + '.pdf');

      toast.success(
        result === 'opened' ? '🎉 Invoice PDF downloading…' : '🎉 Invoice PDF downloaded directly!',
        { id: 'pdf-gen' }
      );
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
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
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
  const isTractorOrder = order.transportType === 'Tractor' || order.vehicleTypeSnapshot === 'TRACTOR';
  // Dumper orders settle by real weighed tonnage via a separate final payment AFTER the upfront
  // booking payment -- the GST invoice (and its Zoho Service Charge portion) only reflects the
  // real total once that final payment is also PAID.
  const pendingFinalSettlement = !isTractorOrder && order.finalPaymentStatus !== 'PAID';

  // Split the blended totalAmount into the dealer's material-sale portion and Ananta's own
  // service-charge portion (falls back to the full amount as "material" until the Zoho call
  // resolves, so the page is never stuck showing a blank/broken invoice).
  const materialAmount = serviceChargeInfo ? serviceChargeInfo.materialAmount : totalAmount;
  const serviceChargeAmount = serviceChargeInfo ? serviceChargeInfo.serviceChargeAmount : 0;
  const serviceChargeInvoiceNo = serviceChargeInfo?.zohoInvoiceNumber || invoiceNo + '-SC';

  // Material Invoice: 5% GST (the existing rate for sand/aggregate goods).
  const materialTaxable = Math.round((materialAmount / 1.05) * 100) / 100;
  const materialTax = Math.round((materialAmount - materialTaxable) * 100) / 100;
  const materialCgst = Math.round((materialTax / 2) * 100) / 100;
  const materialSgst = Math.round((materialTax - materialCgst) * 100) / 100;

  // Service Charge Invoice: 18% GST (standard service rate), GST-inclusive.
  const serviceTaxable = Math.round((serviceChargeAmount / 1.18) * 100) / 100;
  const serviceTax = Math.round((serviceChargeAmount - serviceTaxable) * 100) / 100;
  const serviceCgst = Math.round((serviceTax / 2) * 100) / 100;
  const serviceSgst = Math.round((serviceTax - serviceCgst) * 100) / 100;

  // Same real Qty/Rate breakdown the actual Zoho invoice uses (e.g. 30 TON x Rs25/Ton), from the
  // backend's own fresh computation -- not a flattened "1 SERVICE" line.
  const scQuantity = serviceChargeInfo?.quantity || 1;
  const scUnit = serviceChargeInfo?.unit === 'trip' ? 'TRACTOR' : 'TON';
  const scRatePerUnit = (order.serviceChargeRateSnapshot || 0).toFixed(2);

  // Dumper's real quantity is only known once the dealer weighs it (order.totalWeight) -- before
  // that, approximateTon is just a capacity estimate, not what was actually sold. Prefer the
  // backend's own fresh computation (serviceChargeInfo.quantity, from its own live DB read) over
  // this client's possibly-stale `order` snapshot, so the Material Invoice's Qty/Rate always
  // matches the real Zoho Service Charge invoice's own breakdown exactly.
  const dumperQty = order.totalWeight || order.approximateTon || order.quantity || 41.67;

  const qtyNumeric = serviceChargeInfo?.quantity
    || (order.transportType === 'Tractor' ? (order.numberOfTractors || order.quantity || 1) : dumperQty);

  const qtyDisplay = order.transportType === 'Tractor'
    ? qtyNumeric + ' TRACTOR'
    : qtyNumeric + ' TON';

  const ratePerUnit = serviceChargeInfo?.materialRatePerUnit != null
    ? serviceChargeInfo.materialRatePerUnit.toFixed(2)
    : (qtyNumeric > 0 ? (materialTaxable / qtyNumeric).toFixed(2) : materialTaxable.toFixed(2));

  // Customer / Party (buyer) details -- real data; GSTIN is genuinely blank if the customer
  // never registered one (no fake placeholder).
  const customerName = order.shippingDetails?.fullName || order.userId?.name || 'Customer';
  const customerMobile = order.shippingDetails?.mobile || order.userId?.mobile || '';
  const customerAddress1 = order.shippingDetails?.addressLine1 || order.shippingAddress || '';
  const customerArea = order.shippingDetails?.area || order.deliveryArea || '';
  const customerCity = order.shippingDetails?.city || order.deliveryCity || '';
  const customerState = order.shippingDetails?.state || order.deliveryState || 'Gujarat';
  const customerPincode = order.pincode || order.shippingDetails?.pincode || '';
  const customerGstin = order.userId?.gstNumber || '';

  const siteAreaPart = customerArea ? customerArea + ', ' : '';
  const siteAddress = order.shippingAddress || (customerAddress1 + ', ' + siteAreaPart + customerCity + ', ' + customerState + ' - ' + customerPincode);
  const siteShort = customerArea || customerCity || 'HIGH STREET';

  // Selected dealer's own details -- the Material Invoice's "FROM" party. Real data only; a
  // dealer who hasn't set their GST number yet shows a blank GSTIN rather than a fake one.
  const dealerName = order.dealerId?.companyName || order.dealerId?.name || 'Selected Dealer';
  const dealerAddress = order.dealerId?.officeAddress || '';
  const dealerCityStatePin = [order.dealerId?.city, order.dealerId?.state, order.dealerId?.pincode].filter(Boolean).join(', ');
  const dealerMobile = order.dealerId?.mobile || order.dealerId?.whatsappNumber || '';
  const dealerGstin = order.dealerId?.gstNumber || '';
  // A GSTIN's characters 3-12 ARE the holder's PAN by construction -- no separate PAN field needed.
  const dealerPan = dealerGstin.length === 15 ? dealerGstin.slice(2, 12) : '';

  const materialAmountInWords = numberToWordsIndian(materialAmount);
  const serviceChargeAmountInWords = numberToWordsIndian(serviceChargeAmount);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-3 sm:px-6 selection:bg-amber-500 selection:text-slate-950">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Downloading PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  <span>Direct Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================= TWO TAX INVOICES, ONE PDF ================= */}
      <div className="max-w-4xl mx-auto overflow-x-auto pb-6">
        <div
          ref={invoiceRef}
          className="print-container w-full min-w-[720px] max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl p-8 sm:p-10 shadow-2xl border border-slate-200 space-y-8 font-sans"
        >
          {/* 1. MATERIAL INVOICE -- issued under the selected dealer's own GSTIN, on their behalf */}
          <div>
            <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-black text-amber-800 uppercase tracking-wider inline-block">
              Invoice 1 of 2 &mdash; Material (Dealer)
            </div>
            <InvoiceSection
              badgeLabel="ORIGINAL FOR RECIPIENT"
              sellerName={dealerName}
              sellerAddress={[dealerAddress, dealerCityStatePin].filter(Boolean).join(', ')}
              sellerMobile={dealerMobile}
              sellerGstin={dealerGstin}
              sellerPan={dealerPan}
              sellerEmail=""
              invoiceNo={invoiceNo}
              invoiceDate={formattedInvoiceDate}
              dueDate={formattedDueDate}
              buyerName={customerName}
              buyerAddressLine1={customerAddress1}
              buyerArea={customerArea}
              buyerCity={customerCity}
              buyerState={customerState}
              buyerPincode={customerPincode}
              buyerMobile={customerMobile}
              buyerGstin={customerGstin}
              shipToAddress={siteAddress}
              itemName={order.productNameSnapshot || 'Construction Material'}
              hsnCode={hsnCode}
              site={siteShort}
              qtyDisplay={qtyDisplay}
              qtyNumeric={qtyNumeric}
              ratePerUnit={ratePerUnit}
              taxPercent={5}
              taxAmount={materialTax}
              amount={materialAmount}
              taxableAmount={materialTaxable}
              cgstAmount={materialCgst}
              sgstAmount={materialSgst}
              receivedAmount={isPaid ? materialAmount : 0}
              amountInWords={materialAmountInWords}
              showPaymentInfo={false}
              qrCodeUrl={qrCodeUrl}
              showSignature={false}
            />
          </div>

          <div className="border-t-2 border-dashed border-slate-300" />

          {/* 2. SERVICE CHARGE INVOICE -- Ananta's own real Zoho-issued invoice, 18% GST. Rendered
              in the same style as the Material Invoice (not Zoho's own PDF layout, which could
              never legally carry the dealer's GSTIN anyway), carrying Zoho's real invoice number
              and the same Qty/Rate breakdown the actual Zoho record uses. */}
          <div>
            <div className="mb-3 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-[11px] font-black text-indigo-800 uppercase tracking-wider inline-block">
              Invoice 2 of 2 &mdash; Platform Service Charge (Ananta Traders)
            </div>
            <InvoiceSection
              badgeLabel="ORIGINAL FOR RECIPIENT"
              sellerName="ANANTA TRADERS"
              sellerAddress="shop no 10 Love kush tower, Near Udgam school, Thalej, Ahmedabad , Gujarat, 380054"
              sellerMobile="9974240461"
              sellerGstin="24BNFPP3477F1ZW"
              sellerPan="BNFPP3477F"
              sellerEmail="anantatraders19422@gmail.com"
              invoiceNo={serviceChargeInvoiceNo}
              invoiceDate={formattedInvoiceDate}
              dueDate={formattedDueDate}
              buyerName={customerName}
              buyerAddressLine1={customerAddress1}
              buyerArea={customerArea}
              buyerCity={customerCity}
              buyerState={customerState}
              buyerPincode={customerPincode}
              buyerMobile={customerMobile}
              buyerGstin={customerGstin}
              shipToAddress={siteAddress}
              itemName={`Platform Service Charge - Order #${order.orderNumber}`}
              hsnCode="998599"
              site={siteShort}
              qtyDisplay={`${scQuantity} ${scUnit}`}
              qtyNumeric={scQuantity}
              ratePerUnit={scRatePerUnit}
              taxPercent={18}
              taxAmount={serviceTax}
              amount={serviceChargeAmount}
              taxableAmount={serviceTaxable}
              cgstAmount={serviceCgst}
              sgstAmount={serviceSgst}
              receivedAmount={isPaid ? serviceChargeAmount : 0}
              amountInWords={serviceChargeAmountInWords}
              showPaymentInfo
              qrCodeUrl={qrCodeUrl}
              showSignature
            />
          </div>
        </div>
      </div>

      {pendingFinalSettlement && (
        <div className="max-w-4xl mx-auto pb-6 no-print">
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5 sm:p-6">
            <p className="text-xs text-indigo-700">
              This order's final weight-based settlement is still pending. Both invoices above will
              reflect the actual weighed tonnage once the final payment is completed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
