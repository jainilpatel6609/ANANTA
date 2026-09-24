import React, { useState, useEffect } from 'react';
import { dumperService } from '../services';
import Modal from './Modal';
import { Plus, Pencil, Trash2, Power, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const WHEEL_TYPES = [10, 12, 14, 16, 18];

const STATUS_STYLES = {
  AVAILABLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  IN_ORDER: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  DISABLED: 'bg-slate-700/40 text-slate-400 border-slate-600/50'
};
const STATUS_LABELS = { AVAILABLE: 'Available', IN_ORDER: 'In Order', DISABLED: 'Disabled' };

const emptyForm = { wheelType: 10, numberPlate: '', capacity: '' };

const countBy = (list, status) => list.filter((d) => d.status === status).length;

// Admin view/management of ONE dealer's dumpers: wheel-wise counts + individual dumper details,
// with add / edit / delete / enable-disable. Counts are derived from the live dumper records.
export default function DealerDumpersModal({ dealer, onClose, onChanged }) {
  const [dumpers, setDumpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await dumperService.getDumpers({ dealerId: dealer._id });
      setDumpers(res.data?.dumpers || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dumpers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dealer) {
      setLoading(true);
      setFormOpen(false);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealer?._id]);

  const refresh = () => {
    load();
    if (onChanged) onChanged();
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({ wheelType: d.wheelType, numberPlate: d.numberPlate, capacity: d.capacity });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.numberPlate.trim() || !(Number(form.capacity) > 0)) {
      toast.error('Number plate and a capacity greater than 0 Ton are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        wheelType: Number(form.wheelType),
        numberPlate: form.numberPlate,
        capacity: Number(form.capacity)
      };
      if (editing) {
        await dumperService.updateDumper(editing._id, payload);
        toast.success('Dumper updated.');
      } else {
        await dumperService.createDumper({ ...payload, dealerId: dealer._id });
        toast.success('Dumper added.');
      }
      setFormOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save dumper.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (d) => {
    try {
      await dumperService.toggleDumper(d._id);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update dumper.');
    }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Delete dumper ${d.numberPlate}?`)) return;
    try {
      await dumperService.deleteDumper(d._id);
      toast.success('Dumper deleted.');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete dumper.');
    }
  };

  if (!dealer) return null;

  return (
    <Modal
      isOpen={Boolean(dealer)}
      onClose={onClose}
      title={`Dumpers: ${dealer.companyName || dealer.name}`}
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <div className="py-10 flex justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              <strong className="text-white font-mono">Total Dumpers: {dumpers.length}</strong>
              {' • '}
              <span className="text-emerald-400">Available {countBy(dumpers, 'AVAILABLE')}</span>
              {' • '}
              <span className="text-amber-400">In Order {countBy(dumpers, 'IN_ORDER')}</span>
              {' • '}
              <span className="text-slate-400">Disabled {countBy(dumpers, 'DISABLED')}</span>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Dumper
            </button>
          </div>

          {formOpen && (
            <form onSubmit={handleSave} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Wheel Type</label>
                <select
                  value={form.wheelType}
                  onChange={(e) => setForm({ ...form, wheelType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                >
                  {WHEEL_TYPES.map((w) => (
                    <option key={w} value={w}>{w} Wheel</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Number Plate</label>
                <input
                  type="text"
                  placeholder="GJ01AB1234"
                  value={form.numberPlate}
                  onChange={(e) => setForm({ ...form, numberPlate: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white uppercase font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Capacity (Ton)</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="25"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editing ? 'Save' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {WHEEL_TYPES.map((wheel) => {
            const group = dumpers.filter((d) => d.wheelType === wheel);
            return (
              <div key={wheel} className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/80 border-b border-slate-800">
                  <span className="text-xs font-black text-white uppercase tracking-wider">{wheel} Wheel</span>
                  <span className="text-[11px] font-mono text-slate-300">
                    Total: {group.length} • Available: {countBy(group, 'AVAILABLE')} • In Order:{' '}
                    {countBy(group, 'IN_ORDER')} • Disabled: {countBy(group, 'DISABLED')}
                  </span>
                </div>
                {group.length > 0 && (
                  <div className="divide-y divide-slate-800/70">
                    {group.map((d) => (
                      <div key={d._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-white text-sm">{d.numberPlate}</span>
                          <span className="text-xs text-slate-400 font-mono">{d.capacity} Ton</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[d.status]}`}>
                            {STATUS_LABELS[d.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(d)}
                            title="Edit"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggle(d)}
                            title={d.status === 'DISABLED' ? 'Enable' : 'Disable'}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(d)}
                            title="Delete"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
