import React, { useState, useEffect } from 'react';
import { dealerService } from '../services';
import Modal from './Modal';
import { formatDate } from '../utils/formatters';
import { Truck, Package, Route as RouteIcon, User, Loader2, History } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORY_META = {
  DRIVER: { icon: Truck, label: 'Driver Fleet', className: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  DUMPER: { icon: Package, label: 'My Dumpers', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  TRANSPORT_RATE: {
    icon: RouteIcon,
    label: 'Transport Rates',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  },
  PROFILE: { icon: User, label: 'Depot Profile', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
};

// Admin view of a single dealer's activity log -- every change they've made
// to Driver Fleet, My Dumpers, Transport Rates and Depot Profile.
export default function DealerActivityLogModal({ dealer, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealer) return;
    setLoading(true);
    dealerService
      .getActivityLogs(dealer._id)
      .then((res) => setLogs(res.data?.logs || []))
      .catch((err) => toast.error(err.message || 'Failed to load activity log.'))
      .finally(() => setLoading(false));
  }, [dealer?._id]);

  return (
    <Modal
      isOpen={Boolean(dealer)}
      onClose={onClose}
      title={`Activity Log — ${dealer?.companyName || dealer?.name || ''}`}
      maxWidth="max-w-2xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading activity log...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <History className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-300">No activity recorded yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Changes this dealer makes to their Driver Fleet, Dumpers, Transport Rates, or Profile will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const meta = CATEGORY_META[log.category] || CATEGORY_META.PROFILE;
            const Icon = meta.icon;
            return (
              <div
                key={log._id}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-3"
              >
                <div className={`p-2 rounded-xl border shrink-0 ${meta.className}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.className}`}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{formatDate(log.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-200 font-semibold mt-1.5">{log.action}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{log.description}</p>
                  {log.actorRole === 'ADMIN' && (
                    <p className="text-[10px] text-amber-500 mt-1 font-medium">Made by Admin ({log.actorName})</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
