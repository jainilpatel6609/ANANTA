import React from 'react';
import Modal from './Modal';
import { formatDate } from '../utils/formatters';
import { User, Mail, Phone, MapPin, FileText, Calendar, ShieldCheck, ImageOff, ExternalLink } from 'lucide-react';

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

// Admin view of everything captured when this dealer signed up -- full profile plus every KYC
// document (Aadhar/PAN) and live-camera photo (dealer selfie, depot front) they uploaded.
export default function DealerDetailsModal({ dealer, onClose }) {
  if (!dealer) return null;

  const addressParts = [dealer.addressLine1, dealer.addressLine2, dealer.area, dealer.city, dealer.state]
    .filter(Boolean)
    .join(', ');

  return (
    <Modal
      isOpen={Boolean(dealer)}
      onClose={onClose}
      title={`Dealer Details — ${dealer.companyName || dealer.name || ''}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Profile */}
        <div>
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <User className="w-3.5 h-3.5 text-amber-400" />
            Profile
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <InfoRow icon={User} label="Full Name" value={dealer.name} />
            <InfoRow icon={ShieldCheck} label="Dealer Code" value={dealer.dealerCode} />
            <InfoRow label="Company / Firm Name" value={dealer.companyName} />
            <InfoRow icon={Mail} label="Email" value={dealer.email} />
            <InfoRow icon={Phone} label="Mobile" value={dealer.mobile} />
            <InfoRow icon={Phone} label="WhatsApp Number" value={dealer.whatsappNumber} />
            <InfoRow label="GST Number" value={dealer.gstNumber} />
            <InfoRow icon={Calendar} label="Date of Birth" value={dealer.dob} />
            <InfoRow label="Gender" value={dealer.gender} />
            <InfoRow icon={Calendar} label="Joined On" value={formatDate(dealer.createdAt)} />
            <InfoRow
              icon={MapPin}
              label="Office Address"
              value={dealer.officeAddress || addressParts}
            />
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

        {/* KYC Documents */}
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
          </div>
        </div>
      </div>
    </Modal>
  );
}
