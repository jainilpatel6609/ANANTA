import React, { useState, useEffect } from 'react';
import { vehicleConfigService, locationService, productService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { formatINR } from '../../utils/formatters';
import {
  PlusCircle,
  Edit3,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Truck,
  ArrowLeft,
  ArrowRight,
  Settings,
  MapPin,
  Layers,
  Tag,
  Plus,
  Trash2,
  Coins
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehicleManagement() {
  const [selectedVehicle, setSelectedVehicle] = useState(null); // null | 'DUMPER' | 'TRACTOR'
  const [activeTab, setActiveTab] = useState('locations'); // 'locations' | 'capacities' | 'materials'
  const [loading, setLoading] = useState(true);

  // Global Settings
  const [settings, setSettings] = useState({ dumperEnabled: true, tractorEnabled: true });

  // Vehicle-specific Isolated State
  const [dumperLocations, setDumperLocations] = useState([]);
  const [tractorLocations, setTractorLocations] = useState([]);
  const [dumperConfigs, setDumperConfigs] = useState([]);
  const [tractorConfigs, setTractorConfigs] = useState([]);
  const [aggregateProduct, setAggregateProduct] = useState(null);

  // Grain Pricing State (Completely Isolated per vehicle)
  const [tractorGrainPricing, setTractorGrainPricing] = useState([]);
  const [dumperGrainPricing, setDumperGrainPricing] = useState([]);

  // Modals & Forms
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    category: 'Sand',
    state: 'Gujarat',
    description: '',
    displayOrder: 0,
    singlePatiyaPrice: '2350',
    doublePatiyaPrice: '4500'
  });

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [configForm, setConfigForm] = useState({
    optionName: '',
    wheelCount: '',
    approximateTon: '',
    basePricePerTon: '',
    flatPrice: '',
    displayOrder: 0
  });

  // Grain Size Modal & Form
  const [isGrainModalOpen, setIsGrainModalOpen] = useState(false);
  const [editingGrainItem, setEditingGrainItem] = useState(null); // null when adding
  const [grainForm, setGrainForm] = useState({
    name: '',
    priceSinglePatiya: '2800',
    priceDoublePatiya: '5400',
    pricePerTon: '800'
  });

  const [saving, setSaving] = useState(false);
  const [savingGrain, setSavingGrain] = useState(false);

  const loadAllData = async () => {
    try {
      const [setRes, dumperLocRes, tractorLocRes, dumperCfgRes, tractorCfgRes, prodRes] = await Promise.all([
        vehicleConfigService.getVehicleSettings().catch(() => ({ data: { settings: { dumperEnabled: true, tractorEnabled: true } } })),
        locationService.getAdminLocations({ vehicleType: 'DUMPER' }).catch(() => ({ data: { locations: [] } })),
        locationService.getAdminLocations({ vehicleType: 'TRACTOR' }).catch(() => ({ data: { locations: [] } })),
        vehicleConfigService.getAdminConfigs({ vehicleType: 'DUMPER' }).catch(() => ({ data: { configs: [] } })),
        vehicleConfigService.getAdminConfigs({ vehicleType: 'TRACTOR' }).catch(() => ({ data: { configs: [] } })),
        productService.getAllAdmin().catch(() => ({ data: { products: [] } }))
      ]);

      if (setRes.data?.settings) setSettings(setRes.data.settings);
      if (dumperLocRes.data?.locations) setDumperLocations(dumperLocRes.data.locations);
      if (tractorLocRes.data?.locations) setTractorLocations(tractorLocRes.data.locations);
      if (dumperCfgRes.data?.configs) setDumperConfigs(dumperCfgRes.data.configs);
      if (tractorCfgRes.data?.configs) setTractorConfigs(tractorCfgRes.data.configs);

      if (prodRes.data?.products) {
        const agg = prodRes.data.products.find((p) => p.category === 'Aggregate');
        if (agg) {
          setAggregateProduct(agg);

          // Populate Tractor Grain Pricing
          if (agg.tractorGrainPricing && agg.tractorGrainPricing.length > 0) {
            setTractorGrainPricing(agg.tractorGrainPricing);
          } else {
            const types = agg.tractorAggregateTypes || agg.aggregateTypes || ['20mm', '10mm', '6mm', 'Refo Dust', 'Metal 40×63', 'Rubble'];
            setTractorGrainPricing(
              types.map((t) => ({
                name: t,
                priceSinglePatiya: agg.priceSinglePatiya || 2800,
                priceDoublePatiya: agg.priceDoublePatiya || 5400
              }))
            );
          }

          // Populate Dumper Grain Pricing
          if (agg.dumperGrainPricing && agg.dumperGrainPricing.length > 0) {
            setDumperGrainPricing(agg.dumperGrainPricing);
          } else {
            const types = agg.dumperAggregateTypes || agg.aggregateTypes || ['20mm', '10mm', '6mm', 'Refo Dust', 'Metal 40×63', 'Rubble'];
            setDumperGrainPricing(
              types.map((t) => ({
                name: t,
                pricePerTon: agg.pricePerTon || 800
              }))
            );
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load vehicle management configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // 1-Click Visibility Toggle
  const handleToggleVisibility = async (vehicleType) => {
    try {
      const isDumper = vehicleType === 'DUMPER';
      const key = isDumper ? 'dumperEnabled' : 'tractorEnabled';
      const nextVal = !settings[key];
      const payload = { ...settings, [key]: nextVal };

      const res = await vehicleConfigService.updateSettings(payload);
      if (res.data?.settings) {
        setSettings(res.data.settings);
      }
      toast.success(`${isDumper ? 'Dumper Truck' : 'Tractor Dispatch'} is now ${nextVal ? 'ENABLED' : 'DISABLED'} for customers.`);
    } catch (err) {
      toast.error('Failed to update visibility');
    }
  };

  // Location Handlers (Strictly Scoped by selectedVehicle)
  const openAddLocationModal = () => {
    setEditingLocation(null);
    const count = selectedVehicle === 'DUMPER' ? dumperLocations.length : tractorLocations.length;
    setLocationForm({
      name: '',
      category: selectedVehicle === 'DUMPER' ? 'Aggregate' : 'Sand',
      state: 'Gujarat',
      description: '',
      displayOrder: count + 1,
      singlePatiyaPrice: '2350',
      doublePatiyaPrice: '4500'
    });
    setIsLocationModalOpen(true);
  };

  const openEditLocationModal = (loc) => {
    setEditingLocation(loc);
    setLocationForm({
      name: loc.name,
      category: loc.category || 'Sand',
      state: loc.state || 'Gujarat',
      description: loc.description || '',
      displayOrder: loc.displayOrder || 0,
      singlePatiyaPrice: loc.singlePatiyaPrice !== undefined ? String(loc.singlePatiyaPrice) : '2350',
      doublePatiyaPrice: loc.doublePatiyaPrice !== undefined ? String(loc.doublePatiyaPrice) : '4500'
    });
    setIsLocationModalOpen(true);
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!locationForm.name || !locationForm.name.trim()) {
      toast.error('Location name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...locationForm,
        vehicleType: selectedVehicle,
        singlePatiyaPrice: Number(locationForm.singlePatiyaPrice) || 2350,
        doublePatiyaPrice: Number(locationForm.doublePatiyaPrice) || 4500,
        displayOrder: Number(locationForm.displayOrder) || 0
      };
      if (editingLocation) {
        await locationService.updateLocation(editingLocation._id, payload);
        toast.success(`Updated ${selectedVehicle} location "${locationForm.name}".`);
      } else {
        await locationService.createLocation(payload);
        toast.success(`Added location "${locationForm.name}" strictly for ${selectedVehicle}.`);
      }
      setIsLocationModalOpen(false);
      loadAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLocation = async (loc) => {
    try {
      const res = await locationService.toggleLocation(loc._id, selectedVehicle);
      toast.success(res.data?.message || 'Location status updated');
      loadAllData();
    } catch (err) {
      toast.error('Failed to toggle location status');
    }
  };

  const handleDeleteLocation = async (loc) => {
    try {
      await locationService.deleteLocation(loc._id, selectedVehicle);
      toast.success(`Disabled ${selectedVehicle} location "${loc.name}".`);
      loadAllData();
    } catch (err) {
      toast.error('Failed to disable location');
    }
  };

  // Capacity / Type Handlers (Strictly Scoped by selectedVehicle)
  const openAddConfigModal = () => {
    setEditingConfig(null);
    const count = selectedVehicle === 'DUMPER' ? dumperConfigs.length : tractorConfigs.length;
    if (selectedVehicle === 'DUMPER') {
      setConfigForm({
        optionName: '',
        wheelCount: '12',
        approximateTon: '35',
        basePricePerTon: '800',
        flatPrice: '',
        displayOrder: count + 1
      });
    } else {
      setConfigForm({
        optionName: '',
        wheelCount: '',
        approximateTon: '3.5',
        basePricePerTon: '',
        flatPrice: '2350',
        displayOrder: count + 1
      });
    }
    setIsConfigModalOpen(true);
  };

  const openEditConfigModal = (cfg) => {
    setEditingConfig(cfg);
    setConfigForm({
      optionName: cfg.optionName,
      wheelCount: cfg.wheelCount || '',
      approximateTon: cfg.approximateTon || '',
      basePricePerTon: cfg.basePricePerTon || '',
      flatPrice: cfg.flatPrice || '',
      displayOrder: cfg.displayOrder || 0
    });
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!configForm.optionName || !configForm.approximateTon) {
      toast.error('Option name and approximate tonnage are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...configForm,
        vehicleType: selectedVehicle,
        wheelCount: configForm.wheelCount ? Number(configForm.wheelCount) : null,
        approximateTon: Number(configForm.approximateTon),
        basePricePerTon: Number(configForm.basePricePerTon) || 0,
        flatPrice: configForm.flatPrice ? Number(configForm.flatPrice) : null,
        displayOrder: Number(configForm.displayOrder) || 0
      };

      if (editingConfig) {
        await vehicleConfigService.updateConfig(editingConfig._id, payload);
        toast.success(`Updated ${selectedVehicle} specification "${configForm.optionName}".`);
      } else {
        await vehicleConfigService.createConfig(payload);
        toast.success(`Created ${selectedVehicle} specification "${configForm.optionName}".`);
      }
      setIsConfigModalOpen(false);
      loadAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save specification');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleConfig = async (cfg) => {
    try {
      const res = await vehicleConfigService.toggleConfig(cfg._id, selectedVehicle);
      toast.success(res.data?.message || 'Status updated');
      loadAllData();
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  const handleDeleteConfig = async (cfg) => {
    try {
      await vehicleConfigService.deleteConfig(cfg._id, selectedVehicle);
      toast.success(`Disabled ${selectedVehicle} specification "${cfg.optionName}".`);
      loadAllData();
    } catch (err) {
      toast.error('Failed to disable specification');
    }
  };

  // Grain Pricing Handlers (Completely Isolated per vehicle)
  const openAddGrainModal = () => {
    setEditingGrainItem(null);
    setGrainForm({
      name: '',
      priceSinglePatiya: '2800',
      priceDoublePatiya: '5400',
      pricePerTon: '800'
    });
    setIsGrainModalOpen(true);
  };

  const openEditGrainModal = (item) => {
    setEditingGrainItem(item);
    setGrainForm({
      name: item.name,
      priceSinglePatiya: item.priceSinglePatiya !== undefined ? String(item.priceSinglePatiya) : '2800',
      priceDoublePatiya: item.priceDoublePatiya !== undefined ? String(item.priceDoublePatiya) : '5400',
      pricePerTon: item.pricePerTon !== undefined ? String(item.pricePerTon) : '800'
    });
    setIsGrainModalOpen(true);
  };

  const handleSaveGrainForm = async (e) => {
    e.preventDefault();
    if (!grainForm.name || !grainForm.name.trim()) {
      toast.error('Grain size name is required.');
      return;
    }
    const name = grainForm.name.trim();

    if (selectedVehicle === 'TRACTOR') {
      const singlePrice = Number(grainForm.priceSinglePatiya) || 0;
      const doublePrice = Number(grainForm.priceDoublePatiya) || 0;

      let updatedList;
      if (editingGrainItem) {
        updatedList = tractorGrainPricing.map((item) =>
          item.name.toLowerCase() === editingGrainItem.name.toLowerCase()
            ? { name, priceSinglePatiya: singlePrice, priceDoublePatiya: doublePrice }
            : item
        );
      } else {
        if (tractorGrainPricing.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
          toast.error(`"${name}" already exists in Tractor list.`);
          return;
        }
        updatedList = [...tractorGrainPricing, { name, priceSinglePatiya: singlePrice, priceDoublePatiya: doublePrice }];
      }

      setSavingGrain(true);
      try {
        if (aggregateProduct) {
          await productService.updateProduct(aggregateProduct._id, {
            tractorGrainPricing: updatedList,
            tractorAggregateTypes: updatedList.map((g) => g.name),
            aggregateTypes: updatedList.map((g) => g.name)
          });
        }
        setTractorGrainPricing(updatedList);
        setIsGrainModalOpen(false);
        toast.success(`Saved Tractor grain pricing for "${name}".`);
      } catch (err) {
        toast.error('Failed to save grain pricing');
      } finally {
        setSavingGrain(false);
      }
    } else {
      // DUMPER
      const perTon = Number(grainForm.pricePerTon) || 0;
      let updatedList;
      if (editingGrainItem) {
        updatedList = dumperGrainPricing.map((item) =>
          item.name.toLowerCase() === editingGrainItem.name.toLowerCase()
            ? { name, pricePerTon: perTon }
            : item
        );
      } else {
        if (dumperGrainPricing.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
          toast.error(`"${name}" already exists in Dumper list.`);
          return;
        }
        updatedList = [...dumperGrainPricing, { name, pricePerTon: perTon }];
      }

      setSavingGrain(true);
      try {
        if (aggregateProduct) {
          await productService.updateProduct(aggregateProduct._id, {
            dumperGrainPricing: updatedList,
            dumperAggregateTypes: updatedList.map((g) => g.name)
          });
        }
        setDumperGrainPricing(updatedList);
        setIsGrainModalOpen(false);
        toast.success(`Saved Dumper grain pricing for "${name}".`);
      } catch (err) {
        toast.error('Failed to save grain pricing');
      } finally {
        setSavingGrain(false);
      }
    }
  };

  const handleDeleteGrain = async (grainName) => {
    if (selectedVehicle === 'TRACTOR') {
      const updatedList = tractorGrainPricing.filter((g) => g.name !== grainName);
      setSavingGrain(true);
      try {
        if (aggregateProduct) {
          await productService.updateProduct(aggregateProduct._id, {
            tractorGrainPricing: updatedList,
            tractorAggregateTypes: updatedList.map((g) => g.name),
            aggregateTypes: updatedList.map((g) => g.name)
          });
        }
        setTractorGrainPricing(updatedList);
        toast.success(`Removed Tractor grain "${grainName}".`);
      } catch (err) {
        toast.error('Failed to delete grain size');
      } finally {
        setSavingGrain(false);
      }
    } else {
      const updatedList = dumperGrainPricing.filter((g) => g.name !== grainName);
      setSavingGrain(true);
      try {
        if (aggregateProduct) {
          await productService.updateProduct(aggregateProduct._id, {
            dumperGrainPricing: updatedList,
            dumperAggregateTypes: updatedList.map((g) => g.name)
          });
        }
        setDumperGrainPricing(updatedList);
        toast.success(`Removed Dumper grain "${grainName}".`);
      } catch (err) {
        toast.error('Failed to delete grain size');
      } finally {
        setSavingGrain(false);
      }
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading independent fleet modules..." />;
  }

  // Active dataset depending on view
  const currentLocations = selectedVehicle === 'DUMPER' ? dumperLocations : tractorLocations;
  const currentConfigs = selectedVehicle === 'DUMPER' ? dumperConfigs : tractorConfigs;
  const currentGrainList = selectedVehicle === 'DUMPER' ? dumperGrainPricing : tractorGrainPricing;
  const isVehicleEnabled = selectedVehicle === 'DUMPER' ? settings.dumperEnabled : settings.tractorEnabled;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {selectedVehicle && (
              <button
                type="button"
                onClick={() => setSelectedVehicle(null)}
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors mr-1"
                title="Back to Vehicle Management Hub"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
              {selectedVehicle === 'DUMPER'
                ? '🚛 Dumper Fleet Management'
                : selectedVehicle === 'TRACTOR'
                ? '🚜 Tractor Dispatch Management'
                : 'Vehicle & Fleet Management'}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {selectedVehicle
              ? `Completely isolated configuration for ${selectedVehicle}. Changes made here will never affect the other vehicle category.`
              : 'Independent modules for heavy multi-wheel Dumper trucks and Tractor trolley dispatch.'}
          </p>
        </div>

        {selectedVehicle && (
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                isVehicleEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}
            >
              {isVehicleEnabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {isVehicleEnabled ? `${selectedVehicle} Active` : `${selectedVehicle} Disabled`}
            </span>

            <button
              type="button"
              onClick={() => handleToggleVisibility(selectedVehicle)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                isVehicleEnabled
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
              }`}
            >
              {isVehicleEnabled ? `Disable ${selectedVehicle} Delivery` : `Enable ${selectedVehicle} Delivery`}
            </button>
          </div>
        )}
      </div>

      {/* Global Isolation Info Alert */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block">Strict Database Isolation:</span>
          <span>
            Dumper Truck settings (locations like Vadagam & Sayala, 10W-18W capacities, price/ton, grain pricing) and Tractor Dispatch settings (Sand depots, Single/Double Patiya grain pricing) operate completely independently.
          </span>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: OVERVIEW CARDS (SELECT DUMPER OR TRACTOR)
          ========================================================================= */}
      {!selectedVehicle && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DUMPER CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl hover:border-amber-500/40 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-3xl">
                      🚛
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white font-display">HEAVY DUMPER FLEET</h3>
                      <span className="text-xs text-slate-400">10, 12, 16, 18 Multi-wheel trucks</span>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      settings.dumperEnabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}
                  >
                    {settings.dumperEnabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Configure Dumper-specific Aggregate quarries (Vadagam, Sayala) and Sand riverbeds (Patan, Siddhpur), multi-wheel capacities (10W-18W), grain sizes & pricing per ton.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-lg font-black text-amber-400 font-mono block">{dumperLocations.length}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Locations</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-lg font-black text-amber-400 font-mono block">{dumperConfigs.length}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Capacities</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-lg font-black text-amber-400 font-mono block">{dumperGrainPricing.length}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Grain Sizes</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVehicle('DUMPER');
                    setActiveTab('locations');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  <span>Open Dumper Settings</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TRACTOR CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl hover:border-amber-500/40 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-3xl">
                      🚜
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white font-display">TRACTOR DISPATCH</h3>
                      <span className="text-xs text-slate-400">Local trolley site transport</span>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      settings.tractorEnabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}
                  >
                    {settings.tractorEnabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Configure Tractor-specific drop-off regions, trailer options (Single Patiya, Double Patiya), grain size pricing (Single/Double Patiya rates), and flat trip rates.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-lg font-black text-amber-400 font-mono block">{tractorLocations.length}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Locations</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-lg font-black text-amber-400 font-mono block">{tractorConfigs.length}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Capacities</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-lg font-black text-amber-400 font-mono block">{tractorGrainPricing.length}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Grain Sizes</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVehicle('TRACTOR');
                    setActiveTab('materials');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  <span>Open Tractor Settings</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: DEDICATED INDEPENDENT VEHICLE MANAGEMENT (DUMPER OR TRACTOR)
          ========================================================================= */}
      {selectedVehicle && (
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('locations')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'locations'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>{selectedVehicle} Locations ({currentLocations.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('capacities')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'capacities'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>{selectedVehicle} Types & Capacities ({currentConfigs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('materials')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'materials'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span>Grain Sizes & Pricing ({currentGrainList.length})</span>
              </button>
            </div>

            {activeTab === 'locations' ? (
              <button
                type="button"
                onClick={openAddLocationModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                Add {selectedVehicle} Location
              </button>
            ) : activeTab === 'capacities' ? (
              <button
                type="button"
                onClick={openAddConfigModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                Add {selectedVehicle} Capacity
              </button>
            ) : activeTab === 'materials' ? (
              <button
                type="button"
                onClick={openAddGrainModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                Add {selectedVehicle} Grain Size & Pricing
              </button>
            ) : null}
          </div>

          {/* TAB 1: LOCATIONS */}
          {activeTab === 'locations' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentLocations.map((loc) => {
                  const active = loc.isActive !== false;
                  return (
                    <div
                      key={loc._id}
                      className={`bg-slate-900 border rounded-3xl p-5 flex flex-col justify-between transition-all shadow-xl space-y-4 ${
                        active ? 'border-slate-800 hover:border-slate-700' : 'border-red-900/40 opacity-70 bg-slate-950/80'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold text-[10px] uppercase">
                              {selectedVehicle}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-bold text-[10px]">
                              {loc.category || 'Sand'}
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
                          <h4 className="text-base font-black text-white font-display">{loc.name}</h4>
                          <span className="text-xs text-slate-400 block">{loc.state || 'Gujarat'}</span>
                        </div>

                        {selectedVehicle === 'TRACTOR' && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Single Patiya</span>
                              <span className="text-xs font-mono font-bold text-amber-400">₹{loc.singlePatiyaPrice || 2350}</span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Double Patiya</span>
                              <span className="text-xs font-mono font-bold text-emerald-400">₹{loc.doublePatiyaPrice || 4500}</span>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {loc.description || `Verified ${selectedVehicle} quarry/depot point`}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-1.5 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => openEditLocationModal(loc)}
                          className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLocation(loc)}
                          className={`px-2 py-1.5 rounded-lg ${
                            active ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc)}
                          className="px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {currentLocations.length === 0 && (
                <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <MapPin className="w-8 h-8 text-slate-500 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No locations configured for {selectedVehicle}</h4>
                  <p className="text-xs text-slate-400">Click "Add {selectedVehicle} Location" to add your first sourcing point.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TYPES & CAPACITIES */}
          {activeTab === 'capacities' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentConfigs.map((cfg) => {
                  const active = cfg.isActive !== false;
                  return (
                    <div
                      key={cfg._id}
                      className={`bg-slate-900 border rounded-3xl p-5 flex flex-col justify-between transition-all shadow-xl space-y-4 ${
                        active ? 'border-slate-800 hover:border-slate-700' : 'border-red-900/40 opacity-70 bg-slate-950/80'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold text-[10px] uppercase">
                            {selectedVehicle}
                          </span>
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
                          <h4 className="text-base font-black text-white font-display">{cfg.optionName}</h4>
                          <span className="text-xs text-amber-300 font-mono font-bold block mt-0.5">
                            {cfg.wheelCount ? `${cfg.wheelCount} Wheels • ` : ''}~{cfg.approximateTon} Tons
                          </span>
                        </div>

                        <div className="border-t border-slate-800 pt-2 text-xs text-slate-300 space-y-1">
                          {cfg.flatPrice ? (
                            <div>Flat Price: <strong className="text-white font-mono">{formatINR(cfg.flatPrice)}</strong></div>
                          ) : (
                            <div>Rate: <strong className="text-white font-mono">{formatINR(cfg.basePricePerTon || 800)}/Ton</strong></div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-1.5 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => openEditConfigModal(cfg)}
                          className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleConfig(cfg)}
                          className={`px-2 py-1.5 rounded-lg ${
                            active ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteConfig(cfg)}
                          className="px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {currentConfigs.length === 0 && (
                <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <Layers className="w-8 h-8 text-slate-500 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No capacities configured for {selectedVehicle}</h4>
                  <p className="text-xs text-slate-400">Click "Add {selectedVehicle} Capacity" to add specifications.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GRAIN SIZES & DYNAMIC PRICING (FOR DUMPER & TRACTOR) */}
          {activeTab === 'materials' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-white font-display">
                    {selectedVehicle === 'DUMPER'
                      ? 'Dumper Aggregate Grain Sizes & Ton Rates'
                      : 'Tractor Aggregate Grain Sizes & Trolley Rates'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedVehicle === 'DUMPER'
                      ? 'Configure price per ton for each grain size when ordering Aggregate via Dumper fleet.'
                      : 'Configure custom Single Patiya and Double Patiya rates for each grain size choice.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddGrainModal}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shrink-0 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add New Grain Specification
                </button>
              </div>

              {/* Grain Pricing Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {currentGrainList.map((grain, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-md"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-xs">
                          {grain.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {selectedVehicle}
                        </span>
                      </div>

                      {selectedVehicle === 'TRACTOR' ? (
                        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Single Patiya</span>
                            <span className="text-sm font-black text-emerald-400 font-mono">
                              {formatINR(grain.priceSinglePatiya || 2800)}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Double Patiya</span>
                            <span className="text-sm font-black text-emerald-400 font-mono">
                              {formatINR(grain.priceDoublePatiya || 5400)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Base Rate / Ton</span>
                          <span className="text-base font-black text-amber-400 font-mono">
                            {formatINR(grain.pricePerTon || 800)}/Ton
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => openEditGrainModal(grain)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Prices
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGrain(grain.name)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        title="Delete grain size"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {currentGrainList.length === 0 && (
                <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <Tag className="w-8 h-8 text-slate-500 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No grain sizes configured for {selectedVehicle}</h4>
                  <p className="text-xs text-slate-400">Click "Add New Grain Specification" to add grain sizes and prices.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD/EDIT LOCATION */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title={editingLocation ? `Edit ${selectedVehicle} Location` : `Add New ${selectedVehicle} Location`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveLocation} className="space-y-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            Target Vehicle Category: {selectedVehicle} (Isolated)
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Material Category *
            </label>
            <select
              value={locationForm.category}
              onChange={(e) => setLocationForm({ ...locationForm, category: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="Aggregate">Aggregate Quarry (e.g. Vadagam, Sayala)</option>
              <option value="Sand">Sand Riverbed (e.g. Patan, Sabarmati)</option>
              <option value="Grit">Grit Origin</option>
              <option value="ALL">All Categories</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Location Name *
            </label>
            <input
              type="text"
              required
              placeholder={selectedVehicle === 'DUMPER' ? 'e.g. Vadagam, Sayala, Patan' : 'e.g. Patan, Sabarmati'}
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

          {selectedVehicle === 'TRACTOR' ? (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div>
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1.5">
                  Single Patiya Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    required
                    placeholder="2350"
                    value={locationForm.singlePatiyaPrice}
                    onChange={(e) => setLocationForm({ ...locationForm, singlePatiyaPrice: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">
                  Double Patiya Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    required
                    placeholder="4500"
                    value={locationForm.doublePatiyaPrice}
                    onChange={(e) => setLocationForm({ ...locationForm, doublePatiyaPrice: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          ) : (
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
          )}

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Source Description
            </label>
            <textarea
              rows="3"
              placeholder="Crushing plant details, basalt rock grade, riverbed specifications..."
              value={locationForm.description}
              onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20"
            >
              {saving ? 'Saving...' : `Save ${selectedVehicle} Location`}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD/EDIT VEHICLE SPECIFICATION & CAPACITY */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={editingConfig ? `Edit ${selectedVehicle} Specification` : `Add New ${selectedVehicle} Specification`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            Target Vehicle Category: {selectedVehicle} (Isolated)
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              {selectedVehicle === 'DUMPER' ? 'Processing Type / Wheel Label *' : 'Tractor Trolley Type *'}
            </label>
            <input
              type="text"
              required
              placeholder={selectedVehicle === 'DUMPER' ? 'e.g. Filter Sand or Crushed Aggregate' : 'e.g. Single Patiya or Double Patiya'}
              value={configForm.optionName}
              onChange={(e) => setConfigForm({ ...configForm, optionName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {selectedVehicle === 'DUMPER' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Wheel Count (Wheels)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 10, 12, 16, 18"
                  value={configForm.wheelCount}
                  onChange={(e) => setConfigForm({ ...configForm, wheelCount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Approx Load (Tons) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="e.g. 35"
                  value={configForm.approximateTon}
                  onChange={(e) => setConfigForm({ ...configForm, approximateTon: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Approx Load Capacity (Tons) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 3.5 for Single, 7.0 for Double"
                value={configForm.approximateTon}
                onChange={(e) => setConfigForm({ ...configForm, approximateTon: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {selectedVehicle === 'DUMPER' ? (
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Base Price Per Ton (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 800"
                value={configForm.basePricePerTon}
                onChange={(e) => setConfigForm({ ...configForm, basePricePerTon: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Flat Price Per Vehicle Trip (₹) *
              </label>
              <input
                type="number"
                placeholder="e.g. 2350 for Single, 4500 for Double"
                value={configForm.flatPrice}
                onChange={(e) => setConfigForm({ ...configForm, flatPrice: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Display Order
            </label>
            <input
              type="number"
              value={configForm.displayOrder}
              onChange={(e) => setConfigForm({ ...configForm, displayOrder: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20"
            >
              {saving ? 'Saving...' : `Save ${selectedVehicle} Specification`}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: ADD/EDIT GRAIN SIZE & PRICING */}
      <Modal
        isOpen={isGrainModalOpen}
        onClose={() => setIsGrainModalOpen(false)}
        title={
          editingGrainItem
            ? `Edit ${selectedVehicle} Grain Pricing ("${editingGrainItem.name}")`
            : `Add New ${selectedVehicle} Grain Specification`
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveGrainForm} className="space-y-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            Target Vehicle Category: {selectedVehicle} (Isolated Grain Pricing)
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Grain Size / Material Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 20mm, 10mm, 6mm, (10 + 20 ) mm Mix, Wetmix"
              value={grainForm.name}
              onChange={(e) => setGrainForm({ ...grainForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {selectedVehicle === 'TRACTOR' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Single Patiya Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 2800"
                  value={grainForm.priceSinglePatiya}
                  onChange={(e) => setGrainForm({ ...grainForm, priceSinglePatiya: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Double Patiya Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5400"
                  value={grainForm.priceDoublePatiya}
                  onChange={(e) => setGrainForm({ ...grainForm, priceDoublePatiya: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Base Price Per Ton (₹) *
              </label>
              <input
                type="number"
                required
                placeholder="e.g. 800"
                value={grainForm.pricePerTon}
                onChange={(e) => setGrainForm({ ...grainForm, pricePerTon: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsGrainModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingGrain}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20"
            >
              {savingGrain ? 'Saving...' : `Save ${selectedVehicle} Grain Pricing`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
