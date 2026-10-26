import React, { useState, useEffect } from 'react';
import { dumperService, tractorService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { Truck, Plus, Pencil, Trash2, Power, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const WHEEL_TYPES = [10, 12, 14, 16, 18];
const TRACTOR_TYPES = ['Single Patiya', 'Double Patiya'];

const STATUS_STYLES = {
  AVAILABLE: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  IN_ORDER: 'bg-amber-50 text-amber-700 border-amber-200',
  DISABLED: 'bg-slate-100 text-slate-500 border-slate-200'
};

const STATUS_LABELS = { AVAILABLE: 'Available', IN_ORDER: 'In Order', DISABLED: 'Disabled' };

const emptyDumperForm = { wheelType: 10, numberPlate: '', capacity: '', emptyWeight: '' };
const emptyTractorForm = { tractorType: 'Single Patiya', numberPlate: '' };

export default function VehicleManagement() {
  const [tab, setTab] = useState('DUMPER');

  // Dumpers
  const [dumpers, setDumpers] = useState([]);
  const [loadingDumpers, setLoadingDumpers] = useState(true);
  const [dumperModalOpen, setDumperModalOpen] = useState(false);
  const [editingDumper, setEditingDumper] = useState(null);
  const [dumperForm, setDumperForm] = useState(emptyDumperForm);
  const [savingDumper, setSavingDumper] = useState(false);

  // Tractors
  const [tractors, setTractors] = useState([]);
  const [loadingTractors, setLoadingTractors] = useState(true);
  const [tractorModalOpen, setTractorModalOpen] = useState(false);
  const [editingTractor, setEditingTractor] = useState(null);
  const [tractorForm, setTractorForm] = useState(emptyTractorForm);
  const [savingTractor, setSavingTractor] = useState(false);

  const loadDumpers = async () => {
    try {
      const res = await dumperService.getDumpers();
      setDumpers(res.data?.dumpers || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dumpers.');
    } finally {
      setLoadingDumpers(false);
    }
  };

  const loadTractors = async () => {
    try {
      const res = await tractorService.getTractors();
      setTractors(res.data?.tractors || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load tractors.');
    } finally {
      setLoadingTractors(false);
    }
  };

  useEffect(() => {
    loadDumpers();
    loadTractors();
  }, []);

  // ---------- Dumper handlers ----------
  const openAddDumper = () => {
    setEditingDumper(null);
    setDumperForm(emptyDumperForm);
    setDumperModalOpen(true);
  };

  const openEditDumper = (d) => {
    setEditingDumper(d);
    setDumperForm({ wheelType: d.wheelType, numberPlate: d.numberPlate, capacity: d.capacity, emptyWeight: d.emptyWeight || '' });
    setDumperModalOpen(true);
  };

  const handleSaveDumper = async (e) => {
    e.preventDefault();
    if (!dumperForm.numberPlate.trim() || !(Number(dumperForm.capacity) > 0)) {
      toast.error('Number plate and a capacity greater than 0 Ton are required.');
      return;
    }
    if (!(Number(dumperForm.emptyWeight) > 0)) {
      toast.error('Empty (tare) weight greater than 0 Ton is required before this dumper can be registered.');
      return;
    }
    setSavingDumper(true);
    try {
      const payload = {
        wheelType: Number(dumperForm.wheelType),
        numberPlate: dumperForm.numberPlate,
        capacity: Number(dumperForm.capacity),
        emptyWeight: Number(dumperForm.emptyWeight)
      };
      if (editingDumper) {
        await dumperService.updateDumper(editingDumper._id, payload);
        toast.success('Dumper updated.');
      } else {
        await dumperService.createDumper(payload);
        toast.success('Dumper registered.');
      }
      setDumperModalOpen(false);
      loadDumpers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save dumper.');
    } finally {
      setSavingDumper(false);
    }
  };

  const handleToggleDumper = async (d) => {
    try {
      const res = await dumperService.toggleDumper(d._id);
      toast.success(res.message || 'Dumper updated.');
      loadDumpers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update dumper.');
    }
  };

  const handleDeleteDumper = async (d) => {
    if (!window.confirm(`Delete dumper ${d.numberPlate}?`)) return;
    try {
      await dumperService.deleteDumper(d._id);
      toast.success('Dumper deleted.');
      loadDumpers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete dumper.');
    }
  };

  // ---------- Tractor handlers ----------
  const openAddTractor = () => {
    setEditingTractor(null);
    setTractorForm(emptyTractorForm);
    setTractorModalOpen(true);
  };

  const openEditTractor = (t) => {
    setEditingTractor(t);
    setTractorForm({ tractorType: t.tractorType, numberPlate: t.numberPlate });
    setTractorModalOpen(true);
  };

  const handleSaveTractor = async (e) => {
    e.preventDefault();
    if (!tractorForm.numberPlate.trim()) {
      toast.error('Number plate is required.');
      return;
    }
    setSavingTractor(true);
    try {
      const payload = {
        tractorType: tractorForm.tractorType,
        numberPlate: tractorForm.numberPlate
      };
      if (editingTractor) {
        await tractorService.updateTractor(editingTractor._id, payload);
        toast.success('Tractor updated.');
      } else {
        await tractorService.createTractor(payload);
        toast.success('Tractor registered.');
      }
      setTractorModalOpen(false);
      loadTractors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save tractor.');
    } finally {
      setSavingTractor(false);
    }
  };

  const handleToggleTractor = async (t) => {
    try {
      const res = await tractorService.toggleTractor(t._id);
      toast.success(res.message || 'Tractor updated.');
      loadTractors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update tractor.');
    }
  };

  const handleDeleteTractor = async (t) => {
    if (!window.confirm(`Delete tractor ${t.numberPlate}?`)) return;
    try {
      await tractorService.deleteTractor(t._id);
      toast.success('Tractor deleted.');
      loadTractors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete tractor.');
    }
  };

  if (loadingDumpers || loadingTractors) return <LoadingSpinner message="Loading your vehicle fleet..." />;

  const dumperCounts = {
    total: dumpers.length,
    available: dumpers.filter((d) => d.status === 'AVAILABLE').length,
    inOrder: dumpers.filter((d) => d.status === 'IN_ORDER').length,
    disabled: dumpers.filter((d) => d.status === 'DISABLED').length
  };

  const tractorCounts = {
    total: tractors.length,
    available: tractors.filter((t) => t.status === 'AVAILABLE').length,
    inOrder: tractors.filter((t) => t.status === 'IN_ORDER').length,
    disabled: tractors.filter((t) => t.status === 'DISABLED').length
  };

  const counts = tab === 'DUMPER' ? dumperCounts : tractorCounts;

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-3xl font-extrabold text-slate-900 font-display">My Vehicle</h1>
          <p className="text-[11px] sm:text-xs text-slate-500">
            {tab === 'DUMPER'
              ? 'Register your dumpers. Customers only see you for a wheel type when you have an available dumper of it.'
              : 'Register your tractors with their number plate and Patiya type.'}
          </p>
        </div>
        <button
          type="button"
          onClick={tab === 'DUMPER' ? openAddDumper : openAddTractor}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 min-h-[44px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{tab === 'DUMPER' ? 'Add Dumper' : 'Add Tractor'}</span>
        </button>
      </div>

      {/* Vehicle Type Tabs */}
      <div className="inline-flex items-center gap-1.5 p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        {[
          { id: 'DUMPER', label: `Dumpers (${dumpers.length})` },
          { id: 'TRACTOR', label: `Tractors (${tractors.length})` }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
              tab === t.id ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          ['Total', counts.total, 'text-slate-900'],
          ['Available', counts.available, 'text-emerald-600'],
          ['In Order', counts.inOrder, 'text-amber-600'],
          ['Disabled', counts.disabled, 'text-slate-500']
        ].map(([label, value, color]) => (
          <div key={label} className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
            <div className={`text-xl font-black font-mono ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {tab === 'DUMPER' ? (
        dumpers.length === 0 ? (
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
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                  <span>{wheel} Wheel</span>
                  <span className="text-slate-400 font-mono">
                    {group.filter((d) => d.status === 'AVAILABLE').length} available / {group.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {group.map((d) => (
                    <div key={d._id} className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-slate-900 text-sm">{d.numberPlate}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[d.status]}`}>
                          {STATUS_LABELS[d.status]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {d.wheelType} Wheel • <span className="text-slate-700 font-mono">{d.capacity} Ton</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Empty Weight:{' '}
                        {d.emptyWeight ? (
                          <span className="text-slate-700 font-mono">{d.emptyWeight} Ton</span>
                        ) : (
                          <span className="text-rose-600 font-bold">Not set — hidden from customers</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openEditDumper(d)}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold min-h-[36px] cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleDumper(d)}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold min-h-[36px] cursor-pointer"
                        >
                          <Power className="w-3.5 h-3.5" /> {d.status === 'DISABLED' ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDumper(d)}
                          className="inline-flex items-center justify-center px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-red-500 min-h-[36px] cursor-pointer"
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
        )
      ) : tractors.length === 0 ? (
        <EmptyState
          title="No tractors registered"
          description="Add your first tractor to start receiving Tractor orders."
          icon={Truck}
        />
      ) : (
        TRACTOR_TYPES.filter((type) => tractors.some((t) => t.tractorType === type)).map((type) => {
          const group = tractors.filter((t) => t.tractorType === type);
          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                <span>{type}</span>
                <span className="text-slate-400 font-mono">
                  {group.filter((t) => t.status === 'AVAILABLE').length} available / {group.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {group.map((t) => (
                  <div key={t._id} className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-slate-900 text-sm">{t.numberPlate}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[t.status]}`}>
                        {STATUS_LABELS[t.status]}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{t.tractorType}</div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openEditTractor(t)}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold min-h-[36px] cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleTractor(t)}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold min-h-[36px] cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" /> {t.status === 'DISABLED' ? 'Enable' : 'Disable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTractor(t)}
                        className="inline-flex items-center justify-center px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-red-500 min-h-[36px] cursor-pointer"
                        aria-label="Delete tractor"
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

      <Modal isOpen={dumperModalOpen} onClose={() => setDumperModalOpen(false)} title={editingDumper ? 'Edit Dumper' : 'Add Dumper'}>
        <form onSubmit={handleSaveDumper} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Wheel Type *</label>
            <select
              value={dumperForm.wheelType}
              onChange={(e) => setDumperForm({ ...dumperForm, wheelType: e.target.value })}
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
              value={dumperForm.numberPlate}
              onChange={(e) => setDumperForm({ ...dumperForm, numberPlate: e.target.value.toUpperCase() })}
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
              value={dumperForm.capacity}
              onChange={(e) => setDumperForm({ ...dumperForm, capacity: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Empty / Tare Weight (Ton) *</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              placeholder="e.g. 9.5"
              value={dumperForm.emptyWeight}
              onChange={(e) => setDumperForm({ ...dumperForm, emptyWeight: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              The dumper's own weight when empty -- mandatory before customers can select this vehicle.
            </p>
          </div>
          <button
            type="submit"
            disabled={savingDumper}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs min-h-[44px] disabled:opacity-50 cursor-pointer"
          >
            {savingDumper && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{editingDumper ? 'Save Changes' : 'Register Dumper'}</span>
          </button>
        </form>
      </Modal>

      <Modal isOpen={tractorModalOpen} onClose={() => setTractorModalOpen(false)} title={editingTractor ? 'Edit Tractor' : 'Add Tractor'}>
        <form onSubmit={handleSaveTractor} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Patiya Type *</label>
            <select
              value={tractorForm.tractorType}
              onChange={(e) => setTractorForm({ ...tractorForm, tractorType: e.target.value })}
              className="app-select w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              {TRACTOR_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Number Plate *</label>
            <input
              type="text"
              placeholder="GJ01AB1234"
              value={tractorForm.numberPlate}
              onChange={(e) => setTractorForm({ ...tractorForm, numberPlate: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 uppercase font-mono font-bold"
            />
          </div>
          <button
            type="submit"
            disabled={savingTractor}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs min-h-[44px] disabled:opacity-50 cursor-pointer"
          >
            {savingTractor && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{editingTractor ? 'Save Changes' : 'Register Tractor'}</span>
          </button>
        </form>
      </Modal>
    </div>
  );
}
