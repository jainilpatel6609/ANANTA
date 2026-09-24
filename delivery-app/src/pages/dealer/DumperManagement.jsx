import React, { useState, useEffect } from 'react';
import { dumperService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { Truck, Plus, Pencil, Trash2, Power, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const WHEEL_TYPES = [10, 12, 14, 16, 18];

const STATUS_STYLES = {
  AVAILABLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  IN_ORDER: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  DISABLED: 'bg-slate-700/40 text-slate-400 border-slate-600/50'
};

const STATUS_LABELS = { AVAILABLE: 'Available', IN_ORDER: 'In Order', DISABLED: 'Disabled' };

const emptyForm = { wheelType: 10, numberPlate: '', capacity: '' };

export default function DumperManagement() {
  const [dumpers, setDumpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadDumpers = async () => {
    try {
      const res = await dumperService.getDumpers();
      setDumpers(res.data?.dumpers || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dumpers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDumpers();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({ wheelType: d.wheelType, numberPlate: d.numberPlate, capacity: d.capacity });
    setModalOpen(true);
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
        await dumperService.createDumper(payload);
        toast.success('Dumper registered.');
      }
      setModalOpen(false);
      loadDumpers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save dumper.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (d) => {
    try {
      const res = await dumperService.toggleDumper(d._id);
      toast.success(res.message || 'Dumper updated.');
      loadDumpers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update dumper.');
    }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Delete dumper ${d.numberPlate}?`)) return;
    try {
      await dumperService.deleteDumper(d._id);
      toast.success('Dumper deleted.');
      loadDumpers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete dumper.');
    }
  };

  if (loading) return <LoadingSpinner message="Loading your dumpers..." />;

  const counts = {
    total: dumpers.length,
    available: dumpers.filter((d) => d.status === 'AVAILABLE').length,
    inOrder: dumpers.filter((d) => d.status === 'IN_ORDER').length,
    disabled: dumpers.filter((d) => d.status === 'DISABLED').length
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-3xl font-extrabold text-white font-display">My Dumpers</h1>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Register your dumpers. Customers only see you for a wheel type when you have an available dumper of it.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 min-h-[44px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Dumper</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          ['Total', counts.total, 'text-white'],
          ['Available', counts.available, 'text-emerald-400'],
          ['In Order', counts.inOrder, 'text-amber-400'],
          ['Disabled', counts.disabled, 'text-slate-400']
        ].map(([label, value, color]) => (
          <div key={label} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            <div className={`text-xl font-black font-mono ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {dumpers.length === 0 ? (
        <EmptyState
          title="No dumpers registered"
          description="Add your first dumper to start receiving Dumper orders."
          icon={Truck}
        />
      ) : (
        WHEEL_TYPES.filter((w) => dumpers.some((d) => d.wheelType === w)).map((wheel) => {
          const group = dumpers.filter((d) => d.wheelType === wheel);
          return (
            <div key={wheel} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
                <span>{wheel} Wheel</span>
                <span className="text-slate-500 font-mono">
                  {group.filter((d) => d.status === 'AVAILABLE').length} available / {group.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {group.map((d) => (
                  <div key={d._id} className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-white text-sm">{d.numberPlate}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[d.status]}`}>
                        {STATUS_LABELS[d.status]}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {d.wheelType} Wheel • <span className="text-slate-200 font-mono">{d.capacity} Ton</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openEdit(d)}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-bold min-h-[36px] cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(d)}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-bold min-h-[36px] cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" /> {d.status === 'DISABLED' ? 'Enable' : 'Disable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d)}
                        className="inline-flex items-center justify-center px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-red-400 min-h-[36px] cursor-pointer"
                        aria-label="Delete dumper"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Dumper' : 'Add Dumper'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Wheel Type *</label>
            <select
              value={form.wheelType}
              onChange={(e) => setForm({ ...form, wheelType: e.target.value })}
              className="app-select w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              {WHEEL_TYPES.map((w) => (
                <option key={w} value={w}>{w} Wheel</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Number Plate *</label>
            <input
              type="text"
              placeholder="GJ01AB1234"
              value={form.numberPlate}
              onChange={(e) => setForm({ ...form, numberPlate: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 uppercase font-mono font-bold"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Weight / Capacity (Ton) *</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              placeholder="25"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs min-h-[44px] disabled:opacity-50 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{editing ? 'Save Changes' : 'Register Dumper'}</span>
          </button>
        </form>
      </Modal>
    </div>
  );
}
