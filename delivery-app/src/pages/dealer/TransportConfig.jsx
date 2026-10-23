import React, { useState, useEffect } from 'react';
import { dealerTransportService, tractorRateService, productService } from '../../services';
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

const TRACTOR_TYPES = ['Single Patiya', 'Double Patiya'];

export default function TransportConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [materialLocations, setMaterialLocations] = useState({ Sand: [], Aggregate: [] });
  const [dumperVariants, setDumperVariants] = useState({ Sand: [], Aggregate: [] });
  const [myConfigs, setMyConfigs] = useState([]);
  const [materialMode, setMaterialMode] = useState('Sand');
  const [rates, setRates] = useState({}); // { 'Sand::Patan::Filter Sand': '25' }
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Tractor rates: per Material + Location/Grain + Patiya type
  const [tractorSandLocations, setTractorSandLocations] = useState([]);
  const [aggregateGrains, setAggregateGrains] = useState([]);
  const [tractorRates, setTractorRates] = useState([]);
  const [tractorRateInputs, setTractorRateInputs] = useState({}); // { 'Sand::Patan::Single Patiya': '2800' }
  const [savingTractorRates, setSavingTractorRates] = useState(false);
  const [deleteTractorRateTarget, setDeleteTractorRateTarget] = useState(null);

  const visibleMaterials = materialMode === 'Both' ? ['Sand', 'Aggregate'] : [materialMode];

  const loadData = async () => {
    try {
      const [locRes, tractorLocRes, cfgRes, tractorRateRes, productsRes, dumperVariantsRes] = await Promise.all([
        dealerTransportService.getMaterialLocations(),
        dealerTransportService.getMaterialLocations({ vehicleType: 'TRACTOR' }),
        dealerTransportService.getMyConfigs(),
        tractorRateService.getRates(),
        productService.getActiveProducts(),
        dealerTransportService.getDumperVariants()
      ]);
      setMaterialLocations(locRes.data?.locations || { Sand: [], Aggregate: [] });
      setTractorSandLocations(tractorLocRes.data?.locations?.Sand || []);
      setDumperVariants(dumperVariantsRes.data?.variants || { Sand: [], Aggregate: [] });

      const configs = cfgRes.data?.configs || [];
      setMyConfigs(configs);

      const initRates = {};
      const mats = new Set();
      configs.forEach((c) => {
        const key = `${c.material}::${c.locationName}::${c.variantName}`;
        initRates[key] = String(c.ratePerKm);
        mats.add(c.material);
      });
      setRates(initRates);
      if (mats.size === 2) setMaterialMode('Both');
      else if (mats.size === 1) setMaterialMode(Array.from(mats)[0]);

      const aggregateProduct = (productsRes.data?.products || []).find((p) => p.category === 'Aggregate');
      setAggregateGrains(
        (aggregateProduct?.tractorAggregateTypes?.length ? aggregateProduct.tractorAggregateTypes : aggregateProduct?.aggregateTypes) || []
      );

      const tRates = tractorRateRes.data?.rates || [];
      setTractorRates(tRates);
      const tInputs = {};
      tRates.forEach((r) => {
        tInputs[`${r.material}::${r.variantName}::${r.tractorType}`] = String(r.ratePerTractor);
      });
      setTractorRateInputs(tInputs);
    } catch (err) {
      toast.error('Failed to load transport configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const setRateValue = (material, location, variantName, value) => {
    const key = `${material}::${location}::${variantName}`;
    setRates((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const configs = [];
    for (const material of visibleMaterials) {
      for (const loc of materialLocations[material] || []) {
        for (const variantName of dumperVariants[material] || []) {
          const key = `${material}::${loc}::${variantName}`;
          const rateStr = rates[key];
          if (!rateStr) continue; // Not every Location x Variant needs a rate -- only filled ones save.

          const rate = Number(rateStr);
          if (Number.isNaN(rate) || rate <= 0) {
            toast.error(`Please enter a valid rate for ${material} → ${loc} → ${variantName}`);
            return;
          }
          configs.push({ material, locationName: loc, variantName, ratePerKm: rate });
        }
      }
    }

    if (configs.length === 0) {
      toast.error('Please set at least one rate.');
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
      toast.success(`${config.material} → ${config.locationName} → ${config.variantName} is now ${config.isActive ? 'disabled' : 'active'}.`);
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

  const setTractorRateValue = (material, variantName, tractorType, value) => {
    const key = `${material}::${variantName}::${tractorType}`;
    setTractorRateInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveTractorRates = async () => {
    const payload = [];
    const rows = [
      ...tractorSandLocations.map((loc) => ({ material: 'Sand', variantName: loc })),
      ...aggregateGrains.map((grain) => ({ material: 'Aggregate', variantName: grain }))
    ];

    for (const row of rows) {
      for (const type of TRACTOR_TYPES) {
        const key = `${row.material}::${row.variantName}::${type}`;
        const rateStr = tractorRateInputs[key];
        if (!rateStr) continue;
        const rate = Number(rateStr);
        if (Number.isNaN(rate) || rate <= 0) {
          toast.error(`Please enter a valid rate for ${row.material} → ${row.variantName} (${type})`);
          return;
        }
        payload.push({ material: row.material, variantName: row.variantName, tractorType: type, ratePerTractor: rate });
      }
    }

    if (payload.length === 0) {
      toast.error('Please enter at least one Tractor rate.');
      return;
    }

    setSavingTractorRates(true);
    try {
      await tractorRateService.bulkSave(payload);
      toast.success('Tractor rates saved successfully!');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to save tractor rates');
    } finally {
      setSavingTractorRates(false);
    }
  };

  const handleToggleTractorRate = async (rate) => {
    try {
      await tractorRateService.toggleRate(rate._id);
      toast.success(`${rate.material} → ${rate.variantName} (${rate.tractorType}) is now ${rate.isActive ? 'disabled' : 'active'}.`);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleDeleteTractorRate = async () => {
    if (!deleteTractorRateTarget) return;
    try {
      await tractorRateService.deleteRate(deleteTractorRateTarget._id);
      toast.success('Tractor rate deleted.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete tractor rate');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your transport configuration..." />;
  }

  const sandConfigs = myConfigs.filter((c) => c.material === 'Sand');
  const aggregateConfigs = myConfigs.filter((c) => c.material === 'Aggregate');
  const sandTractorRates = tractorRates.filter((r) => r.material === 'Sand');
  const aggregateTractorRates = tractorRates.filter((r) => r.material === 'Aggregate');

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex items-center gap-4 shadow-xs relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <Truck className="w-7 h-7 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Transport Configuration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Set your per-KM rate for each material & sourcing location — used for Dumper
            bookings. Tractor bookings use the flat Rate/Tractor you set below instead.
          </p>
        </div>
      </div>

      {/* Existing Rates Summary */}
      {myConfigs.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
          <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span>My Transport Rates</span>
          </h3>

          {sandConfigs.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">🟡 Sand</div>
              {sandConfigs.map((c) => (
                <ConfigRow key={c._id} config={c} onToggle={handleToggle} onDelete={() => setDeleteTarget(c)} />
              ))}
            </div>
          )}

          {aggregateConfigs.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">🟤 Aggregate</div>
              {aggregateConfigs.map((c) => (
                <ConfigRow key={c._id} config={c} onToggle={handleToggle} onDelete={() => setDeleteTarget(c)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Step 1: Material */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
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
                    ? 'border-amber-300 bg-amber-50 text-amber-700 ring-2 ring-amber-500/15'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 & 3: Location + Grain/Spec + Rate per material */}
        {visibleMaterials.map((material) => {
          const locations = materialLocations[material] || [];
          const variants = dumperVariants[material] || [];
          return (
            <div key={material} className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>
                  Step 2 &amp; 3 &mdash; {material} Locations &amp; Rate / KM
                  {material === 'Aggregate' ? ' (per Grain Size)' : ' (per Processing Specification)'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Set a different Rate/KM per {material === 'Aggregate' ? 'grain size' : 'processing specification'} at
                each location if your pricing varies &mdash; leave any box blank to skip it.
              </p>

              {locations.length === 0 ? (
                <div className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  No active {material} sourcing locations are configured by Admin yet.
                </div>
              ) : variants.length === 0 ? (
                <div className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  No active {material === 'Aggregate' ? 'grain sizes' : 'processing specifications'} are configured by
                  Admin yet for Dumper.
                </div>
              ) : (
                <div className="space-y-3">
                  {locations.map((loc) => (
                    <div key={loc} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
                      <div className="text-sm font-bold text-slate-900">{loc}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {variants.map((variantName) => {
                          const key = `${material}::${loc}::${variantName}`;
                          return (
                            <div key={variantName} className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                                {variantName}
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                  <IndianRupee className="w-3.5 h-3.5" />
                                </div>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  placeholder="Rate / KM"
                                  value={rates[key] || ''}
                                  onChange={(e) => setRateValue(material, loc, variantName, e.target.value)}
                                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 min-h-[40px]"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 min-h-[48px] cursor-pointer"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Transport Configuration
        </button>
      </div>

      {/* Tractor Rates: per Material + Location/Grain + Patiya type */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
            <IndianRupee className="w-4 h-4" />
            <span>Tractor Rates</span>
          </h3>
          <p className="text-xs text-slate-500 mt-2">
            Set your own Single Patiya / Double Patiya selling rate for each Sand location or
            Aggregate grain. Customers only see you for a Tractor order once you've set a rate
            for exactly the material they picked.
          </p>
        </div>

        {/* Existing Tractor Rates Summary */}
        {tractorRates.length > 0 && (
          <div className="space-y-4">
            {sandTractorRates.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">🟡 Sand</div>
                {sandTractorRates.map((r) => (
                  <TractorRateRow key={r._id} rate={r} onToggle={handleToggleTractorRate} onDelete={() => setDeleteTractorRateTarget(r)} />
                ))}
              </div>
            )}
            {aggregateTractorRates.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">🟤 Aggregate</div>
                {aggregateTractorRates.map((r) => (
                  <TractorRateRow key={r._id} rate={r} onToggle={handleToggleTractorRate} onDelete={() => setDeleteTractorRateTarget(r)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sand Location Grid */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">🟡 Sand Locations</h4>
          {tractorSandLocations.length === 0 ? (
            <div className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl border border-slate-200">
              No active Sand sourcing locations are enabled for Tractor Dispatch by Admin yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {tractorSandLocations.map((loc) => (
                <TractorRateInputRow
                  key={loc}
                  material="Sand"
                  variantName={loc}
                  inputs={tractorRateInputs}
                  onChange={setTractorRateValue}
                />
              ))}
            </div>
          )}
        </div>

        {/* Aggregate Grain Grid */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">🟤 Aggregate Grains</h4>
          {aggregateGrains.length === 0 ? (
            <div className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl border border-slate-200">
              No active Aggregate grains are configured by Admin yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {aggregateGrains.map((grain) => (
                <TractorRateInputRow
                  key={grain}
                  material="Aggregate"
                  variantName={grain}
                  inputs={tractorRateInputs}
                  onChange={setTractorRateValue}
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={savingTractorRates}
          onClick={handleSaveTractorRates}
          className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 min-h-[48px] cursor-pointer"
        >
          {savingTractorRates ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Tractor Rates
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
            ? `This will permanently remove your rate for ${deleteTarget.material} → ${deleteTarget.locationName} → ${deleteTarget.variantName}. Existing orders keep their own price snapshot. This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        isDestructive
      />

      <ConfirmDialog
        isOpen={!!deleteTractorRateTarget}
        onClose={() => setDeleteTractorRateTarget(null)}
        onConfirm={handleDeleteTractorRate}
        title="Delete Tractor Rate?"
        message={
          deleteTractorRateTarget
            ? `This will permanently remove your ${deleteTractorRateTarget.tractorType} rate for ${deleteTractorRateTarget.material} → ${deleteTractorRateTarget.variantName}. Existing orders keep their own price snapshot. This cannot be undone.`
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
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
      <div className="min-w-0 flex items-center gap-2.5">
        {config.isActive ? (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate">
            {config.locationName} <span className="text-slate-400 font-normal">&middot; {config.variantName}</span>
          </div>
          <div className={`text-[11px] font-mono ${config.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
            {config.isActive ? 'Active' : 'Disabled'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-black text-amber-600 font-mono">{formatINR(config.ratePerKm)}/km</span>
        <button
          type="button"
          onClick={() => onToggle(config)}
          title={config.isActive ? 'Disable' : 'Enable'}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-300 transition-all active:scale-90"
        >
          <Power className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-500 hover:border-rose-300 transition-all active:scale-90"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function TractorRateRow({ rate, onToggle, onDelete }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
      <div className="min-w-0 flex items-center gap-2.5">
        {rate.isActive ? (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate">
            {rate.variantName} <span className="text-slate-400 font-normal">&middot; {rate.tractorType}</span>
          </div>
          <div className={`text-[11px] font-mono ${rate.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
            {rate.isActive ? 'Active' : 'Disabled'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-black text-amber-600 font-mono">{formatINR(rate.ratePerTractor)}</span>
        <button
          type="button"
          onClick={() => onToggle(rate)}
          title={rate.isActive ? 'Disable' : 'Enable'}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-300 transition-all active:scale-90"
        >
          <Power className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-500 hover:border-rose-300 transition-all active:scale-90"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function TractorRateInputRow({ material, variantName, inputs, onChange }) {
  return (
    <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
      <div className="text-sm font-bold text-slate-900">{variantName}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {TRACTOR_TYPES.map((type) => {
          const key = `${material}::${variantName}::${type}`;
          return (
            <div key={type} className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{type}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <IndianRupee className="w-3.5 h-3.5" />
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Rate / Tractor"
                  value={inputs[key] || ''}
                  onChange={(e) => onChange(material, variantName, type, e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 min-h-[40px]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
