import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Clock,
  Users,
  Building2,
  Boxes,
  FileSpreadsheet,
  Truck,
  FileBarChart,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Coins
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Command Center', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: "Today's Orders", path: '/admin/todays-orders', icon: Clock, highlight: true },
    { name: 'All Orders Master', path: '/admin/orders', icon: FileSpreadsheet },
    { name: 'Dealer Network', path: '/admin/dealers', icon: Building2 },
    { name: 'Customer Directory', path: '/admin/users', icon: Users },
    { name: 'Materials & Pricing', path: '/admin/products', icon: Coins },
    { name: 'Sourcing Locations', path: '/admin/locations', icon: Boxes },
    { name: 'Vehicle & Fleet Config', path: '/admin/vehicles', icon: Truck },
    { name: 'Delivery Radar & OTP', path: '/admin/deliveries', icon: ShieldAlert },
    { name: 'Reports & Analytics', path: '/admin/reports', icon: FileBarChart },
    { name: 'Profile & Security', path: '/admin/profile', icon: ShieldCheck }
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* Mobile Top Navbar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="font-bold text-base font-display text-white">ADMIN <span className="text-brand-400">HQ</span></span>
        </Link>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar for Desktop & Mobile */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800/80 hidden md:flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold text-white font-display leading-none block">
                ANANTA <span className="text-brand-400">ADMIN</span>
              </span>
              <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block mt-1">
                Executive Control Hub
              </span>
            </div>
          </div>

          {/* Admin profile card */}
          <Link
            to="/admin/profile"
            onClick={() => setSidebarOpen(false)}
            className="block p-4 mx-3 my-4 bg-slate-950/60 hover:bg-slate-950 hover:border-amber-500/40 rounded-xl border border-slate-800 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 truncate">
                {user?.name || 'Super Admin'}
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                Profile
              </span>
            </div>
            <div className="text-[11px] text-amber-400/80 font-medium capitalize mt-0.5 font-mono">
              {user?.mobile || '9876543210'}
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                      : item.highlight
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            to="/"
            className="block text-center text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-800/60"
          >
            Public Site
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 border border-rose-900/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Admin Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
