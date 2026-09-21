import React, { useState, useEffect } from 'react';
import { locationService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { PlusCircle, Edit3, ShieldCheck, CheckCircle2, XCircle, Power, MapPin, Search, Filter, Navigation, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LocationManagement() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    vehicleType: 'DUMPER',
    category: 'Sand',
    state: 'Gujarat',
    description: '',
    displayOrder: 0,
    latitude: '',
    longitude: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadLocations = async () => {
    try {
      const params = { search };
      if (vehicleFilter) params.vehicleType = vehicleFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await locationService.getAdminLocations(params);
      if (res.data?.locations) {
        setLocations(res.data.locations);
      }
    } catch (err) {
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, [search, vehicleFilter, categoryFilter]);

  const openCreateModal = () => {
    setEditingLocation(null);
    setLocationForm({
      name: '',
      vehicleType: vehicleFilter || 'DUMPER',
      category: categoryFilter || 'Sand',
      state: 'Gujarat',
      description: '',
      displayOrder: locations.length + 1,
      latitude: '',
      longitude: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (loc) => {
    setEditingLocation(loc);
    setLocationForm({
      name: loc.name,
      vehicleType: loc.vehicleType || 'DUMPER',
      category: loc.category || 'ALL',
      state: loc.state || 'Gujarat',
      description: loc.description || '',
      displayOrder: loc.displayOrder || 0,
      latitude: loc.latitude !== null && loc.latitude !== undefined ? String(loc.latitude) : '',
      longitude: loc.longitude !== null && loc.longitude !== undefined ? String(loc.longitude) : ''
    });
    setIsModalOpen(true);
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!locationForm.name || !locationForm.name.trim()) {
      toast.error('Location name is required.');
      return;
    }

    const latProvided = locationForm.latitude !== '' && locationForm.latitude !== null && locationForm.latitude !== undefined;
    const lngProvided = locationForm.longitude !== '' && locationForm.longitude !== null && locationForm.longitude !== undefined;
    if (latProvided !== lngProvided) {
      toast.error('Both Latitude and Longitude are required together.');
      return;
    }
    if (latProvided) {
      const lat = Number(locationForm.latitude);
      const lng = Number(locationForm.longitude);
      if (Number.isNaN(lat) || lat < -90 || lat > 90) {
        toast.error('Latitude must be a valid number between -90 and 90.');
        return;
      }
      if (Number.isNaN(lng) || lng < -180 || lng > 180) {
        toast.error('Longitude must be a valid number between -180 and 180.');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingLocation) {
        await locationService.updateLocation(editingLocation._id, locationForm);
        toast.success(`Updated location "${locationForm.name}" for ${locationForm.vehicleType}.`);
      } else {
        await locationService.createLocation(locationForm);
        toast.success(`Added new sourcing location "${locationForm.name}" for ${locationForm.vehicleType}.`);
      }
      setIsModalOpen(false);
      loadLocations();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (loc) => {
    try {
      const res = await locationService.toggleLocation(loc._id, loc.vehicleType);
      toast.success(res.data?.message || `Status updated for ${loc.name}`);
      loadLocations();
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading location management..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">Location Management</h1>
          <p className="text-xs text-slate-400">
            Manage certified regional sand riverbeds and quarry aggregate origins in Gujarat.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 self-start"
        >
          <PlusCircle className="w-4 h-4" />
          Add Sourcing Location
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block">Dynamic Customer Catalog:</span>
          <span>
            Locations are strictly separated by Vehicle (Dumper vs Tractor) and Material Category (Sand vs Aggregate like Vadagam & Sayala).
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
        >
          <option value="">All Vehicle Types</option>
          <option value="DUMPER">🚛 Dumper Trucks</option>
          <option value="TRACTOR">🚜 Tractor Dispatch</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
        >
          <option value="">All Material Categories</option>
          <option value="Sand">Sand Riverbeds</option>
          <option value="Aggregate">Aggregate Quarries</option>
          <option value="Grit">Grit Origins</option>
        </select>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {locations.map((loc) => {
          const active = loc.isActive !== false;
          return (
            <div
              key={loc._id}
              className={`bg-slate-900 border rounded-3xl p-5 flex flex-col justify-between transition-all shadow-xl space-y-4 ${
                active ? 'border-slate-800 hover:border-slate-700' : 'border-red-900/40 opacity-70 bg-slate-950/80'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-black text-[10px] uppercase tracking-wider">
                      {loc.vehicleType}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-bold text-[10px]">
                      {loc.category || 'ALL'}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold flex items-center gap-1 ${
                      active ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white font-display">{loc.name}</h3>
                  <span className="text-xs text-slate-400 block">{loc.state || 'Gujarat'}</span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {loc.description || 'Verified quarry & river source'}
                </p>

                {loc.latitude !== null && loc.latitude !== undefined && loc.longitude !== null && loc.longitude !== undefined ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400/90">
                    <Navigation className="w-3 h-3" />
                    {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400/90">
                    <AlertTriangle className="w-3 h-3" />
                    Coordinates not set
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
                <button
                  onClick={() => openEditModal(loc)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(loc)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    active
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {active ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLocation ? `Edit Location: ${editingLocation.name}` : 'Add New Sourcing Location'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveLocation} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Vehicle Type *
              </label>
              <select
                value={locationForm.vehicleType}
                onChange={(e) => setLocationForm({ ...locationForm, vehicleType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="DUMPER">🚛 Dumper Truck</option>
                <option value="TRACTOR">🚜 Tractor Dispatch</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Material Category *
              </label>
              <select
                value={locationForm.category}
                onChange={(e) => setLocationForm({ ...locationForm, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Sand">Sand Riverbed</option>
                <option value="Aggregate">Aggregate Quarry</option>
                <option value="Grit">Grit Origin</option>
                <option value="ALL">All Categories</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Location Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Vadagam, Sayala, Patan, Sabarmati"
              value={locationForm.name}
              onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              State
            </label>
            <input
              type="text"
              value={locationForm.state}
              onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Display Order
            </label>
            <input
              type="number"
              value={locationForm.displayOrder}
              onChange={(e) => setLocationForm({ ...locationForm, displayOrder: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              Source Coordinates (for road-distance pricing)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  placeholder="e.g. 23.850000"
                  value={locationForm.latitude}
                  onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  placeholder="e.g. 72.110000"
                  value={locationForm.longitude}
                  onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              This is the actual quarry/riverbed point used as the origin for road-distance transport pricing to the customer's shipping address. Leave blank to keep pricing on the legacy dealer-distance fallback for this location.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Source Description
            </label>
            <textarea
              rows="3"
              placeholder="Riverbed purity, sand grade specifications, road connectivity, crushing plant details..."
              value={locationForm.description}
              onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20"
            >
              {saving ? 'Saving...' : 'Save Location'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
