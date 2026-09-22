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
  Calculator,
  Sparkles
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
    <div className="space-y-20 pb-20 select-none">
      {/* 1. Hero Section */}
      <section className="relative pt-8 sm:pt-14 pb-16 sm:pb-24 overflow-hidden">
        {/* Ambient radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-500/10 blur-[130px] rounded-full -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-brand-500/30 text-brand-400 text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-500/10">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
              Gujarat's Heavy Construction Supply Fleet
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight font-display leading-[1.1]">
              ANANTA <span className="text-brand-400">TRADERS</span>
            </h1>

            <p className="text-lg sm:text-2xl font-bold text-slate-200">
              "Sand, Aggregate & Grit Delivered Directly To Your Site."
            </p>

            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
              Verified riverbed sand leases, certified electronic weighbridge precision, and 100% genuine legal river royalty slips dispatched with live Google Maps tracking.
            </p>

            {/* Mobile Thumb-Friendly CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-400 hover:to-amber-400 text-slate-950 font-black text-sm sm:text-base transition-all shadow-xl shadow-brand-500/25 active:scale-95"
              >
                <span>Order Material Now</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </Link>
              <Link
                to="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-bold text-sm sm:text-base transition-all active:scale-95"
              >
                <Phone className="w-4 h-4 text-brand-400" />
                <span>Contact Dispatch</span>
              </Link>
            </div>

            {/* Android Feature Pills Row */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              {[
                { label: 'River Royalty', desc: '100% Verified Govt Slip', icon: FileCheck },
                { label: 'Weighbridge Accuracy', desc: 'Computerized Slips', icon: Scale },
                { label: 'Tractor Fleet', desc: 'Single & Double Patiya', icon: Truck },
                { label: 'OTP Safe Delivery', desc: 'Secure Handover', icon: ShieldCheck }
              ].map((h, i) => {
                const HIcon = h.icon;
                return (
                  <div key={i} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex items-center gap-3 shadow-md hover:border-slate-700 transition-all">
                    <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 shrink-0">
                      <HIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate">{h.label}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate">{h.desc}</div>
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
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-brand-400 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            Mineral Catalog
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white font-display">
            Direct Riverbed & Quarry Materials
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Supplied with live rate transparency, moisture controls, and standard grain classification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sand */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl hover:border-brand-500/50 transition-all duration-200">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-inner">
                <Truck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white font-display">River Sand (Send)</h4>
                <p className="text-xs text-brand-400 font-bold mt-0.5">Patan, Sabarmati, Vijapur, Siddhpur</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Washed natural river sand filtered for high fineness modulus. Silt-free for RCC concrete, brickwork, and plastering.
              </p>
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">Available Locations:</div>
                <div className="flex flex-wrap gap-1.5">
                  {SAND_LOCATIONS.map((loc) => (
                    <span key={loc.id} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                      {loc.id}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">From</span>
                <span className="text-xl font-black text-white font-mono">₹2,350 <span className="text-xs text-slate-400 font-normal">/ Tractor</span></span>
              </div>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-brand-500/20 active:scale-95"
              >
                Order Sand
              </Link>
            </div>
          </div>

          {/* Aggregate */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl hover:border-blue-500/50 transition-all duration-200">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <HardHat className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white font-display">Crushed Aggregate</h4>
                <p className="text-xs text-blue-400 font-bold mt-0.5">Black Trap Basalt Rock</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Machine-crushed, cubical aggregate engineered for maximum bonding strength in RCC concrete. Strict grading from 6mm to 63x100.
              </p>
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">Specifications:</div>
                <div className="flex flex-wrap gap-1.5">
                  {AGGREGATE_TYPES.slice(0, 6).map((ag) => (
                    <span key={ag.id} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                      {ag.id}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">From</span>
                <span className="text-xl font-black text-white font-mono">₹2,800 <span className="text-xs text-slate-400 font-normal">/ Tractor</span></span>
              </div>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-brand-500/20 active:scale-95"
              >
                Order Aggregate
              </Link>
            </div>
          </div>

          {/* Grit */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl hover:border-emerald-500/50 transition-all duration-200">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Building className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white font-display">Stone Grit & Refo Dust</h4>
                <p className="text-xs text-emerald-400 font-bold mt-0.5">Precast & Paver Grade</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Precision graded 2mm-4mm washed stone grit and refo stone dust for interlocking paver blocks and waterproofing screeds.
              </p>
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">Applications:</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">Paver Blocks</span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">Waterproofing</span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">Screed</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">From</span>
                <span className="text-xl font-black text-white font-mono">₹1,100 <span className="text-xs text-slate-400 font-normal">/ Tractor</span></span>
              </div>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-brand-500/20 active:scale-95"
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
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-10">
            <div className="max-w-md space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-black text-brand-400 uppercase tracking-wider">
                <Calculator className="w-4 h-4" />
                Live Tractor Price Estimator
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white font-display">
                Calculate Material Cost in Real Time
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                Choose your material, select tractor type and quantity, and see the verified transport price instantly.
              </p>

              <div className="pt-2 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dynamic live rates synchronized with central DB</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Admin-configured tractor prices</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Transparent Price Per Tractor × Quantity</span>
                </div>
              </div>
            </div>

            {/* Interactive Calculator Box */}
            <div className="w-full lg:w-1/2 bg-slate-950/80 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">Select Material</label>
                <select
                  value={calcMaterial}
                  onChange={(e) => setCalcMaterial(e.target.value)}
                  className="app-select w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500 font-medium"
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
                  className="app-select w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500 font-medium"
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
                  <span className="text-brand-400 font-mono font-black">{calcTractors}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={calcTractors}
                  onChange={(e) => setCalcTractors(Math.max(1, Number(e.target.value)))}
                  className="w-full accent-brand-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400 font-medium">
                  <span>Price Per Tractor:</span>
                  <span className="font-mono text-slate-200 font-bold">{formatINR(calcPricePerTractor)}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-medium">
                  <span>Number of Tractors:</span>
                  <span className="font-mono text-slate-200 font-bold">{calcTractors}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="font-bold text-white text-sm">Estimated Total:</span>
                  <span className="font-black text-brand-400 text-2xl font-mono">{formatINR(calculatedTotal)}</span>
                </div>
              </div>

              <Link
                to="/register"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-brand-500/25 active:scale-95"
              >
                <span>Proceed with Order</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Ready to Order Bottom Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="bg-gradient-to-r from-brand-500 via-amber-500 to-orange-500 rounded-3xl p-8 sm:p-12 text-slate-950 text-center space-y-6 shadow-2xl">
          <h3 className="text-3xl sm:text-4xl font-black font-display max-w-2xl mx-auto tracking-tight">
            Ready to Supply Your Construction Site?
          </h3>
          <p className="text-sm sm:text-base font-bold max-w-xl mx-auto text-slate-900">
            Join hundreds of trusted builders, developers, and regional contractors across Gujarat.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-sm transition-all shadow-xl active:scale-95"
            >
              Register Builder Account
            </Link>
            <a
              href="tel:+919876543210"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-black text-sm transition-all shadow-xl active:scale-95"
            >
              Hotline: +91 98765 43210
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
