import React from 'react';
import { Truck, ShieldCheck, Scale, FileCheck, Users, Building2 } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-wider">
          About ANANTA TRADERS
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white font-display">
          Building Gujarat With Uncompromising Integrity
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          "Quality Materials. Reliable Delivery." — Our guiding principle from quarry extraction to site drop-off.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-5 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-2xl font-bold text-white font-display">
            The Preferred Construction Supply Partner
          </h3>
          <p>
            ANANTA TRADERS was established to solve the chronic unpredictability in heavy construction material supply: undocumented riverbed mining, inaccurate volumetric weight claims, and delayed delivery.
          </p>
          <p>
            By establishing strict relationships with authorized river sand leases (Patan, Sabarmati, Vijapur, Siddhpur) and certified basalt quarries, we ensure builders and infrastructure contractors receive authentic, mineral-tested aggregates with automated digital tracking.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-2xl font-extrabold text-brand-400 font-display">100%</div>
              <div className="text-xs text-slate-400 mt-1">Govt River Royalty Compliance</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-2xl font-extrabold text-emerald-400 font-display">50,000+</div>
              <div className="text-xs text-slate-400 mt-1">Tons Delivered Safely</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <Scale className="w-8 h-8 text-brand-400" />
            <h4 className="font-bold text-white">Weighbridge Precision</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every dispatched tipper is weighed on computerized scales. Both gross and tare slips are photographed and archived.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <FileCheck className="w-8 h-8 text-blue-400" />
            <h4 className="font-bold text-white">Authentic Royalty</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete peace of mind with legal transit permits preventing any road transport confiscations or site fines.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <Truck className="w-8 h-8 text-emerald-400" />
            <h4 className="font-bold text-white">Fleet Network</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              From 10-wheel 18-ton urban tippers to 42-ton mega-trailers, our dealer logistics network provides rapid dispatch.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <ShieldCheck className="w-8 h-8 text-purple-400" />
            <h4 className="font-bold text-white">OTP Handover</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cryptographically verified delivery OTP ensures materials are inspected by your engineer before completion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
