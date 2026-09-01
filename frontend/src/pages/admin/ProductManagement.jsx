import React, { useState, useEffect } from 'react';
import { productService } from '../../services';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { formatINR } from '../../utils/formatters';
import {
  PlusCircle,
  Edit3,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Power,
  Trash2,
  Layers,
  Plus,
  X,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit / Create Material State
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Sand',
    description: '',
    pricePerTon: '',
    priceSinglePatiya: '',
    priceDoublePatiya: '',
    aggregateTypes: ['20mm', '10mm', '6mm', 'Refo Dust', 'Metal 40×63', 'Rubble'],
    isActive: true
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGrainInput, setNewGrainInput] = useState('');
  const [editingGrainIndex, setEditingGrainIndex] = useState(null);
  const [editingGrainValue, setEditingGrainValue] = useState('');

  // Dedicated Grain Sizes Modal for quick management
  const [isGrainModalOpen, setIsGrainModalOpen] = useState(false);
  const [targetAggregateProduct, setTargetAggregateProduct] = useState(null);
  const [grainSizesList, setGrainSizesList] = useState([]);

  const [saving, setSaving] = useState(false);

  const loadProducts = async () => {
    try {
      const res = await productService.getAllAdmin();
      if (res.data?.products) {
        setProducts(res.data.products);
      }
    } catch (err) {
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      category: 'Sand',
      description: '',
      pricePerTon: '800',
      priceSinglePatiya: '2350',
      priceDoublePatiya: '4500',
      aggregateTypes: ['20mm', '10mm', '6mm', 'Refo Dust', 'Metal 40×63', 'Rubble'],
      isActive: true
    });
    setNewGrainInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      category: p.category,
      description: p.description || '',
      pricePerTon: p.pricePerTon || '800',
      priceSinglePatiya: p.priceSinglePatiya || '2350',
      priceDoublePatiya: p.priceDoublePatiya || '4500',
      aggregateTypes:
        p.aggregateTypes && p.aggregateTypes.length > 0
          ? [...p.aggregateTypes]
          : ['20mm', '10mm', '6mm', 'Refo Dust', 'Metal 40×63', 'Rubble'],
      isActive: p.isActive !== false
    });
    setNewGrainInput('');
    setIsModalOpen(true);
  };

  // Quick Dedicated Grain Modal
  const openQuickGrainModal = (p) => {
    setTargetAggregateProduct(p);
    setGrainSizesList(
      p.aggregateTypes && p.aggregateTypes.length > 0
        ? [...p.aggregateTypes]
        : ['20mm', '10mm', '6mm', 'Refo Dust', 'Metal 40×63', 'Rubble']
    );
    setNewGrainInput('');
    setEditingGrainIndex(null);
    setIsGrainModalOpen(true);
  };

  // Add grain size handler
  const handleAddGrain = () => {
    if (!newGrainInput || !newGrainInput.trim()) {
      toast.error('Please enter a grain size name (e.g. 40mm or Metal 25x40)');
      return;
    }
    const val = newGrainInput.trim();
    if (productForm.aggregateTypes.includes(val)) {
      toast.error(`"${val}" already exists in the list.`);
      return;
    }
    setProductForm((prev) => ({
      ...prev,
      aggregateTypes: [...prev.aggregateTypes, val]
    }));
    setNewGrainInput('');
    toast.success(`Added grain size "${val}".`);
  };

  // Remove grain size handler
  const handleRemoveGrain = (indexToRemove) => {
    setProductForm((prev) => ({
      ...prev,
      aggregateTypes: prev.aggregateTypes.filter((_, i) => i !== indexToRemove)
    }));
    toast.success('Grain size removed.');
  };

  // Quick Grain Modal - Add
  const handleQuickAddGrain = () => {
    if (!newGrainInput || !newGrainInput.trim()) {
      toast.error('Please enter a grain size name (e.g. 40mm or Metal 25x40)');
      return;
    }
    const val = newGrainInput.trim();
    if (grainSizesList.includes(val)) {
      toast.error(`"${val}" already exists.`);
      return;
    }
    setGrainSizesList((prev) => [...prev, val]);
    setNewGrainInput('');
  };

  // Quick Grain Modal - Remove
  const handleQuickRemoveGrain = (idx) => {
    setGrainSizesList((prev) => prev.filter((_, i) => i !== idx));
  };

  // Quick Grain Modal - Update existing
  const handleQuickUpdateGrain = (idx) => {
    if (!editingGrainValue || !editingGrainValue.trim()) return;
    const updated = [...grainSizesList];
    updated[idx] = editingGrainValue.trim();
    setGrainSizesList(updated);
    setEditingGrainIndex(null);
    setEditingGrainValue('');
    toast.success('Grain size updated.');
  };

  // Quick Grain Modal - Save changes to DB
  const handleSaveQuickGrains = async () => {
    if (!targetAggregateProduct) return;
    setSaving(true);
    try {
      await productService.update(targetAggregateProduct._id, {
        aggregateTypes: grainSizesList
      });
      toast.success('Aggregate grain sizes updated successfully!');
      setIsGrainModalOpen(false);
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save grain sizes');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name) {
      toast.error('Material name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...productForm,
        pricePerTon: Number(productForm.pricePerTon) || 800,
        priceSinglePatiya: Number(productForm.priceSinglePatiya) || 2350,
        priceDoublePatiya: Number(productForm.priceDoublePatiya) || 4500,
        aggregateTypes: productForm.aggregateTypes
      };

      if (editingProduct) {
        await productService.update(editingProduct._id, payload);
        toast.success(`Updated ${productForm.name}. Existing historical orders maintain their original snapshots.`);
      } else {
        await productService.create(payload);
        toast.success(`Created new material ${productForm.name}`);
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save material');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (p) => {
    try {
      await productService.update(p._id, { isActive: !p.isActive });
      toast.success(`${p.name} is now ${!p.isActive ? 'Active' : 'Disabled'}`);
      loadProducts();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading material catalog manager..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">Material Management</h1>
          <p className="text-xs text-slate-400">
            Configure construction materials, aggregate grain sizes, bulk tonnage rates, and tractor dispatch pricing.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 self-start"
        >
          <PlusCircle className="w-4 h-4" />
          Add New Material
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block">Immutable Historical Order Guarantee:</span>
          <span>
            When you edit, add grain sizes, or disable a material, changes only apply to future orders. All past customer orders retain their original material names, rates, and specifications.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((p) => {
          const active = p.isActive !== false;
          const isAggregate = p.category === 'Aggregate';
          const grains = p.aggregateTypes || [];

          return (
            <div
              key={p._id}
              className={`bg-slate-900 border rounded-3xl p-6 flex flex-col justify-between transition-all shadow-xl space-y-6 ${
                active ? 'border-slate-800 hover:border-slate-700' : 'border-red-900/40 opacity-70 bg-slate-950/80'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded bg-slate-800 text-amber-400 font-bold text-[10px] uppercase">
                    {p.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold flex items-center gap-1 ${
                      active ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {active ? 'Active In Catalog' : 'Disabled'}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white font-display">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{p.description || 'Standard construction grade'}</p>
                </div>

                {/* If Aggregate, show Grain Sizes */}
                {isAggregate && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Grain Sizes ({grains.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => openQuickGrainModal(p)}
                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline"
                      >
                        Manage Sizes
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {grains.slice(0, 6).map((g) => (
                        <span
                          key={g}
                          className="px-2 py-0.5 rounded-lg bg-slate-950 text-[10px] font-mono font-bold text-slate-300 border border-slate-800"
                        >
                          {g}
                        </span>
                      ))}
                      {grains.length > 6 && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-950 text-[10px] font-bold text-amber-400 border border-slate-800">
                          +{grains.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Dumper Rate:</span>
                  <span className="font-black text-amber-400 font-mono">{formatINR(p.pricePerTon || 800)} / Ton</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Single Patiya Tractor:</span>
                  <span className="font-black text-amber-400 font-mono">{formatINR(p.priceSinglePatiya || 2350)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Double Patiya Tractor:</span>
                  <span className="font-black text-amber-400 font-mono">{formatINR(p.priceDoublePatiya || 4500)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(p)}
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
            </div>
          );
        })}
      </div>

      {/* MODAL 1: ADD / EDIT MATERIAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit ${editingProduct.name}` : 'Add New Mineral / Material'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Material Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Premium River Sand (Send)"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Mineral Category *
            </label>
            <select
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="Sand">Sand</option>
              <option value="Aggregate">Aggregate</option>
              <option value="Grit">Grit</option>
            </select>
          </div>

          {/* DYNAMIC AGGREGATE GRAIN SIZES MANAGER */}
          {productForm.category === 'Aggregate' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Aggregate Grain Sizes ({productForm.aggregateTypes.length})
                </label>
                <span className="text-[10px] text-slate-400">Add, update, or remove sizes</span>
              </div>

              {/* Current Grain Chips with Remove button */}
              <div className="flex flex-wrap gap-2">
                {productForm.aggregateTypes.map((grain, idx) => (
                  <span
                    key={grain}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200"
                  >
                    <span>{grain}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGrain(idx)}
                      className="p-0.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      title={`Remove ${grain}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add New Grain Size Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="e.g. 40mm, Metal 25x40, Rubble"
                  value={newGrainInput}
                  onChange={(e) => setNewGrainInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGrain();
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddGrain}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Size
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                Dumper (₹/Ton)
              </label>
              <input
                type="number"
                min="0"
                value={productForm.pricePerTon}
                onChange={(e) => setProductForm({ ...productForm, pricePerTon: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                Single (₹)
              </label>
              <input
                type="number"
                min="0"
                value={productForm.priceSinglePatiya}
                onChange={(e) => setProductForm({ ...productForm, priceSinglePatiya: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                Double (₹)
              </label>
              <input
                type="number"
                min="0"
                value={productForm.priceDoublePatiya}
                onChange={(e) => setProductForm({ ...productForm, priceDoublePatiya: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Material Description
            </label>
            <textarea
              rows="3"
              placeholder="Sourcing specifications, grain size, quality standards..."
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
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
              {saving ? 'Saving...' : 'Save Material'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: DEDICATED QUICK GRAIN SIZE MANAGER MODAL */}
      <Modal
        isOpen={isGrainModalOpen}
        onClose={() => setIsGrainModalOpen(false)}
        title={`Manage Aggregate Grain Sizes — ${targetAggregateProduct?.name || 'Aggregate'}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Add, update, or remove aggregate grain sizes available for customer selection in Step 1.
          </p>

          {/* Add Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. 40mm, Metal 25x40, Rubble..."
              value={newGrainInput}
              onChange={(e) => setNewGrainInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickAddGrain();
                }
              }}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleQuickAddGrain}
              className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Size
            </button>
          </div>

          {/* List of current grain sizes with Edit / Delete actions */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {grainSizesList.map((grain, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
              >
                {editingGrainIndex === idx ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editingGrainValue}
                      onChange={(e) => setEditingGrainValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickUpdateGrain(idx);
                        }
                      }}
                      className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500 text-xs text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleQuickUpdateGrain(idx)}
                      className="px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[10px]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingGrainIndex(null)}
                      className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-white font-mono">{grain}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGrainIndex(idx);
                          setEditingGrainValue(grain);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                        title="Edit Size Name"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickRemoveGrain(idx)}
                        className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete Size"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {grainSizesList.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                No grain sizes configured. Add one above.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsGrainModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveQuickGrains}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20"
            >
              {saving ? 'Saving...' : 'Save All Sizes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
