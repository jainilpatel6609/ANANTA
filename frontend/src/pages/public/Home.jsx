import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../../services';
import { TRACTOR_TYPES, SAND_LOCATIONS, AGGREGATE_TYPES } from '../../utils/constants';
import { formatINR, getTractorPrice } from '../../utils/formatters';
import {
  Truck,
  ShieldCheck,
  MapPin,
  Clock,
  Coins,
  ArrowRight,
  CheckCircle2,
  Phone,
  MessageSquare,
  Scale,
  FileCheck,
  Building,
  HardHat,
  Calculator
} from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [calcMaterial, setCalcMaterial] = useState('');
  const [calcTractorType, setCalcTractorType] = useState('Single Patiya');
  const [calcTractors, setCalcTractors] = useState(1);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await productService.getActiveProducts();
        if (res.data?.products) {
          setProducts(res.data.products);
          if (res.data.products.length > 0) {
            setCalcMaterial(res.data.products[0]._id);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch home products:', err.message);
      }
    };
    loadProducts();
  }, []);

  const selectedProduct = products.find((p) => p._id === calcMaterial) || products[0];
  const calcPricePerTractor = getTractorPrice(selectedProduct, calcTractorType);
  const calculatedTotal = Math.round(calcPricePerTractor * Math.max(1, calcTractors));

  return (
    <div className="space-y-24 pb-20">
      {/* 1. Hero Section */}
      <section className="relative pt-12 pb-24 overflow-hidden">
        {/* Background Gradients & Industrial Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 -z-10" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-500/10 blur-[120px] rounded-full -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-wider shadow-sm">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
              Gujarat's Certified Heavy Material Supply Network
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight font-display leading-[1.1]">
              ANANTA <span className="text-brand-400">TRADERS</span>
            </h1>

            <p className="text-xl sm:text-2xl font-bold text-slate-200">
              "Sand, Aggregate & Grit Delivered Where You Need It."
            </p>

            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Direct riverbed sand sourcing, certified weighbridge weight precision, and 100% legal river royalty documentation dispatched directly to your construction sites across Gujarat.
            </p>

            {/* CTA Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-black text-base transition-all shadow-xl shadow-brand-500/25 hover:scale-105"
              >
                Order Material Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-base transition-all"
              >
                <Phone className="w-4 h-4 text-brand-400" />
                Contact Dispatch Office
              </Link>
            </div>

            {/* Highlights pill row */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              {[
                { label: 'River Royalty', desc: '100% Verified Govt Slip', icon: FileCheck },
                { label: 'Weighbridge Accuracy', desc: 'Computerized Slips', icon: Scale },
                { label: 'Tractor Fleet', desc: 'Single & Double Patiya', icon: Truck },
                { label: 'OTP Safe Delivery', desc: 'Secure Handover', icon: ShieldCheck }
              ].map((h, i) => {
                const HIcon = h.icon;
                return (
                  <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                    <HIcon className="w-5 h-5 text-brand-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-200">{h.label}</div>
                      <div className="text-[10px] text-slate-400">{h.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Core Material Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-2">Our Mineral Categories</h2>
          <h3 className="text-3xl font-extrabold text-white font-display">Premium Materials Directly From Source</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Supplied with live rate transparency, moisture controls, and standard grain classification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sand */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-brand-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white font-display">River Sand (Send)</h4>
                <p className="text-xs text-brand-400 font-semibold mt-0.5">Sourced from Patan, Sabarmati, Vijapur, Siddhpur</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Washed natural river sand filtered for high fineness modulus. Free of silt and organic particles, ideal for high-strength RCC slabs, brick masonry, and fine plastering.
              </p>
              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-300 mb-2">Available Sourcing Locations:</div>
                <div className="flex flex-wrap gap-1.5">
                  {SAND_LOCATIONS.map((loc) => (
                    <span key={loc.id} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {loc.id}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Standard Rate</span>
                <span className="text-lg font-bold text-white">₹2,350 <span className="text-xs text-slate-400 font-normal">/ Tractor</span></span>
              </div>
              <Link
                to="/register"
                className="px-3.5 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold transition-colors"
              >
                Order Sand
              </Link>
            </div>
          </div>

          {/* Aggregate */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-brand-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <HardHat className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white font-display">Crushed Aggregate</h4>
                <p className="text-xs text-blue-400 font-semibold mt-0.5">Black Trap Hard Basalt Rock</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Machine-crushed, cubical aggregate engineered for maximum bonding strength in RCC concrete. Strict grading from 6mm chips to 63x100 road ballast.
              </p>
              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-300 mb-2">Available Specifications:</div>
                <div className="flex flex-wrap gap-1.5">
                  {AGGREGATE_TYPES.slice(0, 6).map((ag) => (
                    <span key={ag.id} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {ag.id}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Standard Rate</span>
                <span className="text-lg font-bold text-white">₹2,800 <span className="text-xs text-slate-400 font-normal">/ Tractor</span></span>
              </div>
              <Link
                to="/register"
                className="px-3.5 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold transition-colors"
              >
                Order Aggregate
              </Link>
            </div>
          </div>

          {/* Grit */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-brand-500/50 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white font-display">Stone Grit & Refo Dust</h4>
                <p className="text-xs text-emerald-400 font-semibold mt-0.5">High Performance Precast & Paver Grade</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Precision graded 2mm-4mm washed stone grit and refo stone dust. Essential for precast blocks, interlocking paving tiles, and waterproofing applications.
              </p>
              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-300 mb-2">Key Applications:</div>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-300">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">Paver Blocks</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">Waterproofing</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">Precast Screeds</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Standard Rate</span>
                <span className="text-lg font-bold text-white">₹1,100 <span className="text-xs text-slate-400 font-normal">/ Tractor</span></span>
              </div>
              <Link
                to="/register"
                className="px-3.5 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold transition-colors"
              >
                Order Grit
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Material & Vehicle Calculator */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="max-w-md space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-brand-400 uppercase tracking-wider">
                <Calculator className="w-4 h-4" />
                Live Tractor Price Estimator
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                Calculate Material Cost in Real Time
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Choose your material, select tractor type and quantity, and see the total transport price instantly.
              </p>

              <div className="pt-2 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dynamic prices synchronized with MongoDB</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Admin-configured tractor prices</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Price Per Tractor × Number of Tractors</span>
                </div>
              </div>
            </div>

            {/* Interactive Calculator Box */}
            <div className="w-full lg:w-1/2 bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">Select Material</label>
                <select
                  value={calcMaterial}
                  onChange={(e) => setCalcMaterial(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} — from {formatINR(p.priceSinglePatiya)} / Tractor
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">Select Tractor Type</label>
                <select
                  value={calcTractorType}
                  onChange={(e) => setCalcTractorType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  {TRACTOR_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 uppercase mb-2">
                  <span>Number of Tractors</span>
                  <span className="text-brand-400 font-mono">{calcTractors}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={calcTractors}
                  onChange={(e) => setCalcTractors(Math.max(1, Number(e.target.value)))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Price Per Tractor:</span>
                  <span className="font-mono text-slate-200">{formatINR(calcPricePerTractor)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Number of Tractors:</span>
                  <span className="font-mono text-slate-200">{calcTractors}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="font-bold text-white text-sm">Estimated Total:</span>
                  <span className="font-extrabold text-brand-400 text-xl font-mono">{formatINR(calculatedTotal)}</span>
                </div>
              </div>

              <Link
                to="/register"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-sm transition-all"
              >
                Proceed with Order
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Fleet Strength Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-2">Transport Options</h2>
          <h3 className="text-3xl font-extrabold text-white font-display">Tractor Dispatch — Single & Double Patiya</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Orders are priced per tractor. Admin-configured rates apply to Sand, Aggregate, and Grit.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {TRACTOR_TYPES.map((t) => (
            <div
              key={t.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-brand-400 mb-3">
                  <Truck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-white">🚜 Tractor</h4>
                <div className="text-xl font-extrabold text-brand-400 font-display mt-1">
                  {t.name}
                </div>
                <p className="text-xs text-slate-400 mt-2">{t.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                Price: <span className="text-slate-200 font-semibold">Admin configured / Tractor</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Benefits / Why Choose Us */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white">100% Legal River Royalty</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Never worry about regulatory checkpoints. Every delivery includes an authentic Department of Mines & Geology River Royalty certificate uploaded directly to your portal.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white">Weighbridge Transparency</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every dispatched truck passes certified electronic waybridges at loading point. Dealers upload verified gross and tare weighbridge slips before departure.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white">Delivery OTP Verification</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your site supervisor verifies material quality and quantity before sharing the secure 6-digit Delivery OTP with the driver to finalize delivery.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Ready to Order CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="bg-gradient-to-r from-brand-600 via-amber-500 to-orange-500 rounded-3xl p-8 sm:p-12 text-slate-950 text-center space-y-6 shadow-2xl">
          <h3 className="text-3xl sm:text-4xl font-black font-display max-w-2xl mx-auto">
            Ready to Supply Your Next Construction Milestone?
          </h3>
          <p className="text-sm sm:text-base font-semibold max-w-xl mx-auto text-slate-900">
            Join hundreds of leading builders, infrastructure contractors, and traders across Gujarat using ANANTA TRADERS.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/register"
              className="px-8 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-sm transition-all shadow-xl"
            >
              Register Builder Account
            </Link>
            <a
              href="tel:+919876543210"
              className="px-8 py-3.5 rounded-xl bg-white/90 hover:bg-white text-slate-950 font-extrabold text-sm transition-all shadow-xl"
            >
              Call Hotline: +91 98765 43210
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
