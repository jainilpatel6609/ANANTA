import React, { useState, useEffect } from 'react';
import { dealerTransportService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  Truck,
  Search,
  Power,
  Edit3,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Save,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DealerTransportRates() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [editingConfig, setEditingConfig] = useState(null);
  const [editRate, setEditRate] = useState('');
  const [saving, setSaving] = useState(false);

  const loadConfigs = async () => {
    try {
      const params = {};
      if (materialFilter) params.material = materialFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await dealerTransportService.getAllConfigs(params);
      setConfigs(res.data?.configs || []);
    } catch (err) {
      toast.error('Failed to load dealer transport rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, [materialFilter, statusFilter]);

  const filteredConfigs = configs.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.dealerId?.name?.toLowerCase().includes(q) ||
      c.dealerId?.companyName?.toLowerCase().includes(q) ||
      c.dealerId?.mobile?.includes(q) ||
      c.locationName?.toLowerCase().includes(q)
    );
  });

  const openEditModal = (config) => {
    setEditingConfig(config);
    setEditRate(String(config.ratePerKm));
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    const rate = Number(editRate);
    if (Number.isNaN(rate) || rate <= 0) {
      toast.error('Rate per KM must be a valid positive number.');
      return;
    }
    setSaving(true);
    try {
      await dealerTransportService.updateConfig(editingConfig._id, { ratePerKm: rate });
      toast.success('Rate updated successfully.');
      setEditingConfig(null);
      loadConfigs();
    } catch (err) {
      toast.error(err.message || 'Failed to update rate');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (config) => {
    try {
      await dealerTransportService.toggleConfig(config._id);
      toast.success(`Configuration is now ${config.isActive ? 'disabled' : 'active'}.`);
      loadConfigs();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  if (loading) return <LoadingSpinner message="Loading dealer transport rates..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white font-display flex items-center gap-2.5">
          <Truck className="w-6 h-6 text-amber-400" />
          Dealer Transport Rates
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Per-KM transport rates each dealer has configured, by Material &amp; Sourcing Location.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search dealer, mobile, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <select
          value={materialFilter}
          onChange={(e) => setMaterialFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
        >
          <option value="">All Materials</option>
          <option value="Sand">🟡 Sand</option>
          <option value="Aggregate">🟤 Aggregate</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Disabled</option>
        </select>
      </div>

      {filteredConfigs.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No transport rates found"
          description="No dealer has configured a matching transport rate yet."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="text-left px-5 py-3.5 font-bold">Dealer</th>
                  <th className="text-left px-5 py-3.5 font-bold">Mobile</th>
                  <th className="text-left px-5 py-3.5 font-bold">Material</th>
                  <th className="text-left px-5 py-3.5 font-bold">Location</th>
                  <th className="text-left px-5 py-3.5 font-bold">Rate / KM</th>
                  <th className="text-left px-5 py-3.5 font-bold">Status</th>
                  <th className="text-left px-5 py-3.5 font-bold">Last Updated</th>
                  <th className="text-right px-5 py-3.5 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredConfigs.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white">{c.dealerId?.companyName || c.dealerId?.name || 'Unknown Dealer'}</div>
                      <div className="text-slate-500 text-[11px]">{c.dealerId?.name}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {c.dealerId?.mobile || '—'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold text-[10px] uppercase">
                        {c.material}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {c.locationName}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-black text-amber-400">{formatINR(c.ratePerKm)}/km</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          c.isActive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {c.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {c.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{formatDate(c.updatedAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(c)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                            c.isActive
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {c.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!editingConfig}
        onClose={() => setEditingConfig(null)}
        title={editingConfig ? `Edit Rate: ${editingConfig.material} → ${editingConfig.locationName}` : ''}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleSaveRate} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Rate per KM (₹)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={editRate}
              onChange={(e) => setEditRate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Rate
          </button>
        </form>
      </Modal>
    </div>
  );
}
