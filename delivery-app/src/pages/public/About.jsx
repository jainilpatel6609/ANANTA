import React from 'react';
import { Truck, ShieldCheck, Scale, FileCheck, Users, Building2, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-16 select-none">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-brand-500/30 text-brand-400 text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-500/10">
          <Sparkles className="w-3.5 h-3.5" />
          About ANANTA TRADERS
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white font-display tracking-tight">
          Building Gujarat With Uncompromising Integrity
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-medium">
          "Quality Materials. Reliable Delivery." — Our guiding principle from quarry extraction to site drop-off.
        </p>
      </div>

      {/* Main Grid Story */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-medium">
          <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            The Preferred Heavy Construction Supply Partner
          </h2>
          <p>
            ANANTA TRADERS was established to solve chronic unpredictability in heavy construction material logistics: undocumented riverbed mining, inaccurate volumetric weight claims, and delayed deliveries.
          </p>
          <p>
            By establishing strict ties with authorized river sand leases (Patan, Sabarmati, Vijapur, Siddhpur) and certified basalt quarries, we ensure builders and infrastructure contractors receive authentic, mineral-tested aggregates with automated digital tracking.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-md">
              <div className="text-3xl font-black text-brand-400 font-display">100%</div>
              <div className="text-xs text-slate-400 font-bold mt-1">Govt River Royalty Compliance</div>
            </div>
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-md">
              <div className="text-3xl font-black text-emerald-400 font-display">50,000+</div>
              <div className="text-xs text-slate-400 font-bold mt-1">Tons Delivered Safely</div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-slate-800 space-y-3 shadow-lg hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center shadow-inner">
              <Scale className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="font-black text-white text-base font-display">Weighbridge Precision</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Every dispatched vehicle is weighed on computerized scales. Both gross and tare slips are photographed and archived.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-slate-800 space-y-3 shadow-lg hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-inner">
              <FileCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="font-black text-white text-base font-display">Authentic Royalty</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Complete peace of mind with legal transit permits preventing any road transport confiscations or site penalties.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-slate-800 space-y-3 shadow-lg hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
              <Truck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="font-black text-white text-base font-display">Fleet Network</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              From 10-wheel urban tippers to 42-ton mega-trailers and tractors, our dealer logistics network provides rapid dispatch.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-slate-800 space-y-3 shadow-lg hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="font-black text-white text-base font-display">OTP Handover</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Cryptographically verified delivery OTP ensures materials are inspected by your engineer before completion.
            </p>
          </div>
        </div>
      </div>

      {/* Action CTA Banner */}
      <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-2xl font-black text-white font-display">Ready To Secure Your Site Supply?</h2>
          <p className="text-xs sm:text-sm text-slate-400">Order directly online or speak to our central dispatch office today.</p>
        </div>
        <Link
          to="/register"
          className="px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-lg shadow-slate-900/25 active:scale-95 shrink-0"
        >
          <span>Get Started</span>
        </Link>
      </div>
    </div>
  );
}
