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

  const openAddModal = () => {
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

  const openEditModal = (driver) => {
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

    if (!formData.name.trim()) {
      toast.error('Driver name is required.');
      return;
    }

    const cleanMobile = formData.mobile.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      toast.error('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!formData.vehicleNumber.trim()) {
      toast.error('Vehicle plate number is required (e.g. GJ-02-AB-1234).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        mobile: cleanMobile,
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase()
      };

      if (editingDriver) {
        await driverService.updateDriver(editingDriver._id, payload);
        toast.success(`Driver ${formData.name} updated successfully.`);
      } else {
        await driverService.createDriver(payload);
        toast.success(`Driver ${formData.name} added to your fleet!`);
      }

      setModalOpen(false);
      loadDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save driver.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (driver) => {
    try {
      const res = await driverService.toggleStatus(driver._id);
      toast.success(res.data?.message || 'Driver status updated.');
      loadDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  const handleDelete = async (driver) => {
    if (!window.confirm(`Are you sure you want to remove driver ${driver.name} from your fleet?`)) {
      return;
    }

    try {
      await driverService.deleteDriver(driver._id);
      toast.success(`Driver ${driver.name} removed.`);
      loadDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete driver.');
    }
  };

  // Filter drivers
  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.mobile.includes(searchQuery) ||
      d.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'ALL' ? true : d.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const availableCount = drivers.filter((d) => d.status === 'AVAILABLE').length;
  const onDeliveryCount = drivers.filter((d) => d.status === 'ON_DELIVERY').length;
  const totalDeliveriesCount = drivers.reduce((acc, d) => acc + (d.totalDeliveries || 0), 0);

  if (loading) {
    return <LoadingSpinner message="Loading your driver fleet..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Add Driver Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <Truck className="w-4 h-4" />
            <span>Fleet & Logistics</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display mt-1">
            Driver Management
          </h1>
          <p className="text-xs text-slate-400">
            Manage your drivers, vehicle assignments, and dispatch notifications with live Google Maps links.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Driver</span>
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Fleet</span>
          <div className="text-2xl font-black text-white font-display">{drivers.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Available</span>
          <div className="text-2xl font-black text-emerald-400 font-display">{availableCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">On Delivery</span>
          <div className="text-2xl font-black text-amber-400 font-display">{onDeliveryCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trips Completed</span>
          <div className="text-2xl font-black text-white font-display">{totalDeliveriesCount}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search driver by name, phone, or vehicle plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'AVAILABLE', 'ON_DELIVERY', 'INACTIVE'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterStatus === st
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All Drivers' : st === 'AVAILABLE' ? 'Available' : st === 'ON_DELIVERY' ? 'On Delivery' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* Drivers List / Cards */}
      {filteredDrivers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Drivers Found"
          description={
            searchQuery
              ? 'No drivers match your search query.'
              : "You haven't added any drivers yet. Add your drivers to assign orders directly with 1-click!"
          }
          actionLabel={!searchQuery ? 'Add First Driver' : undefined}
          onAction={!searchQuery ? openAddModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => {
            const isAvailable = driver.status === 'AVAILABLE';
            const isOnDelivery = driver.status === 'ON_DELIVERY';

            return (
              <div
                key={driver._id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-lg space-y-4 relative group overflow-hidden"
              >
                {/* Status Glow Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isAvailable ? 'bg-emerald-500' : isOnDelivery ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                />

                {/* Driver Header */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-amber-400 border border-slate-700 font-bold text-base">
                      {driver.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{driver.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isAvailable
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isOnDelivery
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? 'bg-emerald-400 animate-pulse' : isOnDelivery ? 'bg-amber-400' : 'bg-slate-500'
                            }`}
                          />
                          {driver.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(driver)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit Driver"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(driver)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Driver"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details Pill Grid */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-500" />
                      <span>Vehicle:</span>
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {driver.vehicleNumber} ({driver.vehicleType})
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Mobile:</span>
                    </span>
                    <span className="font-mono text-slate-200">+91 {driver.mobile}</span>
                  </div>

                  {driver.licenseNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                        <span>License:</span>
                      </span>
                      <span className="font-mono text-slate-300">{driver.licenseNumber}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Deliveries Completed:</span>
                    <span className="font-bold text-white">{driver.totalDeliveries || 0} Trips</span>
                  </div>
                </div>

                {/* Quick Action Buttons: Call & WhatsApp */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`tel:+91${driver.mobile}`}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Call Driver</span>
                  </a>

                  <a
                    href={`https://wa.me/91${driver.mobile}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Driver Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDriver ? `Edit Driver: ${editingDriver.name}` : 'Add New Driver to Fleet'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Driver Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Bhai Patel"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                10-Digit Mobile Number *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">+91</span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9825012345"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                  className="w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Alternate Mobile (Optional)
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="Optional second number"
                value={formData.alternateMobile}
                onChange={(e) => setFormData({ ...formData, alternateMobile: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Vehicle Plate Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. GJ-02-AB-1234"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Vehicle Type
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Tractor">Tractor (Single / Double Patiya)</option>
                <option value="Dumper">Dumper (10 / 12 / 16 Wheel)</option>
                <option value="Truck">Truck</option>
                <option value="Other">Other Heavy Commercial Vehicle</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Driving License Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. GJ02 20180001234"
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-amber-500 uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Internal Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Expert driver for Vadagam & Sayala routes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{editingDriver ? 'Save Changes' : 'Add Driver to Fleet'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

