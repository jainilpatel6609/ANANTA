import React, { useState, useEffect } from 'react';
import { dealerTransportService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatINR } from '../../utils/formatters';
import {
  Truck,
  Layers,
  MapPin,
  IndianRupee,
  Save,
  Loader2,
  Power,
  Trash2,
  Package
} from 'lucide-react';
import toast from 'react-hot-toast';

const MATERIAL_MODES = [
  { value: 'Sand', label: 'Sand', icon: '🟡' },
  { value: 'Aggregate', label: 'Aggregate', icon: '🟤' },
  { value: 'Both', label: 'Both Sand & Aggregate', icon: '🔵' }
];

export default function TransportConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [materialLocations, setMaterialLocations] = useState({ Sand: [], Aggregate: [] });
  const [myConfigs, setMyConfigs] = useState([]);
  const [materialMode, setMaterialMode] = useState('Sand');
  const [selectedLocations, setSelectedLocations] = useState({}); // { 'Sand::Patan': true }
  const [rates, setRates] = useState({}); // { 'Sand::Patan': '25' }
  const [deleteTarget, setDeleteTarget] = useState(null);

  const visibleMaterials = materialMode === 'Both' ? ['Sand', 'Aggregate'] : [materialMode];

  const loadData = async () => {
    try {
      const [locRes, cfgRes] = await Promise.all([
        dealerTransportService.getMaterialLocations(),
        dealerTransportService.getMyConfigs()
      ]);
      setMaterialLocations(locRes.data?.locations || { Sand: [], Aggregate: [] });

      const configs = cfgRes.data?.configs || [];
      setMyConfigs(configs);

      const sel = {};
      const initRates = {};
      const mats = new Set();
      configs.forEach((c) => {
        const key = `${c.material}::${c.locationName}`;
        sel[key] = true;
        initRates[key] = String(c.ratePerKm);
        mats.add(c.material);
      });
      setSelectedLocations(sel);
      setRates(initRates);
      if (mats.size === 2) setMaterialMode('Both');
      else if (mats.size === 1) setMaterialMode(Array.from(mats)[0]);
    } catch (err) {
      toast.error('Failed to load transport configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleLocationCheckbox = (material, location) => {
    const key = `${material}::${location}`;
    setSelectedLocations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setRateValue = (material, location, value) => {
    const key = `${material}::${location}`;
    setRates((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const configs = [];
    for (const material of visibleMaterials) {
      for (const loc of materialLocations[material] || []) {
        const key = `${material}::${loc}`;
        if (!selectedLocations[key]) continue;

        const rateStr = rates[key];
        const rate = Number(rateStr);
        if (!rateStr || Number.isNaN(rate) || rate <= 0) {
          toast.error(`Please enter a valid rate for ${material} → ${loc}`);
          return;
        }
        configs.push({ material, locationName: loc, ratePerKm: rate });
      }
    }

    if (configs.length === 0) {
      toast.error('Please select at least one location and set its rate.');
      return;
    }

    setSaving(true);
    try {
      await dealerTransportService.bulkSave(configs);
      toast.success('Transport configuration saved successfully!');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to save transport configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (config) => {
    try {
      await dealerTransportService.toggleConfig(config._id);
      toast.success(`${config.material} → ${config.locationName} is now ${config.isActive ? 'disabled' : 'active'}.`);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dealerTransportService.deleteConfig(deleteTarget._id);
      toast.success('Transport rate deleted.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete configuration');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your transport configuration..." />;
  }

  const sandConfigs = myConfigs.filter((c) => c.material === 'Sand');
  const aggregateConfigs = myConfigs.filter((c) => c.material === 'Aggregate');

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 flex items-center gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white flex items-center justify-center shadow-lg shadow-slate-900/20 shrink-0">
          <Truck className="w-7 h-7 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-display">Transport Configuration</h1>
          <p className="text-xs text-slate-400 mt-0.5">Set your per-KM rate for each material & sourcing location</p>
        </div>
      </div>

      {/* Existing Rates Summary */}
      {myConfigs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span>My Transport Rates</span>
          </h3>

          {sandConfigs.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">🟡 Sand</div>
              {sandConfigs.map((c) => (
                <ConfigRow key={c._id} config={c} onToggle={handleToggle} onDelete={() => setDeleteTarget(c)} />
              ))}
            </div>
          )}

          {aggregateConfigs.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">🟤 Aggregate</div>
              {aggregateConfigs.map((c) => (
                <ConfigRow key={c._id} config={c} onToggle={handleToggle} onDelete={() => setDeleteTarget(c)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Step 1: Material */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-2">
            <Layers className="w-4 h-4" />
            <span>Step 1 &mdash; Which Material Do You Transport?</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MATERIAL_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMaterialMode(m.value)}
                className={`p-4 rounded-2xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  materialMode === m.value
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 ring-2 ring-amber-500/20'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 & 3: Location + Rate per material */}
        {visibleMaterials.map((material) => {
          const locations = materialLocations[material] || [];
          return (
            <div key={material} className="space-y-3 pt-2 border-t border-slate-800/80">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Step 2 &amp; 3 &mdash; {material} Locations &amp; Rate / KM</span>
              </h3>

              {locations.length === 0 ? (
                <div className="text-xs text-slate-500 p-4 bg-slate-950 rounded-xl border border-slate-800">
                  No active {material} sourcing locations are configured by Admin yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {locations.map((loc) => {
                    const key = `${material}::${loc}`;
                    const checked = !!selectedLocations[key];
                    return (
                      <div
                        key={loc}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center gap-3 ${
                          checked ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800 bg-slate-950'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLocationCheckbox(material, loc)}
                            className="w-4 h-4 rounded accent-amber-500 shrink-0"
                          />
                          <span className="text-sm font-bold text-white truncate">{loc}</span>
                        </label>

                        {checked && (
                          <div className="relative w-full sm:w-40 shrink-0">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                              <IndianRupee className="w-3.5 h-3.5" />
                            </div>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="Rate / KM"
                              value={rates[key] || ''}
                              onChange={(e) => setRateValue(material, loc, e.target.value)}
                              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-brand-500 min-h-[40px]"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-black text-sm transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 min-h-[48px] cursor-pointer"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Transport Configuration
        </button>
      </div>

      {myConfigs.length === 0 && (
        <EmptyState
          icon={Package}
          title="No transport rates configured yet"
          description="Select a material, choose your sourcing locations, and set your per-KM rate above so customers can see and choose you at checkout."
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Transport Rate?"
        message={
          deleteTarget
            ? `This will permanently remove your rate for ${deleteTarget.material} → ${deleteTarget.locationName}. Existing orders keep their own price snapshot. This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        isDestructive
      />
    </div>
  );
}

function ConfigRow({ config, onToggle, onDelete }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
      <div className="min-w-0 flex items-center gap-2.5">
        {config.isActive ? (
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">{config.locationName}</div>
          <div className={`text-[11px] font-mono ${config.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
            {config.isActive ? 'Active' : 'Disabled'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-black text-amber-400 font-mono">{formatINR(config.ratePerKm)}/km</span>
        <button
          type="button"
          onClick={() => onToggle(config)}
          title={config.isActive ? 'Disable' : 'Enable'}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition-all active:scale-90"
        >
          <Power className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-500/40 transition-all active:scale-90"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
