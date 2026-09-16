import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../../services';
import { TRACTOR_TYPES, SAND_LOCATIONS, AGGREGATE_TYPES } from '../../utils/constants';
import { formatINR } from '../../utils/formatters';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Truck, ArrowRight, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-14 select-none">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-brand-500/30 text-brand-400 text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-500/10">
          <Sparkles className="w-3.5 h-3.5" />
          Certified Mineral Catalog
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white font-display tracking-tight">
          Products & Tractor Pricing
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
          Dynamic market prices sourced directly from verified riverbeds and basalt quarries with guaranteed grading accuracy.
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {products.map((product) => (
          <div
            key={product._id}
            className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-brand-500/40 transition-all duration-200 shadow-xl relative group"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-950 text-brand-400 border border-slate-800">
                  {product.category}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  Royalty Certified
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white font-display tracking-tight">{product.name}</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">{product.description}</p>
              </div>

              {/* Specific Breakdown */}
              {product.category === 'Sand' && (
                <div className="space-y-2.5 pt-3 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Available Riverbed Sourcing:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {SAND_LOCATIONS.map((loc) => (
                      <div key={loc.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <div className="font-bold text-slate-200">{loc.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{loc.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.category === 'Aggregate' && (
                <div className="space-y-2.5 pt-3 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Available Aggregate Grades:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {AGGREGATE_TYPES.map((ag) => (
                      <span
                        key={ag.id}
                        className="text-[11px] px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-semibold"
                      >
                        {ag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.category === 'Grit' && (
                <div className="space-y-2.5 pt-3 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Primary Construction Uses:
                  </span>
                  <ul className="text-xs text-slate-300 space-y-2 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
                      Interlocking paver tile manufacturing
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
                      Waterproof terrace screeds & precast leveling
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
                      High compressive durability with negligible silt
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Price & Action */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Single Patiya:</span>
                <span className="font-black text-brand-400 font-mono text-lg">
                  {formatINR(product.priceSinglePatiya)} <span className="text-xs font-normal text-slate-400">/ Tractor</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Double Patiya:</span>
                <span className="font-black text-brand-400 font-mono text-lg">
                  {formatINR(product.priceDoublePatiya)} <span className="text-xs font-normal text-slate-400">/ Tractor</span>
                </span>
              </div>

              <div className="pt-2">
                <Link
                  to="/register"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-400 hover:to-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-brand-500/25 active:scale-95"
                >
                  <span>Order Material</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tractor Transport & Delivery Guide */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 shadow-xl">
        <div>
          <h3 className="text-xl font-black text-white font-display">Tractor Transport & Delivery Guide</h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Material deliveries are scheduled per tractor based on your required capacity (Single Patiya or Double Patiya).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {TRACTOR_TYPES.map((t) => (
            <div
              key={t.id}
              className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-3 hover:border-slate-700 transition-all shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-300">🚜 Tractor</span>
                <span className="text-xs font-black text-brand-400">Standard Delivery</span>
              </div>
              <h4 className="text-xl font-black text-white font-display">{t.name}</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">{t.desc}</p>
              <div className="pt-3 border-t border-slate-800 text-xs text-slate-500 font-medium">
                Pricing is configured dynamically per material by ANANTA TRADERS.
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
