import React, { useState, useEffect } from 'react';
import { vehicleConfigService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatINR } from '../../utils/formatters';
import { Percent, Truck, Save, Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminRate() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({ dumperServiceCharge: 25, tractorServiceCharge: 200 });
  const [form, setForm] = useState({ dumperServiceCharge: '25', tractorServiceCharge: '200' });

  const loadSettings = async () => {
    try {
      const res = await vehicleConfigService.getVehicleSettings();
      const s = res.data?.settings;
      if (s) {
        setSettings(s);
        setForm({
          dumperServiceCharge: String(s.dumperServiceCharge ?? 25),
          tractorServiceCharge: String(s.tractorServiceCharge ?? 200)
        });
      }
    } catch (err) {
      toast.error('Failed to load service charge settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const dumperCharge = Number(form.dumperServiceCharge);
    const tractorCharge = Number(form.tractorServiceCharge);

    if (Number.isNaN(dumperCharge) || dumperCharge < 0) {
      toast.error('Dumper service charge must be a valid non-negative number.');
      return;
    }
    if (Number.isNaN(tractorCharge) || tractorCharge < 0) {
      toast.error('Tractor service charge must be a valid non-negative number.');
      return;
    }

    setSaving(true);
    try {
      const res = await vehicleConfigService.updateSettings({
        dumperServiceCharge: dumperCharge,
        tractorServiceCharge: tractorCharge
      });
      if (res.data?.settings) setSettings(res.data.settings);
      toast.success('Service charges updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save service charges');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading service charge settings..." />;
  }

  return (
    <div className="space-y-8 pb-16 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-display flex items-center gap-2.5">
          <Percent className="w-6 h-6 text-amber-400" />
          Admin Rate
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          A flat platform service charge added on top of every dealer's own rate, shown to the
          customer and included in what's actually charged at checkout.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          Dealers never see or set this charge &mdash; it's added automatically wherever a dealer's
          rate is shown to a customer or billed on an order. Currently live:{' '}
          <strong className="text-white">{formatINR(settings.dumperServiceCharge)}/Ton</strong> for Dumper,{' '}
          <strong className="text-white">{formatINR(settings.tractorServiceCharge)}/Trip</strong> for Tractor.
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4" />
              Dumper Service Charge (₹ / Ton)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.dumperServiceCharge}
                onChange={(e) => setForm({ ...form, dumperServiceCharge: e.target.value })}
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Added to the dealer's computed Rate Per Ton (Distance &times; Dealer Rate/KM).
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4" />
              Tractor Service Charge (₹ / Trip)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.tractorServiceCharge}
                onChange={(e) => setForm({ ...form, tractorServiceCharge: e.target.value })}
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Added to the dealer's own Rate/Tractor, per tractor trip in the order.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Admin Rate
        </button>
      </form>
    </div>
  );
}
