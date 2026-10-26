import React from 'react';
import Modal from './Modal';
import { formatDate } from '../utils/formatters';
import { User, Phone, Truck, FileText, Calendar, ImageOff, ExternalLink, Building2 } from 'lucide-react';

const DOC_FIELDS = [
  { key: 'photoUrl', label: 'Driver Photo' },
  { key: 'licenseFrontUrl', label: 'Driving License (Front)' },
  { key: 'licenseBackUrl', label: 'Driving License (Back)' },
  { key: 'aadharCardUrl', label: 'Aadhar Card' },
  { key: 'panCardUrl', label: 'PAN Card' }
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

// Admin view of everything captured when a dealer added this driver to their fleet -- full
// profile plus every KYC document (License front/back, Aadhar, PAN) and photo they uploaded.
export default function DriverDetailsModal({ driver, onClose }) {
  if (!driver) return null;

  return (
    <Modal isOpen={Boolean(driver)} onClose={onClose} title={`Driver Details — ${driver.name}`} maxWidth="max-w-3xl">
      <div className="space-y-6">
        {/* Profile */}
        <div>
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <User className="w-3.5 h-3.5 text-amber-400" />
            Profile
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <InfoRow icon={User} label="Full Name" value={driver.name} />
            <InfoRow icon={Phone} label="Mobile" value={driver.mobile} />
            <InfoRow icon={Phone} label="Alternate Mobile" value={driver.alternateMobile} />
            <InfoRow
              icon={Building2}
              label="Assigned Dealer"
              value={driver.dealerId?.companyName || driver.dealerId?.name}
            />
            <InfoRow icon={Truck} label="Vehicle Number" value={driver.vehicleNumber} />
            <InfoRow label="Vehicle Type" value={driver.vehicleType} />
            <InfoRow label="Driving License Number" value={driver.licenseNumber} />
            <InfoRow label="Status" value={driver.status?.replace('_', ' ')} />
            <InfoRow icon={Calendar} label="Added On" value={formatDate(driver.createdAt)} />
            <InfoRow label="Total Deliveries" value={driver.totalDeliveries ?? 0} />
            {driver.notes && <InfoRow label="Notes" value={driver.notes} />}
          </div>
        </div>

        {/* KYC Documents */}
        <div>
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            License & KYC Documents
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DOC_FIELDS.map(({ key, label }) => {
              const url = driver[key];
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
