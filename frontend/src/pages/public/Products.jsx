import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../../services';
import { TRACTOR_TYPES, SAND_LOCATIONS, AGGREGATE_TYPES } from '../../utils/constants';
import { formatINR } from '../../utils/formatters';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Truck, ArrowRight, ShieldCheck, CheckCircle2, Layers, MapPin } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await productService.getActiveProducts();
        if (res.data?.products) {
          setProducts(res.data.products);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Fetching real-time product prices..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-wider">
          Certified Mineral Catalog
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white font-display">
          Products & Tractor Pricing
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Dynamic market prices sourced directly from verified riverbeds and basalt quarries with guaranteed grading accuracy.
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {products.map((product) => (
          <div
            key={product._id}
            className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-brand-500/50 transition-all shadow-xl relative group"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-brand-400 border border-slate-700">
                  {product.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Royalty Certified
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white font-display">{product.name}</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{product.description}</p>
              </div>

              {/* Specific breakdown */}
              {product.category === 'Sand' && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Available Riverbed Sourcing:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {SAND_LOCATIONS.map((loc) => (
                      <div key={loc.id} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                        <div className="font-semibold text-slate-200">{loc.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{loc.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.category === 'Aggregate' && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Available Aggregate Grades:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {AGGREGATE_TYPES.map((ag) => (
                      <span
                        key={ag.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium"
                      >
                        {ag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.category === 'Grit' && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Primary Construction Uses:
                  </span>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
                      Interlocking paver tile manufacturing
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
                      Waterproof terrace screeds & precast leveling
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
                      High compressive durability with negligible silt
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Price & Action */}
            <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Single Patiya:</span>
                <span className="font-black text-brand-400 font-mono text-base">
                  {formatINR(product.priceSinglePatiya)} <span className="text-xs font-normal text-slate-400">/ Tractor</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Double Patiya:</span>
                <span className="font-black text-brand-400 font-mono text-base">
                  {formatINR(product.priceDoublePatiya)} <span className="text-xs font-normal text-slate-400">/ Tractor</span>
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  to="/register"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-sm transition-all shadow-md shadow-brand-500/20"
                >
                  Order Material
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tractor Dispatch & Transport Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6">
        <div>
          <h3 className="text-xl font-bold text-white font-display">Tractor Transport & Delivery Guide</h3>
          <p className="text-xs text-slate-400 mt-1">
            Material deliveries are scheduled per tractor based on your required capacity (Single Patiya or Double Patiya).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {TRACTOR_TYPES.map((t) => (
            <div
              key={t.id}
              className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">🚜 Tractor</span>
                <span className="text-xs font-bold text-brand-400">Standard Delivery</span>
              </div>
              <h4 className="text-xl font-bold text-white font-display">{t.name}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{t.desc}</p>
              <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
                Pricing is configured dynamically per material by ANANTA TRADERS.
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
