import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { dealerRequestService } from '../../services';
import { formatDate } from '../../utils/formatters';
import {
  ClipboardCheck,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ImageOff,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

const DOC_FIELDS = [
  { key: 'aadharFrontUrl', label: 'Aadhar Card (Front)' },
  { key: 'aadharBackUrl', label: 'Aadhar Card (Back)' },
  { key: 'panFrontUrl', label: 'PAN Card (Front)' },
  { key: 'panBackUrl', label: 'PAN Card (Back)' },
  { key: 'dealerPhotoUrl', label: 'Dealer Photo (Live Camera)' },
  { key: 'officeFrontPhotoUrl', label: 'Depot / Office Front (Live Camera)' }
];

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2.5 py-2 border-b border-slate-800/60 last:border-0">
    {Icon && <Icon className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />}
    <div className="min-w-0">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
      <span className="text-xs text-slate-200 font-medium break-words">{value || 'Not provided'}</span>
    </div>
  </div>
);

function DealerRequestModal({ dealer, onClose, onDecided }) {
  const [deciding, setDeciding] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!dealer) return null;

  const addressParts = [dealer.addressLine1, dealer.addressLine2, dealer.area, dealer.city, dealer.state]
    .filter(Boolean)
    .join(', ');

  const handleApprove = async () => {
    setDeciding(true);
    try {
      await dealerRequestService.approve(dealer._id);
      toast.success(`${dealer.name} approved and notified.`);
      onDecided(dealer._id);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to approve dealer.');
    } finally {
      setDeciding(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a reason for rejection.');
      return;
    }
    setDeciding(true);
    try {
      await dealerRequestService.reject(dealer._id, rejectReason.trim());
      toast.success(`${dealer.name}'s registration rejected.`);
      onDecided(dealer._id);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to reject dealer.');
    } finally {
      setDeciding(false);
    }
  };

  return (
    <Modal isOpen={Boolean(dealer)} onClose={onClose} title={`Dealer Request — ${dealer.companyName || dealer.name || ''}`} maxWidth="max-w-3xl">
      <div className="space-y-6">
        <div>
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <User className="w-3.5 h-3.5 text-amber-400" />
            Profile
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <InfoRow icon={User} label="Full Name" value={dealer.name} />
            <InfoRow label="Company / Firm Name" value={dealer.companyName} />
            <InfoRow icon={Mail} label="Email" value={dealer.email} />
            <InfoRow icon={Phone} label="Mobile" value={dealer.mobile} />
            <InfoRow icon={Phone} label="WhatsApp Number" value={dealer.whatsappNumber} />
            <InfoRow label="GST Number" value={dealer.gstNumber} />
            <InfoRow icon={Calendar} label="Date of Birth" value={dealer.dob} />
            <InfoRow label="Gender" value={dealer.gender} />
            <InfoRow icon={Calendar} label="Submitted On" value={formatDate(dealer.createdAt)} />
            <InfoRow icon={MapPin} label="Office Address" value={dealer.officeAddress || addressParts} />
            <InfoRow label="PIN Code" value={dealer.pincode} />
            <InfoRow
              icon={MapPin}
              label="Depot GPS Location"
              value={
                dealer.latitude && dealer.longitude
                  ? `${Number(dealer.latitude).toFixed(5)}, ${Number(dealer.longitude).toFixed(5)}`
                  : null
              }
            />
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            KYC Documents & Live Photos
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DOC_FIELDS.map(({ key, label }) => {
              const url = dealer[key];
              return (
                <div key={key} className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="block group">
                      <div className="aspect-[4/3] bg-slate-900 overflow-hidden relative">
                        <img src={url} alt={label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                          <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="aspect-[4/3] bg-slate-900 flex flex-col items-center justify-center gap-1.5 text-slate-600">
                      <ImageOff className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Not uploaded</span>
                    </div>
                  )}
                  <div className="px-2.5 py-2">
                    <span className="text-[10px] font-bold text-slate-400 leading-tight block">{label}</span>
                  </div>
                </div>
              );
            })}

            {/* GST Registration Certificate -- a PDF, so it's a link/badge, not an image thumbnail */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
              {dealer.gstCertificateUrl ? (
                <a
                  href={dealer.gstCertificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-[4/3] bg-slate-900 flex flex-col items-center justify-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <FileText className="w-6 h-6" />
                  <span className="text-[10px] font-bold underline">View PDF</span>
                </a>
              ) : (
                <div className="aspect-[4/3] bg-slate-900 flex flex-col items-center justify-center gap-1.5 text-slate-600">
                  <ImageOff className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Not uploaded</span>
                </div>
              )}
              <div className="px-2.5 py-2">
                <span className="text-[10px] font-bold text-slate-400 leading-tight block">GST Registration Certificate</span>
              </div>
            </div>
          </div>
        </div>

        {showRejectBox ? (
          <div className="space-y-2.5 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4">
            <label className="text-xs font-bold text-rose-300 uppercase tracking-wider block">Reason for Rejection</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              placeholder="e.g. Aadhar photo is blurry, please re-upload"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={deciding}
                onClick={handleReject}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50 transition-all"
              >
                {deciding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Confirm Rejection
              </button>
              <button
                type="button"
                onClick={() => setShowRejectBox(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              disabled={deciding}
              onClick={handleApprove}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black disabled:opacity-50 transition-all"
            >
              {deciding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve Dealer
            </button>
            <button
              type="button"
              disabled={deciding}
              onClick={() => setShowRejectBox(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white text-sm font-black disabled:opacity-50 transition-all"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function DealerRequests() {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealer, setSelectedDealer] = useState(null);

  const loadRequests = async () => {
    try {
      const res = await dealerRequestService.getAll();
      setDealers(res.data?.dealers || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load dealer requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleDecided = (dealerId) => {
    setDealers((prev) => prev.filter((d) => d._id !== dealerId));
  };

  if (loading) {
    return <LoadingSpinner message="Loading dealer requests..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white font-display">Dealer Requests</h1>
        {dealers.length > 0 && (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-black text-xs border border-amber-500/30">
            {dealers.length} pending
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 -mt-4">
        New dealer self-registrations awaiting KYC review. Approve to let them set a password and
        log in, or reject with a reason.
      </p>

      {dealers.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No pending dealer requests"
          description="New dealer registrations will appear here for review."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dealers.map((dealer) => (
            <button
              key={dealer._id}
              type="button"
              onClick={() => setSelectedDealer(dealer)}
              className="text-left bg-slate-900 border border-amber-900/40 rounded-3xl p-5 space-y-3 shadow-xl hover:border-amber-500/50 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-white font-display">{dealer.companyName || dealer.name}</h3>
                  <p className="text-[11px] text-slate-500">{dealer.name}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-amber-500/10 text-amber-400 border-amber-500/30 shrink-0">
                  Pending
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="font-mono">{dealer.mobile}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{dealer.officeAddress}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                Submitted {formatDate(dealer.createdAt)}
              </div>
            </button>
          ))}
        </div>
      )}

      <DealerRequestModal dealer={selectedDealer} onClose={() => setSelectedDealer(null)} onDecided={handleDecided} />
    </div>
  );
}
