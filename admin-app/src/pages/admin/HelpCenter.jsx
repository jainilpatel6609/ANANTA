import React, { useState, useEffect } from 'react';
import { helpService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatDate } from '../../utils/formatters';
import { LifeBuoy, Phone, MapPin, MessageSquare, CheckCircle2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HelpCenter() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadRequests = async () => {
    try {
      const res = await helpService.getAll();
      if (res.data?.helpRequests) {
        setRequests(res.data.helpRequests);
      }
    } catch (err) {
      toast.error('Failed to load help requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleToggleResolve = async (id) => {
    setUpdatingId(id);
    try {
      const res = await helpService.toggleResolve(id);
      if (res.data?.helpRequest) {
        setRequests((prev) => prev.map((r) => (r._id === id ? res.data.helpRequest : r)));
        toast.success(`Marked ${res.data.helpRequest.status.toLowerCase()}.`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading help requests..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-display">Help Center</h1>
        <p className="text-xs text-slate-400">
          Support requests submitted by customers from their portal, with their account details.
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="No help requests yet"
          description="Customer support requests submitted from the app will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {requests.map((r) => (
            <div
              key={r._id}
              className={`bg-slate-900 border rounded-3xl p-5 space-y-3.5 shadow-xl ${
                r.status === 'RESOLVED' ? 'border-emerald-900/50' : 'border-amber-900/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-white font-display">{r.name}</h3>
                  <p className="text-[11px] text-slate-500">
                    Customer: <span className="text-slate-300 font-semibold">{r.userId?.name || 'N/A'}</span>
                    {r.userId?.companyName ? ` • ${r.userId.companyName}` : ''}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                    r.status === 'RESOLVED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {r.status}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="font-mono">{r.mobile}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span>{r.address}</span>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-slate-800/80">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span className="text-slate-200">{r.message}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500">{formatDate(r.createdAt)}</span>
                <button
                  type="button"
                  disabled={updatingId === r._id}
                  onClick={() => handleToggleResolve(r._id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50 ${
                    r.status === 'RESOLVED'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {r.status === 'RESOLVED' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reopen</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
