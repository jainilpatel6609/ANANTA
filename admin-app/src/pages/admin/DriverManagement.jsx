import React, { useState, useEffect } from 'react';
import { driverService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import {
  Users,
  UserPlus,
  Truck,
  Phone,
  MessageSquare,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  Shield,
  FileText,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    alternateMobile: '',
    vehicleNumber: '',
    vehicleType: 'Tractor',
    licenseNumber: '',
    notes: ''
  });

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const res = await driverService.getDrivers();
      if (res.data?.drivers) {
        setDrivers(res.data.drivers);
      }
    } catch (err) {
      toast.error('Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      mobile: '',
      alternateMobile: '',
      vehicleNumber: '',
      vehicleType: 'Tractor',
      licenseNumber: '',
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name || '',
      mobile: driver.mobile || '',
      alternateMobile: driver.alternateMobile || '',
      vehicleNumber: driver.vehicleNumber || '',
      vehicleType: driver.vehicleType || 'Tractor',
      licenseNumber: driver.licenseNumber || '',
      notes: driver.notes || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim() || !formData.vehicleNumber.trim()) {
      toast.error('Driver name, mobile number, and vehicle number are required.');
      return;
    }

    try {
      setSaving(true);
      if (editingDriver) {
        await driverService.updateDriver(editingDriver._id, formData);
        toast.success('Driver updated successfully!');
      } else {
        await driverService.createDriver(formData);
        toast.success('Driver added to fleet successfully!');
      }
      setModalOpen(false);
      loadDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save driver details.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (driver) => {
    try {
      await driverService.toggleDriverStatus(driver._id);
      toast.success(`Driver status updated.`);
      loadDrivers();
    } catch (err) {
      toast.error('Failed to update driver status.');
    }
  };

  const handleDelete = async (driver) => {
    if (!window.confirm(`Are you sure you want to remove ${driver.name} from the fleet?`)) return;
    try {
      await driverService.deleteDriver(driver._id);
      toast.success('Driver removed.');
      loadDrivers();
    } catch (err) {
      toast.error('Failed to delete driver.');
    }
  };

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.mobile.includes(searchQuery) ||
      d.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || d.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display">Driver & Fleet Management</h1>
              <p className="text-sm text-slate-400">Manage all registered delivery drivers and fleet vehicles</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Driver</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver by name, phone, or vehicle number..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {['ALL', 'AVAILABLE', 'ON_DELIVERY', 'INACTIVE'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === st
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'All Fleet' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Driver List */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredDrivers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No Drivers Found"
          description={searchQuery ? 'No drivers matched your search.' : 'You have not added any drivers to your fleet yet.'}
          actionLabel="Add First Driver"
          onAction={handleOpenAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDrivers.map((driver) => (
            <div
              key={driver._id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 font-bold border border-slate-700">
                      {driver.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{driver.name}</h3>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          driver.status === 'AVAILABLE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : driver.status === 'ON_DELIVERY'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {driver.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(driver)}
                      className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(driver)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mt-4 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-500" /> Vehicle
                    </span>
                    <span className="font-mono font-bold text-white">
                      {driver.vehicleNumber} ({driver.vehicleType})
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" /> Mobile
                    </span>
                    <a href={`tel:+91${driver.mobile}`} className="font-mono font-semibold text-emerald-400 hover:underline">
                      +91 {driver.mobile}
                    </a>
                  </div>

                  {driver.dealerId && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <span className="text-slate-400">Assigned Dealer</span>
                      <span className="font-medium text-slate-300">
                        {driver.dealerId.companyName || driver.dealerId.name}
                      </span>
                    </div>
                  )}

                  {driver.licenseNumber && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <span className="text-slate-400">Driving License</span>
                      <span className="font-mono text-slate-300">{driver.licenseNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                <button
                  onClick={() => handleToggleStatus(driver)}
                  className="text-slate-400 hover:text-white font-medium flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Toggle Status
                </button>
                <a
                  href={`https://wa.me/91${driver.mobile}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Driver Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDriver ? 'Edit Fleet Driver' : 'Register New Fleet Driver'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Driver Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ramesh Patel"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Primary Mobile *
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="9876543210"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Alternate Mobile
              </label>
              <input
                type="tel"
                maxLength={10}
                value={formData.alternateMobile}
                onChange={(e) => setFormData({ ...formData, alternateMobile: e.target.value })}
                placeholder="Optional"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Vehicle Plate Number *
              </label>
              <input
                type="text"
                required
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                placeholder="GJ-02-AB-1234"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Vehicle Type
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="Tractor">Tractor</option>
                <option value="Dumper">Dumper</option>
                <option value="Truck">Truck</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Driving License Number
            </label>
            <input
              type="text"
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
              placeholder="e.g. GJ02 20180012345"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Driver Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Driver notes, depot location, or operational remarks..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{editingDriver ? 'Save Changes' : 'Add to Fleet'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

