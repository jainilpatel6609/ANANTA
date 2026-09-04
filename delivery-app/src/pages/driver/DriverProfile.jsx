import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Truck, Phone, User, ShieldCheck, CheckCircle2, LogOut } from 'lucide-react';

export default function DriverProfile() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black text-3xl mx-auto mb-4 shadow-lg shadow-emerald-500/20">
          {user?.name?.charAt(0).toUpperCase() || 'D'}
        </div>
        <h1 className="text-2xl font-black text-white font-display">{user?.name}</h1>
        <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Verified Fleet Driver
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Driver Information</h2>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" /> Mobile Number
            </span>
            <span className="font-mono font-bold text-white">+91 {user?.mobile}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" /> Vehicle Number
            </span>
            <span className="font-mono font-bold text-white">{user?.vehicleNumber || 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-400" /> Vehicle Type
            </span>
            <span className="font-semibold text-white">{user?.vehicleType || 'Tractor'}</span>
          </div>

          {user?.dealer && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Associated Dealer</span>
              <span className="font-semibold text-amber-400">
                {user.dealer.companyName || user.dealer.name}
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out from Driver Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}

